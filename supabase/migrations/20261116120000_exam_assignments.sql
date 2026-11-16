alter table public.assignments add column exam_id uuid references public.exams(id) on delete set null,
 add column snapshot_version integer not null default 1 check(snapshot_version in (1,2)),
 add column duration_seconds integer check(duration_seconds between 60 and 10800), add column exam_request_id uuid;
alter table public.assignments add constraint exam_assignment_duration check(snapshot_version=1 or duration_seconds is not null);
create unique index assignments_exam_request on public.assignments(owner_id,exam_request_id) where exam_request_id is not null;
alter table public.assignment_attempts add column deadline_at timestamptz, add column earned_point_units integer,
 add column max_point_units integer, add column finalization_reason text;
create index exam_attempt_deadline on public.assignment_attempts(deadline_at) where status='in_progress' and deadline_at is not null;

create or replace function public.forbid_assignment_identity_change() returns trigger language plpgsql set search_path='' as $$
begin
 if new.owner_id is distinct from old.owner_id or new.class_id is distinct from old.class_id
 or (new.quiz_id is distinct from old.quiz_id and not(old.quiz_id is not null and new.quiz_id is null))
 or (new.exam_id is distinct from old.exam_id and not(old.exam_id is not null and new.exam_id is null))
 or new.quiz_snapshot is distinct from old.quiz_snapshot or new.public_code is distinct from old.public_code
 or new.snapshot_version is distinct from old.snapshot_version or new.duration_seconds is distinct from old.duration_seconds
 or new.exam_request_id is distinct from old.exam_request_id then raise exception 'assignment_identity_change_forbidden' using errcode='23514'; end if;
 return new;
end $$;

create function public.create_exam_assignment(p_exam uuid,p_revision integer,p_class uuid,p_title text,p_description text default '',p_opens_at timestamptz default null,p_due_at timestamptz default null,p_reveal_policy text default 'after_close',p_request uuid default null)
returns uuid language plpgsql security definer set search_path='' as $$
declare e public.exams; existing public.assignments; snapshot jsonb; questions jsonb; result uuid; code text;
begin
 perform private.require_active_user();
 if auth.uid() is null then raise exception 'not_authenticated' using errcode='42501'; end if;
 if not private.has_premium(auth.uid()) then raise exception 'premium_required' using errcode='PT402'; end if;
 if p_title is null or length(btrim(p_title)) not between 1 and 100 or p_description is null or length(p_description)>1000 or p_request is null or p_reveal_policy is null or p_reveal_policy not in ('immediate','after_close') or (p_due_at is not null and p_due_at<=coalesce(p_opens_at,clock_timestamp())) then raise exception 'assignment_schedule_invalid' using errcode='PT400'; end if;
 perform pg_advisory_xact_lock(hashtextextended('assignment-create:'||auth.uid()::text,0));
 select * into existing from public.assignments where owner_id=auth.uid() and exam_request_id=p_request;
 if found then
  if existing.exam_id is distinct from p_exam or existing.class_id is distinct from p_class or existing.quiz_snapshot->>'sourceRevision' is distinct from p_revision::text or existing.title is distinct from btrim(p_title) or existing.description is distinct from p_description or existing.opens_at is distinct from p_opens_at or existing.due_at is distinct from p_due_at or existing.reveal_policy is distinct from p_reveal_policy then raise exception 'request_conflict' using errcode='PT409'; end if;
  return existing.id;
 end if;
 perform 1 from public.classes where id=p_class and owner_id=auth.uid(); if not found then raise exception 'class_not_found' using errcode='PT404'; end if;
 select * into e from public.exams where id=p_exam and owner_id=auth.uid() for share; if not found then raise exception 'exam_not_found' using errcode='PT404'; end if;
 if p_revision is null or e.revision<>p_revision then raise exception 'version_conflict' using errcode='PT409'; end if;
 perform private.validate_exam_document(e.document,true);
 select jsonb_agg(q.value||jsonb_build_object('section_title',s.value->>'title','time_limit_seconds',0) order by s.ordinality,q.ordinality) into questions from jsonb_array_elements(e.document->'sections') with ordinality s cross join lateral jsonb_array_elements(s.value->'questions') with ordinality q;
 snapshot:=jsonb_build_object('schemaVersion',2,'title',e.title,'sourceRevision',e.revision,'sections',e.document->'sections','questions',questions,'durationMinutes',e.document->'durationMinutes');
 for i in 1..20 loop
  code:=upper(encode(extensions.gen_random_bytes(5),'hex'));
  begin
   insert into public.assignments(owner_id,class_id,exam_id,title,description,quiz_snapshot,snapshot_version,duration_seconds,exam_request_id,public_code,opens_at,due_at,reveal_policy)
   values(auth.uid(),p_class,e.id,btrim(p_title),p_description,snapshot,2,(e.document->>'durationMinutes')::integer*60,p_request,code,p_opens_at,p_due_at,p_reveal_policy) returning id into result;
   return result;
  exception when unique_violation then if i=20 then raise; end if;
  end;
 end loop;
 raise exception 'assignment_unavailable' using errcode='PT503';
