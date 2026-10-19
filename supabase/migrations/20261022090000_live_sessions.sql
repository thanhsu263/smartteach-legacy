-- Giai đoạn 2, phase 3: máy chủ chơi trực tiếp.
--
-- Toàn bộ trạng thái, thời gian và chấm điểm của một phiên chơi nằm ở Postgres. Học sinh (vai trò
-- anon) KHÔNG có quyền trên bảng nào; họ chỉ gọi các hàm security definer bên dưới bằng mã tham gia
-- bí mật (participants.token). Giáo viên điều khiển bằng các hàm host_* (kiểm tra chủ phiên) và chỉ
-- được select một số cột. Đề, lựa chọn và khoá đáp án được chụp vào live_sessions.quiz_snapshot lúc
-- bắt đầu nên sửa hay xoá quiz sau đó không đổi kết quả đã chơi.
--
-- Quy ước: mọi hàm security definer đặt search_path rỗng và dùng tên đầy đủ; không nối chuỗi SQL.
-- Lỗi nghiệp vụ là exception với thông báo cố định (giao diện đổi sang tiếng Việt), trừ join_session
-- trả về mã kết quả để lần nhập sai PIN được ghi lại (exception sẽ làm mất bản ghi).

create extension if not exists unaccent with schema extensions;
create schema if not exists private;

-- ---------------------------------------------------------------------------------------------
-- Bảng
-- ---------------------------------------------------------------------------------------------

create table public.live_sessions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  quiz_id uuid references public.quizzes (id) on delete set null,
  quiz_title text not null,
  -- { title, questions: [{ kind, prompt, time_limit_seconds, accepted_answers, ignore_diacritics,
  --   options: [{ label, is_correct }] }] }; chứa khoá đáp án nên chỉ hàm security definer đọc.
  quiz_snapshot jsonb not null,
  pin text not null,
  status text not null default 'lobby',
  locked boolean not null default false,
  speed_bonus boolean not null default true,
  -- Vị trí câu hiện tại (từ 0); -1 khi còn ở phòng chờ.
  current_position integer not null default -1,
  question_opened_at timestamptz,
  question_closes_at timestamptz,
  -- Tăng mỗi lần đổi pha để máy khách biết cần tải lại.
  seq integer not null default 0,
  created_at timestamptz not null default now(),
  ended_at timestamptz,
  expires_at timestamptz not null default (now() + interval '4 hours'),
  constraint live_sessions_status check (status in ('lobby', 'question', 'reveal', 'ended')),
  constraint live_sessions_pin check (pin ~ '^[0-9]{6}$'),
  constraint live_sessions_position check (current_position >= -1)
);

-- Mỗi giáo viên một phiên chưa kết thúc, và PIN duy nhất giữa các phiên chưa kết thúc.
create unique index live_sessions_active_owner_key on public.live_sessions (owner_id) where status <> 'ended';
create unique index live_sessions_active_pin_key on public.live_sessions (pin) where status <> 'ended';
create index live_sessions_expires_idx on public.live_sessions (expires_at) where status <> 'ended';
create index live_sessions_owner_created_idx on public.live_sessions (owner_id, created_at desc);

create table public.participants (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.live_sessions (id) on delete cascade,
  nickname text not null,
  -- Mã tham gia bí mật của học sinh; không bao giờ trả cho ai khác ngoài chính học sinh đó.
  token uuid not null default gen_random_uuid(),
  score integer not null default 0,
  removed boolean not null default false,
  joined_at timestamptz not null default now(),
  constraint participants_nickname_length check (char_length(btrim(nickname)) between 1 and 20)
);

create unique index participants_token_key on public.participants (token);
create unique index participants_nickname_key on public.participants (session_id, lower(nickname));
create index participants_session_idx on public.participants (session_id, joined_at);

create table public.answers (
  session_id uuid not null references public.live_sessions (id) on delete cascade,
  participant_id uuid not null references public.participants (id) on delete cascade,
  position integer not null,
  answer jsonb not null,
  -- Chấm lúc đóng câu; trước đó là false và 0.
  is_correct boolean not null default false,
  points integer not null default 0,
  answered_at timestamptz not null,
  response_ms integer not null,
  primary key (participant_id, position),
  constraint answers_response_ms check (response_ms >= 0),
  constraint answers_points check (points >= 0)
);

