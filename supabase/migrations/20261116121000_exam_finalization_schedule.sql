create table private.exam_finalizer_state(id boolean primary key default true check(id),last_run_at timestamptz,last_count integer not null default 0);
insert into private.exam_finalizer_state(id)values(true);
revoke all on private.exam_finalizer_state from public,anon,authenticated;
create function private.finalize_due_exam_attempts() returns integer language plpgsql security definer set search_path='' as $$
declare r record; n integer:=0;
begin
 for r in select a.id as assignment,at.id as attempt from public.assignments a join public.assignment_attempts at on at.assignment_id=a.id
 where a.snapshot_version=2 and at.status='in_progress' and at.deadline_at<=clock_timestamp() order by at.deadline_at,at.id limit 100 for update of a skip locked loop
  perform private.finalize_exam_attempt(r.assignment,r.attempt,'deadline'); n:=n+1;
 end loop;
 update private.exam_finalizer_state set last_run_at=clock_timestamp(),last_count=n where id;
 return n;
end $$;
revoke all on function private.finalize_due_exam_attempts() from public,anon,authenticated;
select cron.schedule('smartteach-exam-finalize','* * * * *','select private.finalize_due_exam_attempts();');
