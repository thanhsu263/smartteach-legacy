-- Giai đoạn 2.5, phase 2: tự động qua câu.
--
-- Giáo viên bật "Tự động" khi bắt đầu phiên: hết giờ câu thì hiện đáp án `reveal_seconds` giây rồi tự mở câu kế (hoặc
-- kết thúc sau câu cuối). Giờ chốt do MÁY CHỦ quyết (cột reveal_ends_at); màn hình giáo viên chỉ nhắc gọi
-- host_advance_if_due, giống cách host_close_if_expired xử lý hết giờ câu.
--
-- Migration mới (các migration 20261021-20261023 đã áp lên dự án thật nên không sửa). Các hàm bên dưới được `create or
-- replace` từ định nghĩa mới nhất: host_close_question, host_close_if_expired, host_next, host_state, player_state,
-- private.open_next từ 20261022090000_live_sessions.sql; create_session từ 20261023090000_results_retention.sql.

alter table public.live_sessions
  add column auto_advance boolean not null default false,
  add column reveal_seconds integer not null default 8,
  -- Tạm dừng chỉ có nghĩa khi auto_advance bật: giữ nguyên màn hình hiện đáp án cho tới khi giáo viên tiếp tục.
  add column paused boolean not null default false,
  -- Giờ máy chủ sẽ tự mở câu kế; null khi không ở pha hiện đáp án, tắt tự động hoặc đang tạm dừng.
  add column reveal_ends_at timestamptz,
  add constraint live_sessions_reveal_seconds check (reveal_seconds in (5, 8, 12));

grant select (auto_advance, reveal_seconds, paused, reveal_ends_at) on public.live_sessions to authenticated;

-- ---------------------------------------------------------------------------------------------
-- create_session: thêm tuỳ chọn. Đổi chữ ký nên phải xoá bản cũ (PostgREST không chọn được giữa hai bản trùng tên).
-- ---------------------------------------------------------------------------------------------

drop function public.create_session(uuid, boolean);

create function public.create_session(p_quiz_id uuid, p_speed_bonus boolean default true, p_options jsonb default '{}'::jsonb)
returns table (session_id uuid, pin text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner uuid := (select auth.uid());
  v_title text;
  v_snapshot jsonb;
  v_id uuid;
  v_pin text;
  v_constraint text;
  v_try integer;
  v_options jsonb := coalesce(p_options, '{}'::jsonb);
  v_auto boolean := false;
  v_reveal integer := 8;
begin
  if v_owner is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  -- Tuỳ chọn của phiên: khoá lạ bỏ qua; sai kiểu hoặc ngoài tập cho phép thì từ chối (không lặng lẽ đổi giá trị).
  if jsonb_typeof(v_options) <> 'object' then
    raise exception 'invalid_options' using errcode = 'PT400';
  end if;
  if v_options ? 'auto_advance' then
    if jsonb_typeof(v_options -> 'auto_advance') <> 'boolean' then
      raise exception 'invalid_options' using errcode = 'PT400';
    end if;
    v_auto := (v_options ->> 'auto_advance')::boolean;
  end if;
  if v_options ? 'reveal_seconds' then
    if jsonb_typeof(v_options -> 'reveal_seconds') <> 'number' or (v_options ->> 'reveal_seconds') !~ '^(5|8|12)$' then
      raise exception 'invalid_options' using errcode = 'PT400';
    end if;
    v_reveal := (v_options ->> 'reveal_seconds')::integer;
  end if;

  perform pg_advisory_xact_lock(hashtextextended('live-owner:' || v_owner::text, 0));

  -- Xoá cơ hội dữ liệu quá hạn lưu trữ (90 ngày): của chính giáo viên này, và một mẻ nhỏ của người khác để dữ liệu của
  -- giáo viên ít dùng không ở lại mãi khi pg_cron không khả dụng.
  perform private.purge_old_sessions(90, v_owner);
  perform private.purge_old_sessions(90, null, 50);

  -- Dọn các phiên quá hạn để trả PIN và chỗ "một phiên mỗi giáo viên".
  update public.live_sessions set status = 'ended', ended_at = coalesce(ended_at, clock_timestamp())
  where status <> 'ended' and expires_at <= clock_timestamp();

  select z.title into v_title from public.quizzes z where z.id = p_quiz_id and z.owner_id = v_owner;
  if not found then
    raise exception 'quiz_not_found' using errcode = 'PT404';
  end if;

  if exists (select 1 from public.quiz_problems(p_quiz_id)) then
    raise exception 'quiz_not_playable' using errcode = 'PT409';
  end if;

  if exists (select 1 from public.live_sessions where owner_id = v_owner and status <> 'ended') then
    raise exception 'session_already_active' using errcode = 'PT409';
  end if;

  select jsonb_build_object(
    'title', v_title,
    'questions', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'kind', q.kind,
          'prompt', q.prompt,
          'time_limit_seconds', q.time_limit_seconds,
          'accepted_answers', to_jsonb(q.accepted_answers),
          'ignore_diacritics', q.ignore_diacritics,
          'options', coalesce((
            select jsonb_agg(jsonb_build_object('label', o.label, 'is_correct', o.is_correct) order by o.position, o.id)
            from public.options o where o.question_id = q.id
          ), '[]'::jsonb)
        )
        order by q.position, q.created_at
      )
      from public.questions q where q.quiz_id = p_quiz_id
    ), '[]'::jsonb)
  ) into v_snapshot;

  for v_try in 1 .. 20 loop
    v_pin := lpad(((('x' || encode(extensions.gen_random_bytes(4), 'hex'))::bit(32)::bigint) % 1000000)::text, 6, '0');
    begin
      insert into public.live_sessions (owner_id, quiz_id, quiz_title, quiz_snapshot, pin, speed_bonus, auto_advance, reveal_seconds)
      values (v_owner, p_quiz_id, v_title, v_snapshot, v_pin, coalesce(p_speed_bonus, true), v_auto, v_reveal)
      returning id into v_id;
      exit;
    exception when unique_violation then
      get stacked diagnostics v_constraint = constraint_name;
      if v_constraint = 'live_sessions_active_owner_key' then
        raise exception 'session_already_active' using errcode = 'PT409';
      end if;
      v_id := null;
    end;
  end loop;

  if v_id is null then
    raise exception 'pin_unavailable' using errcode = 'PT409';
  end if;
  return query select v_id, v_pin;
