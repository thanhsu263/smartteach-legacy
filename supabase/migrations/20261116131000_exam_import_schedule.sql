create function private.invoke_exam_import_worker() returns void language plpgsql security definer set search_path='' as $$
declare endpoint text; secret text; request bigint;
begin
 select decrypted_secret into endpoint from vault.decrypted_secrets where name='smartteach_exam_worker_url' limit 1;
 select decrypted_secret into secret from vault.decrypted_secrets where name in ('smartteach_exam_worker_secret','smartteach_rag_worker_secret') order by case when name='smartteach_exam_worker_secret' then 0 else 1 end limit 1;
 if endpoint is null or secret is null or length(secret)<32 then return; end if;
 if endpoint !~ '^https://[^/?#]+/api/internal/exams/jobs/run$' and endpoint !~ '^http://host\.docker\.internal:[0-9]+/api/internal/exams/jobs/run$' then return; end if;
 select net.http_post(url:=endpoint,headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||secret),body:='{}'::jsonb,timeout_milliseconds:=30000) into request;
 update private.exam_import_scheduler set last_dispatch_at=clock_timestamp(),request_id=request where id;
end $$;
revoke all on function private.invoke_exam_import_worker() from public,anon,authenticated;
select cron.schedule('smartteach-exam-import','* * * * *','select private.invoke_exam_import_worker();');
create function public.admin_exam_import_operations() returns jsonb language plpgsql stable security definer set search_path='' as $$
begin perform private.require_admin(); return jsonb_build_object('heartbeat',(select last_run_at from private.exam_import_scheduler where id),'jobs',coalesce((select jsonb_object_agg(status,n) from(select status,count(*)n from private.exam_import_jobs group by status)s),'{}'::jsonb),'finalizer',(select last_run_at from private.exam_finalizer_state where id)); end $$;
revoke all on function public.admin_exam_import_operations() from public,anon;
grant execute on function public.admin_exam_import_operations() to authenticated;
