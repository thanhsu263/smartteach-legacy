-- Recheck at the actual answer write, including a deadline crossed while waiting for locks.
create function private.guard_exam_answer_deadline() returns trigger language plpgsql security definer set search_path='' as $$
declare at public.assignment_attempts; a public.assignments;
begin
 select * into at from public.assignment_attempts where id=new.attempt_id;
 select * into a from public.assignments where id=at.assignment_id;
 if a.snapshot_version=2 and (at.status<>'in_progress' or at.deadline_at<=clock_timestamp() or a.status<>'published') then raise exception 'attempt_not_editable' using errcode='PT409'; end if;
 return new;
end $$;
revoke all on function private.guard_exam_answer_deadline() from public,anon,authenticated;
create trigger exam_answer_deadline before insert or update of answer on public.assignment_answers for each row execute function private.guard_exam_answer_deadline();