end;
$$;

-- ---------------------------------------------------------------------------------------------
-- Chuyển pha
-- ---------------------------------------------------------------------------------------------

-- Từ pha hiện đáp án: mở câu kế, hoặc kết thúc nếu hết câu. Dùng chung cho host_next (bấm tay) và
-- host_advance_if_due (tự động) để hai đường không lệch nhau.
create function private.advance_from_reveal(p_session public.live_sessions)
returns void
language plpgsql
set search_path = ''
as $$
begin
  if p_session.current_position + 1 < jsonb_array_length(p_session.quiz_snapshot -> 'questions') then
    perform private.open_next(p_session);
  else
    update public.live_sessions
    set status = 'ended', ended_at = clock_timestamp(), reveal_ends_at = null, seq = seq + 1
    where id = p_session.id;
  end if;
end;
$$;

create or replace function private.open_next(p_session public.live_sessions)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_next integer := p_session.current_position + 1;
  v_question jsonb := p_session.quiz_snapshot -> 'questions' -> v_next;
  v_now timestamptz := clock_timestamp();
begin
  update public.live_sessions
  set status = 'question',
      current_position = v_next,
      question_opened_at = v_now,
      question_closes_at = v_now + make_interval(secs => (v_question ->> 'time_limit_seconds')::integer),
      reveal_ends_at = null,
      seq = seq + 1
  where id = p_session.id;
end;
$$;

