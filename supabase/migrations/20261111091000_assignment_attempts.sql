-- Giai đoạn 3, phase 06: credential roster và attempt không tài khoản.
-- Raw credential/token chỉ sinh trong RPC trả một lần; database chỉ lưu SHA-256 digest.

create table public.student_access_credentials (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students (id) on delete cascade,
  secret_digest text not null unique,
  hint text not null,
  version integer not null,
  issued_at timestamptz not null default clock_timestamp(),
  revoked_at timestamptz,
  constraint student_access_credentials_hint check (hint ~ '^[A-F0-9]{4}$'),
  constraint student_access_credentials_version check (version > 0)
);
create unique index student_access_credentials_active_student_key on public.student_access_credentials (student_id) where revoked_at is null;

create table public.assignment_attempts (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.assignments (id) on delete cascade,
  student_id uuid not null references public.students (id) on delete cascade,
  credential_version integer not null,
  token_digest text not null unique,
  token_expires_at timestamptz not null,
  status text not null default 'in_progress',
  started_at timestamptz not null default clock_timestamp(),
  submitted_at timestamptz,
  invalidated_at timestamptz,
  invalidated_reason text,
  score integer,
  correct_count integer,
  question_total integer,
  constraint assignment_attempts_status check (status in ('in_progress', 'submitted', 'invalidated')),
  constraint assignment_attempts_state check (
    (status = 'in_progress' and submitted_at is null and invalidated_at is null)
    or (status = 'submitted' and submitted_at is not null and invalidated_at is null)
    or (status = 'invalidated' and invalidated_at is not null)
  )
);
create unique index assignment_attempts_active_key on public.assignment_attempts (assignment_id, student_id) where status = 'in_progress';
create index assignment_attempts_assignment_student_idx on public.assignment_attempts (assignment_id, student_id, started_at desc);
create index assignment_attempts_token_expiry_idx on public.assignment_attempts (token_expires_at) where status = 'in_progress';

create table public.assignment_answers (
  attempt_id uuid not null references public.assignment_attempts (id) on delete cascade,
  position integer not null,
  answer jsonb not null,
  saved_at timestamptz not null default clock_timestamp(),
  is_correct boolean,
  primary key (attempt_id, position),
  constraint assignment_answers_position check (position >= 0)
);

create function private.assignment_digest(p_secret text)
returns text language sql immutable set search_path = ''
as $$ select encode(extensions.digest(coalesce(p_secret, ''), 'sha256'), 'hex') $$;

create function private.assignment_token_expiry(p_due_at timestamptz)
returns timestamptz language sql stable set search_path = ''
as $$ select least(clock_timestamp() + interval '30 days', coalesce(p_due_at, 'infinity'::timestamptz)) $$;

create function private.assignment_is_open(p_assignment public.assignments)
returns boolean language sql stable set search_path = ''
as $$
  select p_assignment.status = 'published'
    and (p_assignment.opens_at is null or p_assignment.opens_at <= clock_timestamp())
    and (p_assignment.due_at is null or p_assignment.due_at > clock_timestamp())
$$;

-- Generate/rotate credential. Rotating invalidates unfinished attempts only; submitted audit remains intact.
create function public.issue_student_credential(p_student uuid)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare v_owner uuid := (select auth.uid()); v_secret text; v_version integer; v_id uuid;
begin
  if v_owner is null then raise exception 'not_authenticated' using errcode = '42501'; end if;
  perform 1 from public.students s join public.classes c on c.id = s.class_id where s.id = p_student and c.owner_id = v_owner;
  if not found then raise exception 'student_not_found' using errcode = 'PT404'; end if;
  perform pg_advisory_xact_lock(hashtextextended('credential:' || p_student::text, 0));
  select coalesce(max(version), 0) + 1 into v_version from public.student_access_credentials where student_id = p_student;
  update public.student_access_credentials set revoked_at = clock_timestamp() where student_id = p_student and revoked_at is null;
  update public.assignment_attempts set status = 'invalidated', invalidated_at = clock_timestamp(), invalidated_reason = 'credential_rotated'
  where student_id = p_student and status = 'in_progress';
  v_secret := upper(encode(extensions.gen_random_bytes(16), 'hex'));
  insert into public.student_access_credentials (student_id, secret_digest, hint, version)
  values (p_student, private.assignment_digest(v_secret), right(v_secret, 4), v_version) returning id into v_id;
  return jsonb_build_object('credential_id', v_id, 'student_id', p_student, 'credential', v_secret, 'hint', right(v_secret, 4), 'version', v_version);
