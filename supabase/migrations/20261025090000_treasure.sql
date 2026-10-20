-- Giai đoạn 2.5, phase 3: kho báu (chế độ giải trí, tắt mặc định).
--
-- Mọi luật nằm ở Postgres để học sinh không sửa được điểm: đếm chuỗi, phát rương, mở rương, chọn hiệu ứng ngẫu nhiên và
-- áp lên điểm của CHÍNH người mở. Học sinh không đọc/ghi được bảng nào; hiệu ứng chỉ lộ sau khi rương đã mở.
--
-- Luật (hằng số nằm trong các hàm bên dưới, chỉnh bằng một migration nhỏ):
--   * 3 câu đúng liên tiếp -> rương "win"; 3 câu sai hoặc bỏ trống liên tiếp -> rương "comfort"; nhận rương thì chuỗi về 0.
--   * Rương mở được ở pha hiện đáp án; rương chưa mở tự mở khi câu kế mở và trước xếp hạng cuối.
--   * Hiệu ứng chỉ lên điểm của chính mình: không âm, mức tăng một lần tối đa +2000; "comfort" không bao giờ làm giảm điểm.
--   * Ngoại lệ chấp nhận: phiên hết hạn 4 giờ tự thành "ended" mà không qua hàm chuyển pha thì không chốt rương.
--
-- Migration mới. Các hàm dưới đây được `create or replace` từ định nghĩa mới nhất: private.score_question,
-- public.host_end_session từ 20261022090000_live_sessions.sql; public.host_results từ 20261023090000_results_retention.sql;
-- private.open_next, private.advance_from_reveal, public.create_session, public.host_state, public.player_state từ
-- 20261024090000_auto_advance.sql.

alter table public.live_sessions add column treasure_mode boolean not null default false;
grant select (treasure_mode) on public.live_sessions to authenticated;

-- Chuỗi hiện tại của từng người chơi. KHÔNG cấp cho authenticated (danh sách cột được cấp trên participants là cố định).
alter table public.participants
  add column win_streak integer not null default 0,
  add column lose_streak integer not null default 0;

create table public.treasure_chests (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.live_sessions (id) on delete cascade,
  participant_id uuid not null references public.participants (id) on delete cascade,
  -- Câu kích hoạt (từ 0). Mỗi người chơi tối đa một rương cho mỗi câu: gọi đóng câu lặp không tạo thêm.
  position integer not null check (position >= 0),
  kind text not null check (kind in ('win', 'comfort')),
  status text not null default 'pending' check (status in ('pending', 'opened')),
  effect text check (effect in ('add', 'sub', 'mul', 'div')),
  operand numeric,
  label text,
  score_before integer,
  score_after integer,
  -- True khi rương được máy chủ tự mở (sang câu kế, kết thúc phiên) chứ không phải học sinh bấm mở.
  auto_opened boolean not null default false,
  created_at timestamptz not null default clock_timestamp(),
  opened_at timestamptz,
  constraint treasure_chests_unique_per_question unique (participant_id, position),
  constraint treasure_chests_opened_complete check (
    status = 'pending' or (effect is not null and operand is not null and label is not null
      and score_before is not null and score_after is not null and opened_at is not null)
  )
);

create index treasure_chests_session_status_idx on public.treasure_chests (session_id, status);

-- Không ai (kể cả giáo viên) đọc hay ghi trực tiếp: mọi truy cập đi qua hàm security definer.
alter table public.treasure_chests enable row level security;
revoke all on public.treasure_chests from anon, authenticated;

-- ---------------------------------------------------------------------------------------------
-- Hiệu ứng
-- ---------------------------------------------------------------------------------------------

-- Áp một hiệu ứng lên điểm: làm tròn về số nguyên, không âm, mức tăng một lần tối đa +2000.
create function private.apply_effect(p_score integer, p_op text, p_operand numeric)
returns integer
language sql
immutable
set search_path = ''
as $$
  select greatest(0, least(
    -- Phép không hợp lệ (toán hạng 0 khi chia, phép lạ) thì giữ nguyên điểm; LEAST bỏ qua NULL nên phải coalesce trước.
    coalesce(round(case p_op
      when 'add' then p_score + p_operand
      when 'sub' then p_score - p_operand
      when 'mul' then p_score * p_operand
      when 'div' then p_score / nullif(p_operand, 0)
      else p_score
    end)::integer, p_score),
    p_score + 2000
  ));
$$;

