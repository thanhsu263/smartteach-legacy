create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron;
alter table private.rag_scheduler_state add column last_dispatch_at timestamptz;
alter table private.rag_scheduler_state add column request_id bigint;
create function private.invoke_rag_worker() returns void language plpgsql security definer set search_path='' as $$
declare endpoint text;secret text;request bigint;
begin
 select decrypted_secret into endpoint from vault.decrypted_secrets where name='smartteach_rag_worker_url' limit 1;
 select decrypted_secret into secret from vault.decrypted_secrets where name='smartteach_rag_worker_secret' limit 1;
 if endpoint is null or secret is null or length(secret)<32 then
  update private.rag_scheduler_state set last_result='scheduler_not_configured' where id;return;
 end if;
 if endpoint !~ '^https://[^/?#]+/api/internal/rag/jobs/run$' and endpoint !~ '^http://host\.docker\.internal:[0-9]+/api/internal/rag/jobs/run$' then
  update private.rag_scheduler_state set last_result='scheduler_url_invalid' where id;return;
 end if;
 select net.http_post(url:=endpoint,headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||secret),body:='{}'::jsonb,timeout_milliseconds:=30000) into request;
 update private.rag_scheduler_state set last_dispatch_at=now(),request_id=request where id;
end;
$$;
revoke all on function private.invoke_rag_worker() from public,anon,authenticated;
select cron.schedule('smartteach-rag-worker','* * * * *','select private.invoke_rag_worker();');
create function public.admin_rag_preflight() returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 perform private.require_admin();
 return jsonb_build_object('schedulerConfigured',
  exists(select 1 from vault.decrypted_secrets where name='smartteach_rag_worker_url') and exists(select 1 from vault.decrypted_secrets where name='smartteach_rag_worker_secret'),
 'lastRunAt',(select last_run_at from private.rag_scheduler_state where id),
 'lastResult',(select last_result from private.rag_scheduler_state where id),
 'credentialReady',exists(select 1 from private.ai_credentials where enabled and state='healthy'));
end;
$$;
revoke all on function public.admin_rag_preflight() from public,anon;
grant execute on function public.admin_rag_preflight() to authenticated;
