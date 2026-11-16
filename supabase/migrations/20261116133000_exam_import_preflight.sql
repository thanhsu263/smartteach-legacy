create or replace function public.exam_import_preflight() returns jsonb language plpgsql stable security definer set search_path='' as $$
declare endpoint text; secret text;
begin
 perform private.require_active_user();
 select decrypted_secret into endpoint from vault.decrypted_secrets where name='smartteach_exam_worker_url' limit 1;
 select decrypted_secret into secret from vault.decrypted_secrets where name in ('smartteach_exam_worker_secret','smartteach_rag_worker_secret') and length(decrypted_secret)>=32 order by case when name='smartteach_exam_worker_secret' then 0 else 1 end limit 1;
 return jsonb_build_object('schedulerConfigured',coalesce(secret is not null and (endpoint ~ '^https://[^/?#]+/api/internal/exams/jobs/run$' or endpoint ~ '^http://host\.docker\.internal:[0-9]+/api/internal/exams/jobs/run$'),false),
 'lastRunAt',(select last_run_at from private.exam_import_scheduler where id),'credentialReady',exists(select 1 from private.ai_credentials where enabled and state='healthy'),'modelReady',exists(select 1 from private.ai_settings where id and chat_model is not null));
end $$;
create or replace function private.invoke_exam_import_worker() returns void language plpgsql security definer set search_path='' as $$
declare endpoint text; secret text; request bigint;
begin
 select decrypted_secret into endpoint from vault.decrypted_secrets where name='smartteach_exam_worker_url' limit 1;
 select decrypted_secret into secret from vault.decrypted_secrets where name in ('smartteach_exam_worker_secret','smartteach_rag_worker_secret') and length(decrypted_secret)>=32 order by case when name='smartteach_exam_worker_secret' then 0 else 1 end limit 1;
 if endpoint is null or secret is null then return; end if;
 if endpoint !~ '^https://[^/?#]+/api/internal/exams/jobs/run$' and endpoint !~ '^http://host\.docker\.internal:[0-9]+/api/internal/exams/jobs/run$' then return; end if;
 select net.http_post(url:=endpoint,headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||secret),body:='{}'::jsonb,timeout_milliseconds:=30000) into request;
 update private.exam_import_scheduler set last_dispatch_at=clock_timestamp(),request_id=request where id;
end $$;