create index answers_session_position_idx on public.answers (session_id, position);

-- Lần nhập sai PIN theo băm địa chỉ IP, để chặn đoán PIN.
create table public.join_attempts (
  id bigint generated always as identity primary key,
  ip_hash text not null,
  attempted_at timestamptz not null default now()
);

create index join_attempts_ip_idx on public.join_attempts (ip_hash, attempted_at);
create index join_attempts_time_idx on public.join_attempts (attempted_at);

-- Tối đa 50 người chơi đang ở lại và 100 dòng mỗi phiên (người bị loại vẫn chiếm dòng để giữ
-- biệt danh, nhưng không cho nhồi vô hạn).
create function public.enforce_participant_limit()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  perform pg_advisory_xact_lock(hashtextextended('participants:' || new.session_id::text, 0));
  if (select count(*) from public.participants where session_id = new.session_id and not removed) >= 50
     or (select count(*) from public.participants where session_id = new.session_id) >= 100 then
    raise exception 'participant_limit_exceeded' using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger participants_limit before insert on public.participants
  for each row execute function public.enforce_participant_limit();

revoke execute on function public.enforce_participant_limit() from public, anon, authenticated;

-- ---------------------------------------------------------------------------------------------
-- Quyền truy cập: học sinh không có quyền nào; giáo viên chỉ select dữ liệu phiên của mình,
-- không có cột quiz_snapshot (khoá đáp án) và không có cột token của người chơi.
-- ---------------------------------------------------------------------------------------------

revoke all on public.live_sessions, public.participants, public.answers, public.join_attempts from anon, authenticated;

grant select (
  id, owner_id, quiz_id, quiz_title, pin, status, locked, speed_bonus, current_position,
  question_opened_at, question_closes_at, seq, created_at, ended_at, expires_at
) on public.live_sessions to authenticated;
grant select (id, session_id, nickname, score, removed, joined_at) on public.participants to authenticated;
grant select on public.answers to authenticated;

alter table public.live_sessions enable row level security;
alter table public.participants enable row level security;
alter table public.answers enable row level security;
alter table public.join_attempts enable row level security;

create policy live_sessions_select_own on public.live_sessions for select to authenticated
  using (owner_id = (select auth.uid()));
create policy participants_select_own on public.participants for select to authenticated
  using (exists (
    select 1 from public.live_sessions s where s.id = participants.session_id and s.owner_id = (select auth.uid())
  ));
create policy answers_select_own on public.answers for select to authenticated
  using (exists (
    select 1 from public.live_sessions s where s.id = answers.session_id and s.owner_id = (select auth.uid())
  ));

-- ---------------------------------------------------------------------------------------------
-- Hàm nội bộ (schema private, API không mở ra)
-- ---------------------------------------------------------------------------------------------

-- Địa chỉ IP của máy khách theo x-forwarded-for. Máy khách tự đặt được các phần tử đầu của chuỗi,
-- còn cổng vào (gateway) nối thêm địa chỉ máy nó thấy ở CUỐI, nên chỉ tin phần tử cuối.
-- Cần kiểm tra lại số tầng proxy trên dự án Supabase thật (task 8.3 của giai đoạn 2).
create function private.client_ip()
returns text
language plpgsql
stable
set search_path = ''
as $$
declare
  v_headers json;
  v_parts text[];
  v_ip text;
begin
  begin
    v_headers := nullif(current_setting('request.headers', true), '')::json;
  exception when others then
    v_headers := null;
  end;
  v_parts := string_to_array(coalesce(v_headers ->> 'x-forwarded-for', ''), ',');
  if cardinality(v_parts) = 0 then
    return 'unknown';
  end if;
  v_ip := btrim(v_parts[cardinality(v_parts)]);
  return coalesce(nullif(v_ip, ''), 'unknown');
end;
$$;