end $$;
revoke all on function public.create_exam_assignment(uuid,integer,uuid,text,text,timestamptz,timestamptz,text,uuid) from public,anon;
grant execute on function public.create_exam_assignment(uuid,integer,uuid,text,text,timestamptz,timestamptz,text,uuid) to authenticated;

-- Retain version-1 behavior behind private functions; never leave a public legacy bypass.
alter function public.exchange_assignment_access(text,text) set schema private;
alter function private.exchange_assignment_access(text,text) rename to legacy_exchange_assignment_access;
alter function public.assignment_student_state(text) set schema private;
alter function private.assignment_student_state(text) rename to legacy_assignment_student_state;
alter function public.save_assignment_answer(text,integer,jsonb) set schema private;
alter function private.save_assignment_answer(text,integer,jsonb) rename to legacy_save_assignment_answer;
alter function public.submit_assignment(text) set schema private;
alter function private.submit_assignment(text) rename to legacy_submit_assignment;
alter function public.close_assignment(uuid) set schema private;
alter function private.close_assignment(uuid) rename to legacy_close_assignment;
alter function public.assignment_detail(uuid) set schema private;
alter function private.assignment_detail(uuid) rename to legacy_assignment_detail;
alter function public.assignment_roster_results(uuid) set schema private;
alter function private.assignment_roster_results(uuid) rename to legacy_assignment_roster_results;
alter function public.assignment_attempt_detail(uuid,uuid) set schema private;
alter function private.assignment_attempt_detail(uuid,uuid) rename to legacy_assignment_attempt_detail;
alter function public.assignment_progress(uuid) set schema private;
alter function private.assignment_progress(uuid) rename to legacy_assignment_progress;
revoke all on function private.legacy_exchange_assignment_access(text,text),private.legacy_assignment_student_state(text),private.legacy_save_assignment_answer(text,integer,jsonb),private.legacy_submit_assignment(text),private.legacy_close_assignment(uuid),private.legacy_assignment_detail(uuid),private.legacy_assignment_roster_results(uuid),private.legacy_assignment_attempt_detail(uuid,uuid),private.legacy_assignment_progress(uuid) from public,anon,authenticated;

create function private.finalize_exam_attempt(p_assignment uuid,p_attempt uuid,p_reason text)
returns void language plpgsql security definer set search_path='' as $$
declare a public.assignments; at public.assignment_attempts; q jsonb; answer jsonb; correct boolean; count_correct integer:=0; earned integer:=0; maximum integer:=0; total integer;
begin
 select * into a from public.assignments where id=p_assignment for update;
 if not found or a.snapshot_version<>2 then return; end if;
 select * into at from public.assignment_attempts where id=p_attempt and assignment_id=a.id for update;
 if not found or at.status<>'in_progress' then return; end if;
 if p_reason='deadline' and (at.deadline_at is null or clock_timestamp()<at.deadline_at) then return; end if;
 if p_reason not in ('manual','deadline','closed') then raise exception 'invalid_finalization'; end if;
 total:=jsonb_array_length(a.quiz_snapshot->'questions');
 for i in 0..total-1 loop
  q:=a.quiz_snapshot->'questions'->i;
  select aa.answer into answer from public.assignment_answers aa where aa.attempt_id=at.id and position=i;
  correct:=answer is not null and private.is_answer_correct(q,answer);
  maximum:=maximum+(q->>'pointUnits')::integer;
  if correct then count_correct:=count_correct+1; earned:=earned+(q->>'pointUnits')::integer; end if;
  if answer is not null then update public.assignment_answers set is_correct=correct where attempt_id=at.id and position=i; end if;
 end loop;
 update public.assignment_attempts set status='submitted', submitted_at=case when p_reason='deadline' then at.deadline_at else clock_timestamp() end,
 score=count_correct,correct_count=count_correct,question_total=total,earned_point_units=earned,max_point_units=maximum,finalization_reason=p_reason where id=at.id;
end $$;
revoke all on function private.finalize_exam_attempt(uuid,uuid,text) from public,anon,authenticated;