end;
$$;

create function public.revoke_student_credential(p_student uuid)
returns void language plpgsql security definer set search_path = ''
as $$
declare v_owner uuid := (select auth.uid());
begin
  if v_owner is null then raise exception 'not_authenticated' using errcode = '42501'; end if;
  perform 1 from public.students s join public.classes c on c.id=s.class_id where s.id=p_student and c.owner_id=v_owner;
  if not found then raise exception 'student_not_found' using errcode = 'PT404'; end if;
  update public.student_access_credentials set revoked_at=clock_timestamp() where student_id=p_student and revoked_at is null;
  update public.assignment_attempts set status='invalidated', invalidated_at=clock_timestamp(), invalidated_reason='credential_revoked'
  where student_id=p_student and status='in_progress';
end;
$$;

-- Mọi lỗi exchange là "invalid" để không dò code/student/credential.
create function public.exchange_assignment_access(p_code text, p_credential text)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare v_assignment public.assignments; v_credential public.student_access_credentials; v_attempt public.assignment_attempts;
  v_token text; v_digest text; v_expiry timestamptz;
begin
  select * into v_assignment from public.assignments where public_code=upper(btrim(coalesce(p_code,''))) for share;
  if not found or not private.assignment_is_open(v_assignment) then return jsonb_build_object('result','invalid'); end if;
  select c.* into v_credential from public.student_access_credentials c
  where c.revoked_at is null and c.secret_digest=private.assignment_digest(p_credential)
    and exists (select 1 from public.students s where s.id=c.student_id and s.class_id=v_assignment.class_id) for update;
  if not found then return jsonb_build_object('result','invalid'); end if;
  perform pg_advisory_xact_lock(hashtextextended('attempt:' || v_assignment.id::text || ':' || v_credential.student_id::text, 0));
  -- Một học sinh mặc định chỉ có một lượt. Exchange lại sau khi đã nộp chỉ cấp token
  -- mới cho cùng receipt; lượt mới chỉ xuất hiện sau teacher reset (status invalidated).
  select * into v_attempt from public.assignment_attempts
  where assignment_id=v_assignment.id and student_id=v_credential.student_id and status in ('in_progress','submitted')
  order by started_at desc, id desc limit 1 for update;
  v_token := upper(encode(extensions.gen_random_bytes(24), 'hex')); v_digest := private.assignment_digest(v_token); v_expiry := private.assignment_token_expiry(v_assignment.due_at);
  if found then
    update public.assignment_attempts set token_digest=v_digest, token_expires_at=v_expiry, credential_version=v_credential.version where id=v_attempt.id returning * into v_attempt;
  else
    insert into public.assignment_attempts (assignment_id,student_id,credential_version,token_digest,token_expires_at)
    values (v_assignment.id,v_credential.student_id,v_credential.version,v_digest,v_expiry) returning * into v_attempt;
  end if;
  return jsonb_build_object('result','ok','token',v_token,'attempt_id',v_attempt.id,'expires_at',v_attempt.token_expires_at);
end;
$$;

revoke all on public.student_access_credentials, public.assignment_attempts, public.assignment_answers from anon, authenticated;
alter table public.student_access_credentials enable row level security;
alter table public.assignment_attempts enable row level security;
alter table public.assignment_answers enable row level security;
revoke execute on function private.assignment_digest(text), private.assignment_token_expiry(timestamptz), private.assignment_is_open(public.assignments) from public, anon, authenticated;
revoke execute on function public.issue_student_credential(uuid), public.revoke_student_credential(uuid) from public, anon;
grant execute on function public.issue_student_credential(uuid), public.revoke_student_credential(uuid) to authenticated;
revoke execute on function public.exchange_assignment_access(text,text) from public;
grant execute on function public.exchange_assignment_access(text,text) to anon, authenticated;

-- Payload học sinh luôn loại đáp án đúng khỏi snapshot teacher-only.
create function private.assignment_public_questions(p_snapshot jsonb)
returns jsonb language sql immutable set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'index', q.ordinality - 1, 'kind', q.value ->> 'kind', 'prompt', q.value ->> 'prompt',
    'time_limit_seconds', (q.value ->> 'time_limit_seconds')::integer,
    'options', coalesce((select jsonb_agg(o.value ->> 'label' order by o.ordinality)
      from jsonb_array_elements(coalesce(q.value -> 'options','[]'::jsonb)) with ordinality as o(value, ordinality)), '[]'::jsonb)
  ) order by q.ordinality), '[]'::jsonb)
  from jsonb_array_elements(p_snapshot -> 'questions') with ordinality as q(value, ordinality)