-- So khớp câu trả lời điền từ: gộp mọi khoảng trắng, cắt hai đầu, hạ chữ thường, chuẩn hoá Unicode
-- (gõ dấu kiểu tổ hợp hay dựng sẵn đều như nhau). Mặc định GIỮ dấu tiếng Việt; khi bật
-- ignore_diacritics thì bỏ dấu (đ thành d).
create function private.normalize_answer(p_text text, p_ignore_diacritics boolean)
returns text
language sql
stable
set search_path = ''
as $$
  select lower(
    btrim(
      regexp_replace(
        case
          when p_ignore_diacritics then
            replace(
              replace(
                extensions.unaccent('extensions.unaccent'::regdictionary, normalize(coalesce(p_text, ''), nfc)),
                'đ', 'd'),
              'Đ', 'D')
          else normalize(coalesce(p_text, ''), nfc)
        end,
        '\s+', ' ', 'g'
      )
    )
  );
$$;

-- Đề của một câu cho người chơi: không có khoá đáp án.
create function private.question_public(p_question jsonb)
returns jsonb
language sql
immutable
set search_path = ''
as $$
  select jsonb_build_object(
    'kind', p_question ->> 'kind',
    'prompt', p_question ->> 'prompt',
    'time_limit_seconds', (p_question ->> 'time_limit_seconds')::integer,
    'options', coalesce((
      select jsonb_agg(o ->> 'label' order by ord)
      from jsonb_array_elements(coalesce(p_question -> 'options', '[]'::jsonb)) with ordinality as t(o, ord)
    ), '[]'::jsonb)
  );
$$;

-- Khoá đáp án của một câu; CHỈ dùng sau khi câu đã đóng.
create function private.question_key(p_question jsonb)
returns jsonb
language sql
immutable
set search_path = ''
as $$
  select case
    when p_question ->> 'kind' = 'short_text' then jsonb_build_object(
      'accepted_answers', coalesce(p_question -> 'accepted_answers', '[]'::jsonb),
      'ignore_diacritics', coalesce((p_question ->> 'ignore_diacritics')::boolean, false)
    )
    else jsonb_build_object(
      'correct', coalesce((
        select jsonb_agg(ord - 1 order by ord)
        from jsonb_array_elements(coalesce(p_question -> 'options', '[]'::jsonb)) with ordinality as t(o, ord)
        where (o ->> 'is_correct')::boolean
      ), '[]'::jsonb)
    )
  end;
$$;

-- Hình dạng câu trả lời hợp lệ: chọn một (số nguyên chỉ số lựa chọn), nhiều đáp án (mảng chỉ số
-- khác nhau), điền từ (chuỗi 1-200 ký tự).
create function private.valid_answer(p_question jsonb, p_answer jsonb)
returns boolean
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_kind text := p_question ->> 'kind';
  v_n integer := jsonb_array_length(coalesce(p_question -> 'options', '[]'::jsonb));
  v_item jsonb;