create or replace function public.host_close_question(p_session uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_session public.live_sessions := private.host_session(p_session);
begin
  if v_session.status <> 'question' then
    raise exception 'invalid_transition' using errcode = 'PT409';
  end if;
  perform private.score_question(v_session);
  update public.live_sessions
  set status = 'reveal',
      question_closes_at = least(question_closes_at, clock_timestamp()),
      reveal_ends_at = case
        when v_session.auto_advance and not v_session.paused
        then clock_timestamp() + make_interval(secs => v_session.reveal_seconds)
      end,
      seq = seq + 1
  where id = v_session.id;
end;
$$;

create or replace function public.host_close_if_expired(p_session uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_session public.live_sessions := private.host_session(p_session);
begin
  if v_session.status <> 'question' or clock_timestamp() < v_session.question_closes_at then
    return false;
  end if;
  perform private.score_question(v_session);
  update public.live_sessions
  set status = 'reveal',
      reveal_ends_at = case
        when v_session.auto_advance and not v_session.paused
        then clock_timestamp() + make_interval(secs => v_session.reveal_seconds)
      end,
      seq = seq + 1
  where id = v_session.id;
  return true;
end;
$$;

create or replace function public.host_next(p_session uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_session public.live_sessions := private.host_session(p_session);
begin
  if v_session.status <> 'reveal' then
    raise exception 'invalid_transition' using errcode = 'PT409';
  end if;
  perform private.advance_from_reveal(v_session);
end;
$$;

-- Tự mở câu kế khi tới giờ: CHỈ hành động nếu giờ MÁY CHỦ đã qua reveal_ends_at. Trả true nếu vừa chuyển; false nếu chưa
-- tới hạn, đã chuyển rồi, tắt tự động hoặc đang tạm dừng (gọi trùng an toàn vì private.host_session khoá hàng phiên).
create function public.host_advance_if_due(p_session uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_session public.live_sessions := private.host_session(p_session);
begin
  if v_session.status <> 'reveal'
     or not v_session.auto_advance
     or v_session.paused
     or v_session.reveal_ends_at is null
     or clock_timestamp() < v_session.reveal_ends_at then
    return false;
  end if;
  perform private.advance_from_reveal(v_session);
  return true;
end;
$$;

-- Tạm dừng / tiếp tục tự động qua câu. Tiếp tục khi đang hiện đáp án thì cho thêm 3 giây rồi mới sang câu kế.
create function public.host_set_paused(p_session uuid, p_paused boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_session public.live_sessions := private.host_session(p_session);
begin
  if p_paused is null or not v_session.auto_advance then
    raise exception 'invalid_transition' using errcode = 'PT409';
  end if;
  if p_paused = v_session.paused then
    return;
  end if;
  update public.live_sessions
  set paused = p_paused,
      reveal_ends_at = case
        when p_paused or status <> 'reveal' then null
        else clock_timestamp() + interval '3 seconds'
      end,
      seq = seq + 1
  where id = v_session.id;
end;
$$;

-- ---------------------------------------------------------------------------------------------
-- Trạng thái trả về (thêm trường tự động qua câu)
-- ---------------------------------------------------------------------------------------------

create or replace function public.host_state(p_session uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_session public.live_sessions;
  v_status text;
  v_total integer;
  v_position integer;
  v_question jsonb;
  v_players jsonb;
  v_answered integer := 0;
  v_result jsonb;
begin
  if (select auth.uid()) is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  select * into v_session from public.live_sessions where id = p_session and owner_id = (select auth.uid());
  if not found then
    raise exception 'session_not_found' using errcode = 'PT404';
  end if;

  v_status := private.effective_status(v_session);
  v_total := jsonb_array_length(v_session.quiz_snapshot -> 'questions');
  v_position := v_session.current_position;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', p.id,
      'nickname', p.nickname,
      'score', p.score,
      'removed', p.removed,
      'left', p.left_at is not null,
      'answered', v_position >= 0 and exists (
        select 1 from public.answers a where a.participant_id = p.id and a.position = v_position
      )
    ) order by p.joined_at, p.id
  ), '[]'::jsonb)
  into v_players
  from public.participants p where p.session_id = v_session.id;

  if v_position >= 0 then
    select count(*) into v_answered
    from public.answers a join public.participants p on p.id = a.participant_id
    where a.session_id = v_session.id and a.position = v_position and not p.removed;
  end if;

  v_result := jsonb_build_object(
    'id', v_session.id,
    'pin', v_session.pin,
    'status', v_status,
    'locked', v_session.locked,
    'speed_bonus', v_session.speed_bonus,
    'seq', v_session.seq,
    'server_now', clock_timestamp(),
    'expires_at', v_session.expires_at,
    'quiz_title', v_session.quiz_title,
    'question_total', v_total,
    'question_index', case when v_position >= 0 then v_position + 1 else 0 end,
    'opened_at', v_session.question_opened_at,
    'closes_at', v_session.question_closes_at,
    'players', v_players,
    'answered_count', v_answered,
    'auto_advance', v_session.auto_advance,
    'reveal_seconds', v_session.reveal_seconds,
    'paused', v_session.paused,
    'reveal_ends_at', v_session.reveal_ends_at
  );

  if v_status in ('question', 'reveal') and v_position >= 0 then
    v_question := v_session.quiz_snapshot -> 'questions' -> v_position;
    v_result := v_result || jsonb_build_object('question', private.question_public(v_question));
    if v_status = 'reveal' then
      v_result := v_result || jsonb_build_object(
        'key', private.question_key(v_question),
        'distribution', private.distribution(v_session.id, v_position, v_question)
      );
    end if;
  end if;

  if v_status in ('reveal', 'ended') then
    v_result := v_result || jsonb_build_object('leaderboard', private.leaderboard(v_session.id, 5));
  end if;
  return v_result;
end;
$$;

create or replace function public.player_state(p_token uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_player public.participants;
  v_session public.live_sessions;
  v_status text;
  v_total integer;
  v_position integer;
  v_question jsonb;
  v_answer public.answers;
  v_has_answer boolean;
  v_result jsonb;
begin
  select * into v_player from public.participants where token = p_token;
  if not found then
    raise exception 'invalid_token' using errcode = 'PT404';
  end if;
  select * into v_session from public.live_sessions where id = v_player.session_id;
  v_status := private.effective_status(v_session);
  v_total := jsonb_array_length(v_session.quiz_snapshot -> 'questions');
  v_position := v_session.current_position;

  v_result := jsonb_build_object(
    -- Id phiên chỉ trả cho người giữ mã tham gia; dùng để nghe kênh Realtime `session:<id>` (tin báo chỉ mang seq).
    'session_id', v_session.id,
    'phase', case when v_player.removed then 'removed' else v_status end,
    'seq', v_session.seq,
    'server_now', clock_timestamp(),
    'nickname', v_player.nickname,
    'score', v_player.score,
    'question_total', v_total
  );
  if v_player.removed then
    return v_result;
  end if;

  if v_status = 'lobby' then
    v_result := v_result || jsonb_build_object(
      'player_count', (select count(*) from public.participants where session_id = v_session.id and not removed)
    );
  elsif v_status = 'question' then
    v_question := v_session.quiz_snapshot -> 'questions' -> v_position;
    v_result := v_result || jsonb_build_object(
      'question_index', v_position + 1,
      'question', private.question_public(v_question),
      'opened_at', v_session.question_opened_at,
      'closes_at', v_session.question_closes_at,
      'time_up', clock_timestamp() >= v_session.question_closes_at,
      'answered', exists (
        select 1 from public.answers a where a.participant_id = v_player.id and a.position = v_position
      ),
      -- Đáp án của chính người chơi (không phải bí mật): để tải lại trang vẫn thấy mình đã chọn gì. Null nếu chưa trả lời.
      'your_answer', (
        select a.answer from public.answers a where a.participant_id = v_player.id and a.position = v_position
      )
    );
  elsif v_status = 'reveal' then
    v_question := v_session.quiz_snapshot -> 'questions' -> v_position;
    select * into v_answer from public.answers a where a.participant_id = v_player.id and a.position = v_position;
    v_has_answer := found;
    v_result := v_result || jsonb_build_object(
      'question_index', v_position + 1,
      'question', private.question_public(v_question),
      'key', private.question_key(v_question),
      'answered', v_has_answer,
      'your_answer', v_answer.answer,
      'is_correct', coalesce(v_answer.is_correct, false),
      'points', coalesce(v_answer.points, 0),
      'rank', private.rank_of(v_session.id, v_player.score),
      -- Tự động qua câu: giờ máy chủ sẽ mở câu kế (null khi tắt tự động hoặc đang tạm dừng).
      'auto_advance', v_session.auto_advance,
      'paused', v_session.paused,
      'next_at', case when v_session.auto_advance and not v_session.paused then v_session.reveal_ends_at end
    );
  else
    v_result := v_result || jsonb_build_object(
      'rank', private.rank_of(v_session.id, v_player.score),
      'player_total', (select count(*) from public.participants where session_id = v_session.id and not removed)
    );
  end if;
  return v_result;
end;
$$;

-- ---------------------------------------------------------------------------------------------
-- Quyền thực thi
-- ---------------------------------------------------------------------------------------------

revoke execute on function private.advance_from_reveal(public.live_sessions) from public, anon, authenticated;

revoke execute on function
  public.create_session(uuid, boolean, jsonb),
  public.host_advance_if_due(uuid),
  public.host_set_paused(uuid, boolean)
  from public, anon;
grant execute on function
  public.create_session(uuid, boolean, jsonb),
  public.host_advance_if_due(uuid),
  public.host_set_paused(uuid, boolean)
  to authenticated;