-- Chọn hiệu ứng ngẫu nhiên có trọng số (tổng 100). Rương comfort không bao giờ làm giảm điểm.
create function private.pick_effect(p_kind text)
returns table (op text, operand numeric, label text)
language plpgsql
volatile
set search_path = ''
as $$
declare
  v_roll integer := floor(random() * 100)::integer;
begin
  if p_kind = 'comfort' then
    if v_roll < 40 then
      return query select 'add'::text, 500::numeric, 'Cộng 500 điểm'::text;
    elsif v_roll < 75 then
      return query select 'add'::text, 1000::numeric, 'Cộng 1000 điểm'::text;
    else
      return query select 'mul'::text, 2::numeric, 'Nhân đôi điểm'::text;
    end if;
  else
    if v_roll < 25 then
      return query select 'add'::text, 500::numeric, 'Cộng 500 điểm'::text;
    elsif v_roll < 45 then
      return query select 'add'::text, 1000::numeric, 'Cộng 1000 điểm'::text;
    elsif v_roll < 60 then
      return query select 'mul'::text, 2::numeric, 'Nhân đôi điểm'::text;
    elsif v_roll < 70 then
      return query select 'mul'::text, 1.5::numeric, 'Nhân 1,5 điểm'::text;
    elsif v_roll < 85 then
      return query select 'sub'::text, 300::numeric, 'Trừ 300 điểm'::text;
    else
      return query select 'div'::text, 2::numeric, 'Chia đôi điểm'::text;
    end if;
  end if;
end;
$$;

-- Dạng JSON của một rương cho học sinh: chưa mở thì chỉ có loại (không lộ hiệu ứng).
create function private.chest_json(p_chest public.treasure_chests)
returns jsonb
language sql
immutable
set search_path = ''
as $$
  select case
    when p_chest.status = 'pending' then jsonb_build_object('status', 'pending', 'kind', p_chest.kind)
    else jsonb_build_object(
      'status', 'opened',
      'kind', p_chest.kind,
      'label', p_chest.label,
      'op', p_chest.effect,
      'operand', p_chest.operand,
      'before', p_chest.score_before,
      'after', p_chest.score_after,
      'auto', p_chest.auto_opened
    )
  end;
$$;

-- Mở một rương đang chờ: chọn hiệu ứng, áp lên điểm của chủ rương, ghi lại. Trả null nếu rương không còn chờ
-- (đã mở bởi lời gọi khác). THỨ TỰ KHOÁ: người chơi trước, rồi rương. open_chest (học sinh) khoá người chơi từ đầu, còn
-- settle_chests (giáo viên chuyển pha) đi qua hàm này, nên cả hai đường cùng thứ tự và không thể deadlock với nhau.
-- p_auto: true khi máy chủ tự mở (không phải học sinh bấm).
create function private.open_chest_row(p_chest uuid, p_auto boolean default false)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_owner uuid;
  v_chest public.treasure_chests;
  v_before integer;
  v_after integer;
  v_effect record;
begin
  select participant_id into v_owner from public.treasure_chests where id = p_chest;
  if not found then
    return null;
  end if;
  select score into v_before from public.participants where id = v_owner for update;
  select * into v_chest from public.treasure_chests where id = p_chest and status = 'pending' for update;
  if not found then
    return null;
  end if;
  select * into v_effect from private.pick_effect(v_chest.kind);
  v_after := private.apply_effect(v_before, v_effect.op, v_effect.operand);
  update public.participants set score = v_after where id = v_owner;
  update public.treasure_chests
  set status = 'opened', effect = v_effect.op, operand = v_effect.operand, label = v_effect.label,
      score_before = v_before, score_after = v_after, auto_opened = p_auto, opened_at = clock_timestamp()
  where id = v_chest.id
  returning * into v_chest;
  return private.chest_json(v_chest);
end;
$$;

-- Mở mọi rương còn chờ của phiên (khi sang câu kế, và trước xếp hạng cuối).
create function private.settle_chests(p_session uuid)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_id uuid;
begin
  for v_id in
    select id from public.treasure_chests where session_id = p_session and status = 'pending' order by created_at, id
  loop
    perform private.open_chest_row(v_id, true);
  end loop;
end;
$$;

-- Cập nhật chuỗi sau khi chấm một câu và phát rương khi đủ 3. Đúng thì tăng chuỗi thắng và đặt lại chuỗi thua; sai hoặc
-- bỏ trống thì tăng chuỗi thua và đặt lại chuỗi thắng. Người bị loại hoặc đã rời phòng không được tính.
create function private.update_streaks(p_session public.live_sessions)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_threshold constant integer := 3;
  v_row record;
  v_win integer;
  v_lose integer;