begin
  if p_answer is null then
    return false;
  end if;

  if v_kind in ('single', 'true_false') then
    if jsonb_typeof(p_answer) <> 'number' or (p_answer #>> '{}') !~ '^[0-9]{1,2}$' then
      return false;
    end if;
    return (p_answer #>> '{}')::integer < v_n;
  elsif v_kind = 'multi' then
    if jsonb_typeof(p_answer) <> 'array' or jsonb_array_length(p_answer) not between 1 and v_n then
      return false;
    end if;
    for v_item in select value from jsonb_array_elements(p_answer) loop
      if jsonb_typeof(v_item) <> 'number' or (v_item #>> '{}') !~ '^[0-9]{1,2}$' then
        return false;
      end if;
      if (v_item #>> '{}')::integer >= v_n then
        return false;
      end if;
    end loop;
    return (select count(distinct value) from jsonb_array_elements(p_answer)) = jsonb_array_length(p_answer);
  elsif v_kind = 'short_text' then
    -- Phải có ít nhất một ký tự không phải khoảng trắng (kể cả tab, xuống dòng).
    return jsonb_typeof(p_answer) = 'string'
       and (p_answer #>> '{}') ~ '\S'
       and char_length(p_answer #>> '{}') <= 200;
  end if;
  return false;
end;
$$;

-- Đúng hay sai theo khoá của câu. Chọn nhiều đáp án: phải đúng hết và không chọn thừa.
create function private.is_answer_correct(p_question jsonb, p_answer jsonb)
returns boolean
language plpgsql
stable
set search_path = ''
as $$
declare
  v_kind text := p_question ->> 'kind';
  v_ignore boolean := coalesce((p_question ->> 'ignore_diacritics')::boolean, false);
  v_chosen integer[];
  v_correct integer[];
begin
  if not private.valid_answer(p_question, p_answer) then
    return false;
  end if;

  if v_kind in ('single', 'true_false') then
    return coalesce((p_question -> 'options' -> (p_answer #>> '{}')::integer ->> 'is_correct')::boolean, false);
  elsif v_kind = 'multi' then
    select array_agg(distinct x::integer order by x::integer) into v_chosen
    from jsonb_array_elements_text(p_answer) as x;
    select array_agg(ord - 1 order by ord) into v_correct
    from jsonb_array_elements(p_question -> 'options') with ordinality as t(o, ord)
    where (o ->> 'is_correct')::boolean;
    return coalesce(v_chosen = v_correct, false);
  else
    return exists (
      select 1
      from jsonb_array_elements_text(coalesce(p_question -> 'accepted_answers', '[]'::jsonb)) as a
      where private.normalize_answer(a, v_ignore) = private.normalize_answer(p_answer #>> '{}', v_ignore)
    );
  end if;
end;
$$;

-- Trạng thái hiệu lực: phiên quá hạn coi như đã kết thúc (không cần ghi để biết điều đó).
create function private.effective_status(p_session public.live_sessions)
returns text
language sql
stable
set search_path = ''
as $$
  select case
    when p_session.status <> 'ended' and p_session.expires_at <= clock_timestamp() then 'ended'
    else p_session.status
  end;
$$;

-- Bảng xếp hạng (không tính người bị loại); đồng hạng cùng thứ hạng.
create function private.leaderboard(p_session uuid, p_limit integer)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object('rank', r.rank, 'nickname', r.nickname, 'score', r.score) order by r.rank, r.joined_at), '[]'::jsonb)
  from (
    select p.nickname, p.score, p.joined_at,
           rank() over (order by p.score desc) as rank
    from public.participants p
    where p.session_id = p_session and not p.removed
  ) r
  where r.rank <= p_limit;
$$;

-- Thứ hạng của một người (không tính người bị loại).
create function private.rank_of(p_session uuid, p_score integer)
returns integer
language sql
stable
set search_path = ''
as $$
  select 1 + count(*)::integer from public.participants p
  where p.session_id = p_session and not p.removed and p.score > p_score;
$$;

-- Phân bố câu trả lời của một câu đã đóng.
create function private.distribution(p_session uuid, p_position integer, p_question jsonb)
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  v_players integer;
  v_answered integer;
  v_correct integer;
  v_options jsonb := '[]'::jsonb;
  v_n integer := jsonb_array_length(coalesce(p_question -> 'options', '[]'::jsonb));
  v_count integer;
  i integer;
begin
  select count(*) into v_players from public.participants where session_id = p_session and not removed;
  select count(*), count(*) filter (where a.is_correct) into v_answered, v_correct
  from public.answers a join public.participants p on p.id = a.participant_id
  where a.session_id = p_session and a.position = p_position and not p.removed;

  if p_question ->> 'kind' <> 'short_text' then
    for i in 0 .. v_n - 1 loop
      select count(*) into v_count
      from public.answers a join public.participants p on p.id = a.participant_id
      where a.session_id = p_session and a.position = p_position and not p.removed and a.answer @> to_jsonb(i);
      v_options := v_options || to_jsonb(v_count);
    end loop;
  end if;

  return jsonb_build_object(
    'correct', v_correct,
    'wrong', v_answered - v_correct,
    'unanswered', v_players - v_answered,
    'options', v_options
  );
end;
$$;

-- Chấm điểm mọi câu trả lời của câu hiện tại (gọi một lần khi đóng câu).
-- Đúng: 1000; khi bật speed_bonus: round(1000 * (1 - 0.5 * thời gian trả lời / thời gian câu)),
-- trong khoảng 500..1000. Sai hoặc không trả lời: 0.
create function private.score_question(p_session public.live_sessions)
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
end;
$$;

-- Khoá và trả phiên của giáo viên đang gọi; không phải chủ thì báo không tìm thấy (không lộ phiên
-- của người khác).
create function private.host_session(p_session uuid)
returns public.live_sessions
language plpgsql
set search_path = ''
as $$
declare
  v_session public.live_sessions;
begin
  if (select auth.uid()) is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  select * into v_session from public.live_sessions
  where id = p_session and owner_id = (select auth.uid())
  for update;
  if not found then
    raise exception 'session_not_found' using errcode = 'P0002';
  end if;
  if private.effective_status(v_session) = 'ended' then
    raise exception 'session_ended' using errcode = '55000';
  end if;
  return v_session;
end;
$$;

-- Mở câu kế tiếp (từ phòng chờ hoặc sau khi hiện đáp án).
create function private.open_next(p_session public.live_sessions)
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
      seq = seq + 1
  where id = p_session.id;
end;
$$;

-- ---------------------------------------------------------------------------------------------
-- Hàm của giáo viên (chỉ người đã đăng nhập, và chỉ chủ phiên)
-- ---------------------------------------------------------------------------------------------

create function public.create_session(p_quiz_id uuid, p_speed_bonus boolean default true)
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

  -- Dọn các phiên quá hạn để trả PIN và chỗ "một phiên mỗi giáo viên".
  update public.live_sessions set status = 'ended', ended_at = coalesce(ended_at, clock_timestamp())
  where status <> 'ended' and expires_at <= clock_timestamp();

  select z.title into v_title from public.quizzes z where z.id = p_quiz_id and z.owner_id = v_owner;
  if not found then
    raise exception 'quiz_not_found' using errcode = 'P0002';
  end if;

  if exists (select 1 from public.quiz_problems(p_quiz_id)) then
    raise exception 'quiz_not_playable' using errcode = '55000';
  end if;

  if exists (select 1 from public.live_sessions where owner_id = v_owner and status <> 'ended') then
    raise exception 'session_already_active' using errcode = '55000';
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
        raise exception 'session_already_active' using errcode = '55000';
      end if;
      v_id := null;
    end;
  end loop;

  if v_id is null then
    raise exception 'pin_unavailable' using errcode = '55000';
  end if;
  return query select v_id, v_pin;
end;
$$;

create function public.host_set_locked(p_session uuid, p_locked boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_session public.live_sessions := private.host_session(p_session);
begin
  update public.live_sessions set locked = coalesce(p_locked, false), seq = seq + 1 where id = v_session.id;
end;
$$;

create function public.host_remove_participant(p_session uuid, p_participant uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_session public.live_sessions := private.host_session(p_session);
begin
  update public.participants set removed = true where id = p_participant and session_id = v_session.id;
  if not found then
    raise exception 'participant_not_found' using errcode = 'P0002';
  end if;
  update public.live_sessions set seq = seq + 1 where id = v_session.id;
end;
$$;

-- Bắt đầu: phòng chờ -> câu đầu tiên.
create function public.host_open_question(p_session uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_session public.live_sessions := private.host_session(p_session);
begin
  if v_session.status <> 'lobby' then
    raise exception 'invalid_transition' using errcode = '55000';
  end if;
  if jsonb_array_length(v_session.quiz_snapshot -> 'questions') = 0 then
    raise exception 'quiz_not_playable' using errcode = '55000';
  end if;
  perform private.open_next(v_session);
end;
$$;

-- Đóng câu (hết giờ hoặc giáo viên bỏ qua): chấm điểm rồi sang pha hiện đáp án.
create function public.host_close_question(p_session uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_session public.live_sessions := private.host_session(p_session);
begin
  if v_session.status <> 'question' then
    raise exception 'invalid_transition' using errcode = '55000';
  end if;
  perform private.score_question(v_session);
  update public.live_sessions
  set status = 'reveal',
      question_closes_at = least(question_closes_at, clock_timestamp()),
      seq = seq + 1
  where id = v_session.id;
end;
$$;

-- Sau khi hiện đáp án: sang câu kế, hoặc kết thúc nếu hết câu.
create function public.host_next(p_session uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_session public.live_sessions := private.host_session(p_session);
begin
  if v_session.status <> 'reveal' then
    raise exception 'invalid_transition' using errcode = '55000';
  end if;
  if v_session.current_position + 1 < jsonb_array_length(v_session.quiz_snapshot -> 'questions') then
    perform private.open_next(v_session);
  else
    update public.live_sessions
    set status = 'ended', ended_at = clock_timestamp(), seq = seq + 1
    where id = v_session.id;
  end if;
end;
$$;

create function public.host_end_session(p_session uuid)
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
  update public.live_sessions
  set status = 'ended', ended_at = clock_timestamp(), seq = seq + 1
  where id = v_session.id;
end;
$$;

-- Trạng thái cho màn hình giáo viên (cũng là màn hình chiếu). Khi câu đang mở KHÔNG kèm khoá đáp án
-- vì màn hình này được chiếu cho cả lớp xem; khoá chỉ có sau khi câu đóng.
create function public.host_state(p_session uuid)
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
    raise exception 'session_not_found' using errcode = 'P0002';
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
    'answered_count', v_answered
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

-- ---------------------------------------------------------------------------------------------
-- Hàm của học sinh (anon và authenticated; chỉ biết mã tham gia bí mật)
-- ---------------------------------------------------------------------------------------------

-- Trả mã kết quả thay vì exception để lần nhập sai PIN được ghi lại (exception sẽ hoàn tác bản ghi).
-- result: ok | invalid_pin | too_many_attempts | session_started | room_locked | invalid_nickname |
--         nickname_taken | room_full
create function public.join_session(p_pin text, p_nickname text)
returns table (result text, player_token uuid, player_nickname text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_hash text := encode(extensions.digest(private.client_ip(), 'sha256'), 'hex');
  v_session public.live_sessions;
  v_nickname text;
  v_token uuid;
begin
  -- Quá 30 lần sai trong 10 phút từ cùng một IP thì từ chối mọi lần thử, kể cả PIN đúng.
  if (
    select count(*) from public.join_attempts
    where ip_hash = v_hash and attempted_at > clock_timestamp() - interval '10 minutes'
  ) >= 30 then
    return query select 'too_many_attempts'::text, null::uuid, null::text;
    return;
  end if;

  select * into v_session from public.live_sessions
  where pin = btrim(coalesce(p_pin, '')) and status <> 'ended' and expires_at > clock_timestamp()
  for share;
  if not found then
    insert into public.join_attempts (ip_hash) values (v_hash);
    delete from public.join_attempts where attempted_at < clock_timestamp() - interval '1 hour';
    return query select 'invalid_pin'::text, null::uuid, null::text;
    return;
  end if;

  if v_session.status <> 'lobby' then
    return query select 'session_started'::text, null::uuid, null::text;
    return;
  end if;
  if v_session.locked then
    return query select 'room_locked'::text, null::uuid, null::text;
    return;
  end if;

  v_nickname := regexp_replace(btrim(coalesce(p_nickname, '')), '\s+', ' ', 'g');
  if char_length(v_nickname) not between 1 and 20 or v_nickname ~ '[[:cntrl:]]' then
    return query select 'invalid_nickname'::text, null::uuid, null::text;
    return;
  end if;

  perform pg_advisory_xact_lock(hashtextextended('participants:' || v_session.id::text, 0));
  if (select count(*) from public.participants where session_id = v_session.id and not removed) >= 50
     or (select count(*) from public.participants where session_id = v_session.id) >= 100 then
    return query select 'room_full'::text, null::uuid, null::text;
    return;
  end if;
  if exists (
    select 1 from public.participants where session_id = v_session.id and lower(nickname) = lower(v_nickname)
  ) then
    return query select 'nickname_taken'::text, null::uuid, null::text;
    return;
  end if;

  begin
    insert into public.participants (session_id, nickname) values (v_session.id, v_nickname)
    returning token into v_token;
  exception when unique_violation then
    return query select 'nickname_taken'::text, null::uuid, null::text;
    return;
  end;
  return query select 'ok'::text, v_token, v_nickname;
end;
$$;

-- Trạng thái cho một người chơi. Chỉ khi câu đang mở mới có đề và lựa chọn; KHÔNG BAO GIỜ có khoá
-- đáp án trước khi câu đóng.
create function public.player_state(p_token uuid)
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
    raise exception 'invalid_token' using errcode = 'P0002';
  end if;
  select * into v_session from public.live_sessions where id = v_player.session_id;
  v_status := private.effective_status(v_session);
  v_total := jsonb_array_length(v_session.quiz_snapshot -> 'questions');
  v_position := v_session.current_position;

  v_result := jsonb_build_object(
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
      'rank', private.rank_of(v_session.id, v_player.score)
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

-- Một đáp án mỗi câu, chỉ khi câu đang mở và trước hạn chót theo đồng hồ MÁY CHỦ.
create function public.submit_answer(p_token uuid, p_answer jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_player public.participants;
  v_session public.live_sessions;
  v_question jsonb;
  v_now timestamptz;
  v_removed boolean;
begin
  select * into v_player from public.participants where token = p_token;
  if not found then
    raise exception 'invalid_token' using errcode = 'P0002';
  end if;

  -- Khoá chia sẻ phiên để không lọt câu trả lời vào giữa lúc giáo viên đóng câu và chấm điểm.
  select * into v_session from public.live_sessions where id = v_player.session_id for share;
  select removed into v_removed from public.participants where id = v_player.id;
  if v_removed then
    raise exception 'participant_removed' using errcode = '55000';
  end if;

  v_now := clock_timestamp();
  if v_session.status <> 'question' or v_session.expires_at <= v_now or v_now >= v_session.question_closes_at then
    raise exception 'answer_closed' using errcode = '55000';
  end if;

  v_question := v_session.quiz_snapshot -> 'questions' -> v_session.current_position;
  if not private.valid_answer(v_question, p_answer) then
    raise exception 'invalid_answer' using errcode = '22023';
  end if;

  begin
    insert into public.answers (session_id, participant_id, position, answer, answered_at, response_ms)
    values (
      v_session.id, v_player.id, v_session.current_position, p_answer, v_now,
      greatest(0, floor(extract(epoch from (v_now - v_session.question_opened_at)) * 1000))::integer
    );
  exception when unique_violation then
    raise exception 'already_answered' using errcode = '23505';
  end;
end;
$$;

-- Bảng xếp hạng: top 5 và hạng của mình; khi phiên kết thúc trả top 3 kèm hạng.
create function public.player_leaderboard(p_token uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_player public.participants;
  v_session public.live_sessions;
begin
  select * into v_player from public.participants where token = p_token;
  if not found then
    raise exception 'invalid_token' using errcode = 'P0002';
  end if;
  if v_player.removed then
    raise exception 'participant_removed' using errcode = '55000';
  end if;
  select * into v_session from public.live_sessions where id = v_player.session_id;
  return jsonb_build_object(
    'top', private.leaderboard(v_session.id, case when private.effective_status(v_session) = 'ended' then 3 else 5 end),
    'me', jsonb_build_object(
      'rank', private.rank_of(v_session.id, v_player.score),
      'score', v_player.score,
      'nickname', v_player.nickname
    )
  );
end;
$$;

-- ---------------------------------------------------------------------------------------------
-- Quyền thực thi
-- ---------------------------------------------------------------------------------------------

revoke execute on function
  private.client_ip(),
  private.normalize_answer(text, boolean),
  private.question_public(jsonb),
  private.question_key(jsonb),
  private.valid_answer(jsonb, jsonb),
  private.is_answer_correct(jsonb, jsonb),
  private.effective_status(public.live_sessions),
  private.leaderboard(uuid, integer),
  private.rank_of(uuid, integer),
  private.distribution(uuid, integer, jsonb),
  private.score_question(public.live_sessions),
  private.host_session(uuid),
  private.open_next(public.live_sessions)
  from public, anon, authenticated;

revoke execute on function
  public.create_session(uuid, boolean),
  public.host_set_locked(uuid, boolean),
  public.host_remove_participant(uuid, uuid),
  public.host_open_question(uuid),
  public.host_close_question(uuid),
  public.host_next(uuid),
  public.host_end_session(uuid),
  public.host_state(uuid)
  from public, anon;
grant execute on function
  public.create_session(uuid, boolean),
  public.host_set_locked(uuid, boolean),
  public.host_remove_participant(uuid, uuid),
  public.host_open_question(uuid),
  public.host_close_question(uuid),
  public.host_next(uuid),
  public.host_end_session(uuid),
  public.host_state(uuid)
  to authenticated;

revoke execute on function
  public.join_session(text, text),
  public.player_state(uuid),
  public.submit_answer(uuid, jsonb),
  public.player_leaderboard(uuid)
  from public;
grant execute on function
  public.join_session(text, text),
  public.player_state(uuid),
  public.submit_answer(uuid, jsonb),
  public.player_leaderboard(uuid)
  to anon, authenticated;
