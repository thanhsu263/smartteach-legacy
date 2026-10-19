-- Giai đoạn 2, phase 7: kết quả sau buổi chơi, xoá một buổi, và xoá dữ liệu người chơi sau 90 ngày.
--
-- Chỉ chủ phiên xem hoặc xoá được kết quả của phiên mình (hàm security definer kiểm tra auth.uid()). Dữ liệu người
-- chơi (biệt danh, câu trả lời, điểm, thời gian) tự xoá sau 90 ngày theo hai đường độc lập: pg_cron mỗi ngày (nếu có),
-- và xoá cơ hội mỗi khi có giáo viên tạo phiên mới nên vẫn chạy khi pg_cron không khả dụng.

-- ---------------------------------------------------------------------------------------------
-- Xoá dữ liệu cũ
-- ---------------------------------------------------------------------------------------------

-- Xoá phiên tạo quá p_days ngày (người chơi và câu trả lời theo khoá ngoại cascade), kèm các lần nhập sai PIN cũ.
-- p_owner: chỉ xoá phiên của người đó; p_limit: chỉ xoá tối đa chừng này phiên mỗi lần (giữ thời gian gọi ngắn).
-- Trả về số phiên đã xoá. Không mở cho API: chỉ pg_cron, hàm create_session và quản trị gọi được.
create function private.purge_old_sessions(p_days integer default 90, p_owner uuid default null, p_limit integer default null)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  if p_days is null or p_days < 1 then
    raise exception 'invalid_retention' using errcode = '22023';
  end if;

  with doomed as (
    select id from public.live_sessions
    where created_at < clock_timestamp() - make_interval(days => p_days)
      and (p_owner is null or owner_id = p_owner)
    order by created_at
    limit coalesce(p_limit, 2147483647)
  )
  delete from public.live_sessions s using doomed d where s.id = d.id;
  get diagnostics v_count = row_count;

  delete from public.join_attempts where attempted_at < clock_timestamp() - interval '10 minutes';
  return v_count;
end;
$$;

revoke execute on function private.purge_old_sessions(integer, uuid, integer) from public, anon, authenticated;

-- Bản mới của create_session: như cũ, thêm xoá cơ hội dữ liệu quá hạn.
create or replace function public.create_session(p_quiz_id uuid, p_speed_bonus boolean default true)
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
begin
  if v_owner is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('live-owner:' || v_owner::text, 0));

  delete from public.join_attempts where attempted_at < clock_timestamp() - interval '10 minutes';

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
      insert into public.live_sessions (owner_id, quiz_id, quiz_title, quiz_snapshot, pin, speed_bonus)
      values (v_owner, p_quiz_id, v_title, v_snapshot, v_pin, coalesce(p_speed_bonus, true))
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
-- Kết quả sau buổi chơi (chỉ chủ phiên, chỉ khi phiên đã kết thúc)
-- ---------------------------------------------------------------------------------------------

-- Xếp hạng cuối, điểm từng người, thống kê từng câu (đúng, sai, bỏ trống, tỉ lệ chọn từng lựa chọn, thời gian trả lời
-- trung bình) và đáp án của từng người ở từng câu. Người bị loại hoặc tự rời không có thứ hạng.
create function public.host_results(p_session uuid)
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
        'avg_response_ms', s.avg_ms
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
    'question_total', v_total,
    'player_count', (select count(*) from public.participants where session_id = v_session.id and not removed),
    'average_score', coalesce((select round(avg(score))::integer from public.participants where session_id = v_session.id and not removed), 0),
    'ranking', v_ranking,
    'questions', v_questions,
    'answers', v_answers
  );
end;
$$;

-- Các buổi đã chơi của giáo viên (của một quiz, hoặc tất cả), mới nhất trước.
create function public.session_history(p_quiz_id uuid default null)
returns table (
  session_id uuid,
  quiz_id uuid,
  quiz_title text,
  created_at timestamptz,
  ended_at timestamptz,
  player_count integer,
  average_score integer
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    s.id,
    s.quiz_id,
    s.quiz_title,
    s.created_at,
    s.ended_at,
    (select count(*)::integer from public.participants p where p.session_id = s.id and not p.removed),
    coalesce((select round(avg(p.score))::integer from public.participants p where p.session_id = s.id and not p.removed), 0)
  from public.live_sessions s
  where s.owner_id = (select auth.uid())
    and (p_quiz_id is null or s.quiz_id = p_quiz_id)
    and (s.status = 'ended' or s.expires_at <= clock_timestamp())
  order by s.created_at desc
  limit 50;
$$;

-- Xoá một buổi đã chơi (người chơi và câu trả lời xoá theo). Phiên còn đang chạy thì phải kết thúc trước.
create function public.delete_session(p_session uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_session public.live_sessions;
begin
  if (select auth.uid()) is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  select * into v_session from public.live_sessions where id = p_session and owner_id = (select auth.uid()) for update;
  if not found then
    raise exception 'session_not_found' using errcode = 'PT404';
  end if;
  if private.effective_status(v_session) <> 'ended' then
    raise exception 'session_active' using errcode = 'PT409';
  end if;
  delete from public.live_sessions where id = v_session.id;
end;
$$;

revoke execute on function
  public.host_results(uuid),
  public.session_history(uuid),
  public.delete_session(uuid)
  from public, anon;
grant execute on function
  public.host_results(uuid),
  public.session_history(uuid),
  public.delete_session(uuid)
  to authenticated;

-- ---------------------------------------------------------------------------------------------
-- Lập lịch xoá mỗi ngày bằng pg_cron NẾU có thể. Không có hoặc không bật được thì bỏ qua (chỉ báo), không làm hỏng
-- migration; khi đó dữ liệu cũ vẫn được xoá cơ hội mỗi khi có giáo viên tạo phiên mới.
-- ---------------------------------------------------------------------------------------------

do $cron$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    begin
      create extension if not exists pg_cron;
      perform cron.schedule('smartteach-purge-old-sessions', '17 3 * * *', 'select private.purge_old_sessions()');
    exception when others then
      raise notice 'Không lập lịch được pg_cron (%); dữ liệu cũ sẽ được xoá cơ hội khi tạo phiên mới.', sqlerrm;
    end;
  else
    raise notice 'pg_cron không có sẵn; dữ liệu cũ sẽ được xoá cơ hội khi tạo phiên mới.';
  end if;
end;
$cron$;