create function public.exchange_assignment_access(p_code text,p_credential text) returns jsonb language plpgsql security definer set search_path='' as $$
declare a public.assignments; r jsonb; at public.assignment_attempts;
begin
 select * into a from public.assignments where public_code=upper(btrim(coalesce(p_code,'')));
 if not found or a.snapshot_version=1 then return private.legacy_exchange_assignment_access(p_code,p_credential); end if;
 -- Lock the assignment before the credential/attempt locks acquired by the legacy implementation.
 select * into a from public.assignments where id=a.id for update;
 r:=private.legacy_exchange_assignment_access(p_code,p_credential);
 if r->>'result'<>'ok' then return r; end if;
 select * into at from public.assignment_attempts where id=(r->>'attempt_id')::uuid for update;
 update public.assignment_attempts set deadline_at=coalesce(deadline_at,least(started_at+make_interval(secs=>a.duration_seconds),coalesce(a.due_at,'infinity'::timestamptz))),token_expires_at=clock_timestamp()+interval '30 days' where id=at.id returning * into at;
 if at.status='in_progress' and at.deadline_at<=clock_timestamp() then perform private.finalize_exam_attempt(a.id,at.id,'deadline'); end if;
 return r||jsonb_build_object('expires_at',at.token_expires_at);
end $$;

create function public.assignment_student_state(p_token text) returns jsonb language plpgsql security definer set search_path='' as $$
declare at public.assignment_attempts; a public.assignments; r jsonb; questions jsonb;
begin
 select * into at from public.assignment_attempts where token_digest=private.assignment_digest(p_token) and token_expires_at>clock_timestamp();
 if not found then raise exception 'attempt_not_found' using errcode='PT404'; end if;
 select * into a from public.assignments where id=at.assignment_id;
 if a.snapshot_version=1 then return private.legacy_assignment_student_state(p_token); end if;
 select * into a from public.assignments where id=a.id for update;
 if a.status='closed' then perform private.finalize_exam_attempt(a.id,at.id,'closed'); else perform private.finalize_exam_attempt(a.id,at.id,'deadline'); end if;
 r:=private.legacy_assignment_student_state(p_token);
 select * into at from public.assignment_attempts where id=at.id;
 select jsonb_agg(q.value||jsonb_build_object('section_title',a.quiz_snapshot->'questions'->(q.ordinality::integer-1)->>'section_title','points',((a.quiz_snapshot->'questions'->(q.ordinality::integer-1)->>'pointUnits')::numeric/100)) order by q.ordinality) into questions from jsonb_array_elements(r->'questions') with ordinality q;
 if r->'result'<>'null'::jsonb then r:=jsonb_set(r,'{result}',r->'result'||jsonb_build_object('score_points',at.earned_point_units::numeric/100,'max_points',at.max_point_units::numeric/100)); end if;
 return r||jsonb_build_object('deadline_at',at.deadline_at,'server_now',clock_timestamp(),'snapshot_version',2,'questions',questions);
end $$;