$$;

create function public.assignment_student_state(p_token text)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare v_attempt public.assignment_attempts; v_assignment public.assignments; v_answers jsonb;
begin
  select at.* into v_attempt from public.assignment_attempts at
  where at.token_digest = private.assignment_digest(p_token) and at.token_expires_at > clock_timestamp();
  if not found then raise exception 'attempt_not_found' using errcode = 'PT404'; end if;
  select * into v_assignment from public.assignments where id=v_attempt.assignment_id;
  if not found then raise exception 'attempt_not_found' using errcode = 'PT404'; end if;
  select coalesce(jsonb_object_agg(position, answer), '{}'::jsonb) into v_answers from public.assignment_answers where attempt_id=v_attempt.id;
  return jsonb_build_object(
    'phase', case when v_attempt.status='invalidated' then 'invalidated' when v_attempt.status='submitted' then 'submitted'
                  when private.assignment_is_open(v_assignment) then 'in_progress' else 'unavailable' end,
    'title', v_assignment.title, 'description', v_assignment.description, 'attempt_id', v_attempt.id,
    'expires_at', v_attempt.token_expires_at, 'questions', private.assignment_public_questions(v_assignment.quiz_snapshot),
    'answers', v_answers, 'submitted_at', v_attempt.submitted_at,
    'result', case when v_attempt.status='submitted' and (v_assignment.reveal_policy='immediate' or v_assignment.status='closed')
      then jsonb_build_object('score',v_attempt.score,'correct',v_attempt.correct_count,'total',v_attempt.question_total) else null end
  );
end;
$$;

create function public.save_assignment_answer(p_token text, p_position integer, p_answer jsonb)
returns void language plpgsql security definer set search_path = ''
as $$
declare v_attempt public.assignment_attempts; v_assignment public.assignments; v_question jsonb;
begin
  select at.* into v_attempt from public.assignment_attempts at where at.token_digest=private.assignment_digest(p_token) for update;
  if not found or v_attempt.token_expires_at <= clock_timestamp() then raise exception 'attempt_not_found' using errcode='PT404'; end if;
  select * into v_assignment from public.assignments where id=v_attempt.assignment_id;
  if v_attempt.status <> 'in_progress' or not private.assignment_is_open(v_assignment) then raise exception 'attempt_not_editable' using errcode='PT409'; end if;
  if p_position is null or p_position < 0 or p_position >= jsonb_array_length(v_assignment.quiz_snapshot -> 'questions') then
    raise exception 'invalid_answer' using errcode='PT400';
  end if;
  v_question := v_assignment.quiz_snapshot -> 'questions' -> p_position;
  if not private.valid_answer(v_question, p_answer) then raise exception 'invalid_answer' using errcode='PT400'; end if;
  insert into public.assignment_answers (attempt_id,position,answer) values (v_attempt.id,p_position,p_answer)
  on conflict (attempt_id,position) do update set answer=excluded.answer,saved_at=clock_timestamp(),is_correct=null;
end;
$$;

create function public.submit_assignment(p_token text)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare v_attempt public.assignment_attempts; v_assignment public.assignments; v_question jsonb; v_answer jsonb;
  v_correct boolean; v_total integer; v_count integer := 0;