begin
  for v_row in
    select p.id, p.win_streak, p.lose_streak, a.is_correct
    from public.participants p
    left join public.answers a on a.participant_id = p.id and a.position = p_session.current_position
    where p.session_id = p_session.id and not p.removed
    for update of p
  loop
    if v_row.is_correct is true then
      v_win := v_row.win_streak + 1;
      v_lose := 0;
    else
      v_win := 0;
      v_lose := v_row.lose_streak + 1;
    end if;
    if v_win >= v_threshold then
      insert into public.treasure_chests (session_id, participant_id, position, kind)
      values (p_session.id, v_row.id, p_session.current_position, 'win')
      on conflict (participant_id, position) do nothing;
      v_win := 0;
    elsif v_lose >= v_threshold then
      insert into public.treasure_chests (session_id, participant_id, position, kind)
      values (p_session.id, v_row.id, p_session.current_position, 'comfort')
      on conflict (participant_id, position) do nothing;
      v_lose := 0;
    end if;
    update public.participants set win_streak = v_win, lose_streak = v_lose where id = v_row.id;
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------------------------
-- Hàm của học sinh: mở rương
-- ---------------------------------------------------------------------------------------------

-- Chỉ ở pha hiện đáp án. Mở rương đang chờ; gọi lại thì trả đúng kết quả đã mở (không đổi điểm lần nữa).
create function public.open_chest(p_token uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_player public.participants;
  v_session public.live_sessions;
  v_chest public.treasure_chests;
  v_result jsonb;
begin
  select * into v_player from public.participants where token = p_token for update;
  if not found then
    raise exception 'invalid_token' using errcode = 'PT404';
  end if;
  if v_player.removed then
    raise exception 'participant_removed' using errcode = 'PT409';
  end if;
  select * into v_session from public.live_sessions where id = v_player.session_id;
  if private.effective_status(v_session) <> 'reveal' then
    raise exception 'chest_not_ready' using errcode = 'PT409';
  end if;

  select * into v_chest from public.treasure_chests c
  where c.participant_id = v_player.id and c.position = v_session.current_position;
  if not found then
    raise exception 'no_chest' using errcode = 'PT404';
  end if;
  if v_chest.status = 'pending' then
    v_result := private.open_chest_row(v_chest.id);
    if v_result is not null then
      return v_result;
    end if;
    select * into v_chest from public.treasure_chests where id = v_chest.id;
  end if;
  return private.chest_json(v_chest);
end;
$$;

-- ---------------------------------------------------------------------------------------------
-- Hàm đã có, sửa để phát rương/chốt rương và trả thêm trường kho báu
-- ---------------------------------------------------------------------------------------------

create or replace function private.score_question(p_session public.live_sessions)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_question jsonb := p_session.quiz_snapshot -> 'questions' -> p_session.current_position;
  v_limit_ms numeric := (v_question ->> 'time_limit_seconds')::numeric * 1000;
  v_row record;
  v_ok boolean;
  v_points integer;
begin
  for v_row in
    select a.participant_id, a.position, a.answer, a.response_ms
    from public.answers a
    where a.session_id = p_session.id and a.position = p_session.current_position
  loop
    v_ok := private.is_answer_correct(v_question, v_row.answer);
    v_points := case
      when not v_ok then 0
      when p_session.speed_bonus then
        greatest(500, least(1000, round(1000 * (1 - 0.5 * v_row.response_ms / v_limit_ms))::integer))
      else 1000
    end;
    update public.answers set is_correct = v_ok, points = v_points
    where participant_id = v_row.participant_id and position = v_row.position;
    update public.participants set score = score + v_points where id = v_row.participant_id;
  end loop;

  -- Chế độ kho báu: cập nhật chuỗi thắng/thua và phát rương theo kết quả câu vừa chấm.
  if p_session.treasure_mode then
    perform private.update_streaks(p_session);
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
  -- Rương chưa mở của các câu trước tự mở trước khi sang câu mới, để điểm không đổi giữa lúc câu đang mở.
  perform private.settle_chests(p_session.id);
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

create or replace function private.advance_from_reveal(p_session public.live_sessions)
returns void
language plpgsql
set search_path = ''
as $$
begin
  if p_session.current_position + 1 < jsonb_array_length(p_session.quiz_snapshot -> 'questions') then
    perform private.open_next(p_session);
  else
    -- Rương còn lại tự mở trước khi chốt xếp hạng cuối.
    perform private.settle_chests(p_session.id);
    update public.live_sessions
    set status = 'ended', ended_at = clock_timestamp(), reveal_ends_at = null, seq = seq + 1
    where id = p_session.id;
  end if;
end;
$$;

create or replace function public.host_end_session(p_session uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_session public.live_sessions := private.host_session(p_session);
begin
  if v_session.status = 'question' then
    perform private.score_question(v_session);
  end if;
  perform private.settle_chests(v_session.id);
  update public.live_sessions
  set status = 'ended', ended_at = clock_timestamp(), seq = seq + 1
  where id = v_session.id;
end;
$$;

create or replace function public.create_session(p_quiz_id uuid, p_speed_bonus boolean default true, p_options jsonb default '{}'::jsonb)
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
  v_treasure boolean := false;
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
  if v_options ? 'treasure_mode' then
    if jsonb_typeof(v_options -> 'treasure_mode') <> 'boolean' then
      raise exception 'invalid_options' using errcode = 'PT400';
    end if;
    v_treasure := (v_options ->> 'treasure_mode')::boolean;
  end if;
  -- Kho báu cần đủ thời gian để học sinh mở rương trong lúc hiện đáp án: tự động qua câu thì tối thiểu 8 giây.
  if v_treasure and v_auto and v_reveal < 8 then
    v_reveal := 8;
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
      insert into public.live_sessions (owner_id, quiz_id, quiz_title, quiz_snapshot, pin, speed_bonus, auto_advance, reveal_seconds, treasure_mode)
      values (v_owner, p_quiz_id, v_title, v_snapshot, v_pin, coalesce(p_speed_bonus, true), v_auto, v_reveal, v_treasure)
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
    'reveal_ends_at', v_session.reveal_ends_at,
    'treasure_mode', v_session.treasure_mode
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
  -- Bảng tin vui: các rương vừa mở gần nhất (chỉ biệt danh, nhãn hiệu ứng và loại rương).
  if v_session.treasure_mode then
    v_result := v_result || jsonb_build_object('treasure_feed', coalesce((
      select jsonb_agg(f.item order by f.opened_at desc)
      from (
        select jsonb_build_object('nickname', p.nickname, 'label', c.label, 'kind', c.kind) as item, c.opened_at
        from public.treasure_chests c join public.participants p on p.id = c.participant_id
        where c.session_id = v_session.id and c.status = 'opened'
        order by c.opened_at desc
        limit 8
      ) f
    ), '[]'::jsonb));
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
  v_chest public.treasure_chests;
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
  -- Kho báu: chuỗi đang chạy; ở pha hiện đáp án là rương của câu vừa đóng (chưa mở chỉ cho biết loại, không lộ hiệu ứng);
  -- ở pha hỏi là rương câu liền trước NẾU máy chủ tự mở nó (để học sinh biết điểm vì sao đổi); ở pha kết thúc là tổng kết.
  if v_session.treasure_mode then
    if v_status in ('question', 'reveal') then
      v_result := v_result || jsonb_build_object(
        'streak', jsonb_build_object('win', v_player.win_streak, 'lose', v_player.lose_streak)
      );
    end if;
    if v_status = 'reveal' then
      select * into v_chest from public.treasure_chests c
      where c.participant_id = v_player.id and c.position = v_position;
      if found then
        v_result := v_result || jsonb_build_object('chest', private.chest_json(v_chest));
      end if;
    elsif v_status = 'question' and v_position >= 1 then
      select * into v_chest from public.treasure_chests c
      where c.participant_id = v_player.id and c.position = v_position - 1 and c.status = 'opened' and c.auto_opened;
      if found then
        v_result := v_result || jsonb_build_object('last_chest', private.chest_json(v_chest));
      end if;
    elsif v_status = 'ended' then
      v_result := v_result || jsonb_build_object('treasure', (
        select jsonb_build_object('opened', count(*), 'delta', coalesce(sum(c.score_after - c.score_before), 0))
        from public.treasure_chests c where c.participant_id = v_player.id and c.status = 'opened'
      ));
      select * into v_chest from public.treasure_chests c
      where c.participant_id = v_player.id and c.status = 'opened' and c.auto_opened
      order by c.position desc limit 1;
      if found then
        v_result := v_result || jsonb_build_object('last_chest', private.chest_json(v_chest));
      end if;
    end if;
  end if;
  return v_result;
end;
$$;

create or replace function public.host_results(p_session uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_session public.live_sessions;
  v_total integer;
  v_pos integer;
  v_question jsonb;
  v_dist jsonb;
  v_avg integer;
  v_questions jsonb := '[]'::jsonb;
  v_ranking jsonb;
  v_answers jsonb;
begin
  if (select auth.uid()) is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  select * into v_session from public.live_sessions where id = p_session and owner_id = (select auth.uid());
  if not found then
    raise exception 'session_not_found' using errcode = 'PT404';
  end if;
  if private.effective_status(v_session) <> 'ended' then
    raise exception 'session_not_ended' using errcode = 'PT409';
  end if;
  v_total := jsonb_array_length(v_session.quiz_snapshot -> 'questions');

  select coalesce(jsonb_agg(r.item order by r.ord), '[]'::jsonb) into v_ranking
  from (
    select
      jsonb_build_object(
        'id', p.id,
        'nickname', p.nickname,
        'score', p.score,
        'rank', case when p.removed then null else rank() over (partition by p.removed order by p.score desc) end,
        'removed', p.removed,
        'left', p.left_at is not null,
        'answered', coalesce(s.answered, 0),
        'correct', coalesce(s.correct, 0),
        'avg_response_ms', s.avg_ms,
        'treasure_delta', coalesce(t.delta, 0),
        'treasure_chests', coalesce(t.opened, 0)
      ) as item,
      row_number() over (order by p.removed, p.score desc, p.joined_at, p.id) as ord
    from public.participants p
    left join (
      select a.participant_id,
             count(*)::integer as answered,
             (count(*) filter (where a.is_correct))::integer as correct,
             round(avg(a.response_ms))::integer as avg_ms
      from public.answers a
      where a.session_id = v_session.id
      group by a.participant_id
    ) s on s.participant_id = p.id
    left join (
      select c.participant_id,
             (sum(c.score_after - c.score_before))::integer as delta,
             count(*)::integer as opened
      from public.treasure_chests c
      where c.session_id = v_session.id and c.status = 'opened'
      group by c.participant_id
    ) t on t.participant_id = p.id
    where p.session_id = v_session.id
  ) r;

  for v_pos in 0 .. v_total - 1 loop
    v_question := v_session.quiz_snapshot -> 'questions' -> v_pos;
    v_dist := private.distribution(v_session.id, v_pos, v_question);
    select round(avg(a.response_ms))::integer into v_avg
    from public.answers a join public.participants p on p.id = a.participant_id
    where a.session_id = v_session.id and a.position = v_pos and not p.removed;
    v_questions := v_questions || jsonb_build_object(
      'index', v_pos + 1,
      'prompt', v_question ->> 'prompt',
      'kind', v_question ->> 'kind',
      'time_limit_seconds', (v_question ->> 'time_limit_seconds')::integer,
      'options', private.question_public(v_question) -> 'options',
      'key', private.question_key(v_question),
      'correct', v_dist -> 'correct',
      'wrong', v_dist -> 'wrong',
      'unanswered', v_dist -> 'unanswered',
      'option_counts', v_dist -> 'options',
      'avg_response_ms', v_avg
    );
  end loop;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'player', a.participant_id,
      'q', a.position + 1,
      'answer', a.answer,
      'ok', a.is_correct,
      'points', a.points,
      'ms', a.response_ms
    ) order by a.position, a.answered_at
  ), '[]'::jsonb) into v_answers
  from public.answers a where a.session_id = v_session.id;

  return jsonb_build_object(
    'id', v_session.id,
    'quiz_title', v_session.quiz_title,
    'created_at', v_session.created_at,
    'ended_at', v_session.ended_at,
    'speed_bonus', v_session.speed_bonus,
    'treasure_mode', v_session.treasure_mode,
    'question_total', v_total,
    'player_count', (select count(*) from public.participants where session_id = v_session.id and not removed),
    'average_score', coalesce((select round(avg(score))::integer from public.participants where session_id = v_session.id and not removed), 0),
    'ranking', v_ranking,
    'questions', v_questions,
    'answers', v_answers
  );
end;
$$;

-- ---------------------------------------------------------------------------------------------
-- Quyền thực thi
-- ---------------------------------------------------------------------------------------------

revoke execute on function
  private.apply_effect(integer, text, numeric),
  private.pick_effect(text),
  private.chest_json(public.treasure_chests),
  private.open_chest_row(uuid, boolean),
  private.settle_chests(uuid),
  private.update_streaks(public.live_sessions)
  from public, anon, authenticated;

revoke execute on function public.open_chest(uuid) from public;
grant execute on function public.open_chest(uuid) to anon, authenticated;