create function public.save_assignment_answer(p_token text,p_position integer,p_answer jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare at public.assignment_attempts; a public.assignments;
begin
 select * into at from public.assignment_attempts where token_digest=private.assignment_digest(p_token);
 if not found then raise exception 'attempt_not_found' using errcode='PT404'; end if;
 select * into a from public.assignments where id=at.assignment_id;
 if a.snapshot_version=1 then perform private.legacy_save_assignment_answer(p_token,p_position,p_answer); return jsonb_build_object('saved',true); end if;
 select * into a from public.assignments where id=a.id for update;
 select * into at from public.assignment_attempts where id=at.id and token_digest=private.assignment_digest(p_token) for update;
 if not found or at.token_expires_at<=clock_timestamp() then raise exception 'attempt_not_found' using errcode='PT404'; end if;
 if a.status='closed' then perform private.finalize_exam_attempt(a.id,at.id,'closed'); return jsonb_build_object('saved',false,'reason','closed'); end if;
 if at.status<>'in_progress' then return jsonb_build_object('saved',false,'reason','submitted'); end if;
 if at.deadline_at<=clock_timestamp() then perform private.finalize_exam_attempt(a.id,at.id,'deadline'); return jsonb_build_object('saved',false,'reason','deadline'); end if;
 perform private.legacy_save_assignment_answer(p_token,p_position,p_answer);
 return jsonb_build_object('saved',true);
end $$;

create function public.submit_assignment(p_token text) returns jsonb language plpgsql security definer set search_path='' as $$
declare at public.assignment_attempts; a public.assignments; r jsonb;
begin
 select * into at from public.assignment_attempts where token_digest=private.assignment_digest(p_token) and token_expires_at>clock_timestamp();
 if not found then raise exception 'attempt_not_found' using errcode='PT404'; end if;
 select * into a from public.assignments where id=at.assignment_id;
 if a.snapshot_version=1 then return private.legacy_submit_assignment(p_token); end if;
 select * into a from public.assignments where id=a.id for update;
 select * into at from public.assignment_attempts where id=at.id and token_digest=private.assignment_digest(p_token) for update;
 if not found or at.token_expires_at<=clock_timestamp() then raise exception 'attempt_not_found' using errcode='PT404'; end if;
 if at.status='invalidated' then raise exception 'attempt_not_submittable' using errcode='PT409'; end if;
 perform private.finalize_exam_attempt(a.id,at.id,case when a.status='closed' then 'closed' when at.deadline_at<=clock_timestamp() then 'deadline' else 'manual' end);
 r:=public.assignment_student_state(p_token);
 return jsonb_build_object('submitted_at',r->'submitted_at','released',r->'result'<>'null'::jsonb,'score',r->'result'->'score','score_points',r->'result'->'score_points','max_points',r->'result'->'max_points');
end $$;

create function private.finalize_owner_exam_assignment(p_assignment uuid) returns void language plpgsql security definer set search_path='' as $$
declare a public.assignments; at record;
begin
 perform private.require_active_user();
 select * into a from public.assignments where id=p_assignment and owner_id=auth.uid() for update;
 if not found or a.snapshot_version<>2 then return; end if;
 for at in select id from public.assignment_attempts where assignment_id=a.id and status='in_progress' loop
  perform private.finalize_exam_attempt(a.id,at.id,case when a.status='closed' then 'closed' else 'deadline' end);
 end loop;
end $$;
revoke all on function private.finalize_owner_exam_assignment(uuid) from public,anon,authenticated;
create function public.close_assignment(p_assignment uuid) returns void language plpgsql security definer set search_path='' as $$
begin perform private.legacy_close_assignment(p_assignment); perform private.finalize_owner_exam_assignment(p_assignment); end $$;
create function public.assignment_detail(p_assignment uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare r jsonb; a public.assignments;
begin r:=private.legacy_assignment_detail(p_assignment); select * into a from public.assignments where id=p_assignment; return r||jsonb_build_object('snapshot_version',a.snapshot_version,'exam_id',a.exam_id,'duration_seconds',a.duration_seconds); end $$;
create function private.exam_student_points(p_assignment uuid,p_student uuid) returns jsonb language sql stable security definer set search_path='' as $$
 select case when a.snapshot_version=2 then jsonb_build_object('score_points',at.earned_point_units::numeric/100,'max_points',coalesce(at.max_point_units,(select sum((q->>'pointUnits')::integer) from jsonb_array_elements(a.quiz_snapshot->'questions')q))::numeric/100,'deadline_at',at.deadline_at) else '{}'::jsonb end
 from public.assignments a left join lateral(select * from public.assignment_attempts x where x.assignment_id=a.id and x.student_id=p_student and x.status<>'invalidated' order by started_at desc,id desc limit 1)at on true where a.id=p_assignment;
$$;
revoke all on function private.exam_student_points(uuid,uuid) from public,anon,authenticated;
create function public.assignment_roster_results(p_assignment uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare r jsonb;
begin r:=private.legacy_assignment_roster_results(p_assignment); perform private.finalize_owner_exam_assignment(p_assignment); r:=private.legacy_assignment_roster_results(p_assignment);
 return coalesce((select jsonb_agg(q||private.exam_student_points(p_assignment,(q->>'student_id')::uuid) order by ordinality) from jsonb_array_elements(r) with ordinality t(q,ordinality)),'[]'::jsonb);
end $$;
create function public.assignment_attempt_detail(p_assignment uuid,p_student uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare r jsonb;
begin r:=private.legacy_assignment_attempt_detail(p_assignment,p_student); perform private.finalize_owner_exam_assignment(p_assignment); return private.legacy_assignment_attempt_detail(p_assignment,p_student)||private.exam_student_points(p_assignment,p_student); end $$;
create function public.assignment_progress(p_assignment uuid) returns jsonb language plpgsql security definer set search_path='' as $$
begin perform private.legacy_assignment_progress(p_assignment); perform private.finalize_owner_exam_assignment(p_assignment); return private.legacy_assignment_progress(p_assignment); end $$;

revoke all on function public.exchange_assignment_access(text,text),public.assignment_student_state(text),public.save_assignment_answer(text,integer,jsonb),public.submit_assignment(text) from public;
grant execute on function public.exchange_assignment_access(text,text),public.assignment_student_state(text),public.save_assignment_answer(text,integer,jsonb),public.submit_assignment(text) to anon,authenticated;
revoke all on function public.close_assignment(uuid),public.assignment_detail(uuid),public.assignment_roster_results(uuid),public.assignment_attempt_detail(uuid,uuid),public.assignment_progress(uuid) from public,anon;
grant execute on function public.close_assignment(uuid),public.assignment_detail(uuid),public.assignment_roster_results(uuid),public.assignment_attempt_detail(uuid,uuid),public.assignment_progress(uuid) to authenticated;