begin
  select at.* into v_attempt from public.assignment_attempts at where at.token_digest=private.assignment_digest(p_token) for update;
  if not found or v_attempt.token_expires_at <= clock_timestamp() then raise exception 'attempt_not_found' using errcode='PT404'; end if;
  select * into v_assignment from public.assignments where id=v_attempt.assignment_id;
  if v_attempt.status='submitted' then
    return jsonb_build_object('submitted_at',v_attempt.submitted_at,'released',v_assignment.reveal_policy='immediate' or v_assignment.status='closed',
      'score',case when v_assignment.reveal_policy='immediate' or v_assignment.status='closed' then v_attempt.score else null end);
  end if;
  if v_attempt.status <> 'in_progress' or not private.assignment_is_open(v_assignment) then raise exception 'attempt_not_submittable' using errcode='PT409'; end if;
  v_total := jsonb_array_length(v_assignment.quiz_snapshot -> 'questions');
  for v_pos in 0 .. v_total - 1 loop
    v_question := v_assignment.quiz_snapshot -> 'questions' -> v_pos;
    select answer into v_answer from public.assignment_answers where attempt_id=v_attempt.id and position=v_pos;
    v_correct := v_answer is not null and private.is_answer_correct(v_question,v_answer);
    if v_correct then v_count := v_count + 1; end if;
    if v_answer is not null then update public.assignment_answers set is_correct=v_correct where attempt_id=v_attempt.id and position=v_pos; end if;
  end loop;
  update public.assignment_attempts set status='submitted',submitted_at=clock_timestamp(),score=v_count,correct_count=v_count,question_total=v_total where id=v_attempt.id returning * into v_attempt;
  return jsonb_build_object('submitted_at',v_attempt.submitted_at,'released',v_assignment.reveal_policy='immediate',
    'score',case when v_assignment.reveal_policy='immediate' then v_count else null end);
end;
$$;

create function public.reset_assignment_attempt(p_assignment uuid, p_student uuid)
returns void language plpgsql security definer set search_path = ''
as $$
declare v_owner uuid := (select auth.uid());
begin
  if v_owner is null then raise exception 'not_authenticated' using errcode='42501'; end if;
  perform 1 from public.assignments a join public.students s on s.class_id=a.class_id where a.id=p_assignment and a.owner_id=v_owner and s.id=p_student;
  if not found then raise exception 'assignment_or_student_not_found' using errcode='PT404'; end if;
  update public.assignment_attempts set status='invalidated',invalidated_at=clock_timestamp(),invalidated_reason='teacher_reset'
  where assignment_id=p_assignment and student_id=p_student and status in ('in_progress','submitted');
end;
$$;

create function public.assignment_progress(p_assignment uuid)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare v_owner uuid := (select auth.uid());
begin
  if v_owner is null then raise exception 'not_authenticated' using errcode='42501'; end if;
  perform 1 from public.assignments where id=p_assignment and owner_id=v_owner;
  if not found then raise exception 'assignment_not_found' using errcode='PT404'; end if;
  return jsonb_build_object('not_started',(select count(*) from public.students s join public.assignments a on a.class_id=s.class_id where a.id=p_assignment) -
    (select count(distinct student_id) from public.assignment_attempts where assignment_id=p_assignment and status <> 'invalidated'),
    'in_progress',(select count(*) from public.assignment_attempts where assignment_id=p_assignment and status='in_progress'),
    'submitted',(select count(*) from public.assignment_attempts where assignment_id=p_assignment and status='submitted'));
end;
$$;

revoke execute on function private.assignment_public_questions(jsonb) from public, anon, authenticated;
revoke execute on function public.assignment_student_state(text),public.save_assignment_answer(text,integer,jsonb),public.submit_assignment(text) from public;
grant execute on function public.assignment_student_state(text),public.save_assignment_answer(text,integer,jsonb),public.submit_assignment(text) to anon,authenticated;
revoke execute on function public.reset_assignment_attempt(uuid,uuid),public.assignment_progress(uuid) from public,anon;
grant execute on function public.reset_assignment_attempt(uuid,uuid),public.assignment_progress(uuid) to authenticated;

create function public.assignment_roster_results(p_assignment uuid)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare v_owner uuid := (select auth.uid());
begin
  if v_owner is null then raise exception 'not_authenticated' using errcode='42501'; end if;
  perform 1 from public.assignments where id=p_assignment and owner_id=v_owner;
  if not found then raise exception 'assignment_not_found' using errcode='PT404'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object(
    'student_id',s.id,'name',s.name,'attempt_status',at.status,'started_at',at.started_at,'submitted_at',at.submitted_at,
    'score',at.score,'correct',at.correct_count,'total',at.question_total
  ) order by s.position,s.created_at,s.id)
  from public.students s join public.assignments a on a.class_id=s.class_id
  left join lateral (select * from public.assignment_attempts x where x.assignment_id=p_assignment and x.student_id=s.id and x.status <> 'invalidated' order by x.started_at desc limit 1) at on true
  where a.id=p_assignment), '[]'::jsonb);
end;
$$;
revoke execute on function public.assignment_roster_results(uuid) from public,anon;
grant execute on function public.assignment_roster_results(uuid) to authenticated;
