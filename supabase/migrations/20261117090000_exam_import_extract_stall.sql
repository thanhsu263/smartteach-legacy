-- Bound extraction re-claims: a worker that dies or times out while extracting never checkpoints,
-- so without this the lease expiry would re-claim the same cursor every minute until the 24h expiry.
-- The counter is per cursor, so batched PDF extraction that keeps advancing is not penalised.
alter table private.exam_import_jobs
 add column extract_claims integer not null default 0 check(extract_claims between 0 and 3),
 add column extract_claim_cursor integer;
create or replace function public.exam_import_claim() returns jsonb language plpgsql security definer set search_path='' as $$
declare j private.exam_import_jobs; task text;
begin
 if auth.role() is distinct from 'service_role' then raise exception 'not_authorized' using errcode='42501'; end if;
 update private.exam_import_scheduler set last_run_at=clock_timestamp() where id;
 delete from private.exam_import_jobs where id in(select id from private.exam_import_jobs where path is null and created_at<clock_timestamp()-interval '7 days' limit 100);
 select * into j from private.exam_import_jobs where (lease_until is null or lease_until<clock_timestamp()) and
 ((path is not null and (status in ('applied','cancelled','failed','expired') or expires_at<=clock_timestamp() or owner_id is null)) or (status in ('queued','extracting','generating','waiting_quota') and not_before<=clock_timestamp() and expires_at>clock_timestamp()))
 order by case when expires_at<=clock_timestamp() or status in ('applied','cancelled','failed','expired') then 0 else 1 end,created_at limit 1 for update skip locked;
 if not found then return null; end if;
 if j.expires_at<=clock_timestamp() or j.owner_id is null then
  update private.exam_import_jobs set status=case when status in ('applied','cancelled') then status else 'expired' end where id=j.id returning * into j;
 end if;
 if j.status in ('applied','cancelled','failed','expired') then task:='cleanup';
 else
  if exists(select 1 from private.account_controls where user_id=j.owner_id and status='blocked') or not private.has_premium(j.owner_id) then
   update private.exam_import_jobs set status='failed',error_code='owner_unavailable' where id=j.id returning * into j; task:='cleanup';
  elsif j.stage='generate' and j.attempts>=2 then update private.exam_import_jobs set status='failed',error_code='attempt_budget_exhausted' where id=j.id returning * into j; task:='cleanup';
  elsif j.stage='extract' and j.extract_claim_cursor=j.cursor and j.extract_claims>=3 then
   update private.exam_import_jobs set status='failed',error_code='unsupported_file' where id=j.id returning * into j; task:='cleanup';
  else task:=j.stage;
   update private.exam_import_jobs set status=case when task='extract' then 'extracting' else 'generating' end,
    extract_claims=case when task<>'extract' then extract_claims when extract_claim_cursor=cursor then extract_claims+1 else 1 end,
    extract_claim_cursor=case when task='extract' then cursor else extract_claim_cursor end
   where id=j.id returning * into j;
  end if;
 end if;
 update private.exam_import_jobs set lease_token=gen_random_uuid(),lease_until=clock_timestamp()+interval '45 seconds',updated_at=clock_timestamp() where id=j.id returning * into j;
 return jsonb_build_object('task',task,'job',to_jsonb(j));
end $$;
revoke all on function public.exam_import_claim() from public,anon,authenticated;
grant execute on function public.exam_import_claim() to service_role;
