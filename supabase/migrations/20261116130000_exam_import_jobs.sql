insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('exam-imports','exam-imports',false,2097152,array['application/pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','text/csv','application/octet-stream']) on conflict(id) do nothing;
create table private.exam_import_jobs(
 id uuid primary key default gen_random_uuid(),owner_id uuid references auth.users(id) on delete set null,request_id uuid not null,
 title text not null,format text not null check(format in ('docx','pdf','xlsx','csv')),bytes integer not null check(bytes between 1 and 2097152),path text,
 hash text,status text not null default 'reserved' check(status in ('reserved','queued','extracting','generating','waiting_quota','needs_review','applied','failed','cancelled','expired')),
 stage text not null default 'extract' check(stage in ('extract','generate')),cursor integer not null default 0,
 sections jsonb not null default '[]',text_chars integer not null default 0 check(text_chars between 0 and 100000),result jsonb,
 attempts integer not null default 0 check(attempts between 0 and 2),lease_token uuid,lease_until timestamptz,not_before timestamptz not null default clock_timestamp(),
 model text not null,settings_version integer not null,error_code text,applied_exam_id uuid references public.exams(id) on delete set null,
 created_at timestamptz not null default clock_timestamp(),expires_at timestamptz not null default clock_timestamp()+interval '24 hours',updated_at timestamptz not null default clock_timestamp(),unique(owner_id,request_id)
);
create index exam_import_owner_created on private.exam_import_jobs(owner_id,created_at desc);
create index exam_import_pending on private.exam_import_jobs(not_before,created_at) where status in ('queued','extracting','generating','waiting_quota');
create table private.exam_import_scheduler(id boolean primary key default true check(id),last_run_at timestamptz,last_dispatch_at timestamptz,request_id bigint);
insert into private.exam_import_scheduler(id) values(true);
revoke all on private.exam_import_jobs,private.exam_import_scheduler from public,anon,authenticated;
alter table private.exam_import_jobs enable row level security;
create function public.exam_import_preflight() returns jsonb language plpgsql stable security definer set search_path='' as $$
begin perform private.require_active_user();
 return jsonb_build_object('schedulerConfigured',exists(select 1 from vault.decrypted_secrets where name='smartteach_exam_worker_url') and exists(select 1 from vault.decrypted_secrets where name in ('smartteach_exam_worker_secret','smartteach_rag_worker_secret')),
 'lastRunAt',(select last_run_at from private.exam_import_scheduler where id),'credentialReady',exists(select 1 from private.ai_credentials where enabled and state='healthy'),'modelReady',exists(select 1 from private.ai_settings where id and chat_model is not null));
end $$;
create function private.exam_import_dto(j private.exam_import_jobs) returns jsonb language sql stable set search_path='' as $$
 select jsonb_build_object('id',j.id,'title',j.title,'format',j.format,'status',case when j.expires_at<=clock_timestamp() and j.status not in ('applied','cancelled') then 'expired' else j.status end,'cursor',j.cursor,'createdAt',j.created_at,'expiresAt',j.expires_at,'errorCode',j.error_code,'examId',j.applied_exam_id,'preview',case when j.expires_at>clock_timestamp() and j.status='needs_review' then j.result else null end);
$$;
revoke all on function private.exam_import_dto(private.exam_import_jobs) from public,anon,authenticated;
create function public.exam_import_list() returns jsonb language plpgsql stable security definer set search_path='' as $$
begin perform private.require_active_user(); return jsonb_build_object('items',coalesce((select jsonb_agg(private.exam_import_dto(j)) from (select * from private.exam_import_jobs where owner_id=auth.uid() order by created_at desc limit 20)j),'[]'::jsonb)); end $$;
create function public.reserve_exam_import(p_request uuid,p_title text,p_format text,p_bytes integer,p_consent boolean) returns jsonb language plpgsql security definer set search_path='' as $$
declare j private.exam_import_jobs; ready jsonb; model text; version integer;
begin
 perform private.require_active_user(); if auth.uid() is null then raise exception 'not_authenticated' using errcode='42501'; end if;
 if not private.has_premium(auth.uid()) then raise exception 'premium_required' using errcode='PT402'; end if;
 if p_request is null or p_title is null or length(btrim(p_title)) not between 1 and 100 or p_format is null or p_format not in ('docx','pdf','xlsx','csv') or p_bytes is null or p_bytes not between 1 and 2097152 or p_consent is distinct from true then raise exception 'exam_import_invalid' using errcode='PT400'; end if;
 perform pg_advisory_xact_lock(hashtextextended('exam-import:'||auth.uid()::text,0));
 select * into j from private.exam_import_jobs where owner_id=auth.uid() and request_id=p_request;
 if found then
  if j.title is distinct from btrim(p_title) or j.format is distinct from p_format or j.bytes is distinct from p_bytes then raise exception 'request_conflict' using errcode='PT409'; end if;
  if j.status<>'reserved' or j.expires_at<=clock_timestamp() then return private.exam_import_dto(j); end if;
  return private.exam_import_dto(j)||jsonb_build_object('path',j.path);
 end if;
 ready:=public.exam_import_preflight();
 if (ready->>'schedulerConfigured')::boolean is distinct from true or (ready->>'credentialReady')::boolean is distinct from true or (ready->>'modelReady')::boolean is distinct from true or coalesce((ready->>'lastRunAt')::timestamptz,'epoch'::timestamptz)<clock_timestamp()-interval '3 minutes' then raise exception 'exam_worker_not_ready' using errcode='PT503'; end if;
 if exists(select 1 from private.exam_import_jobs where owner_id=auth.uid() and status in ('reserved','queued','extracting','generating','waiting_quota','needs_review') and expires_at>clock_timestamp()) then raise exception 'exam_import_busy' using errcode='PT409'; end if;
 if (select count(*) from private.exam_import_jobs where owner_id=auth.uid() and (created_at at time zone 'Asia/Ho_Chi_Minh')::date=(clock_timestamp() at time zone 'Asia/Ho_Chi_Minh')::date)>=3 then raise exception 'exam_import_daily_cap' using errcode='PT429'; end if;
 select chat_model,s.version into model,version from private.ai_settings s where s.id;
 insert into private.exam_import_jobs(owner_id,request_id,title,format,bytes,model,settings_version) values(auth.uid(),p_request,btrim(p_title),p_format,p_bytes,model,version) returning * into j;
 update private.exam_import_jobs set path=auth.uid()::text||'/'||j.id::text||'.'||p_format where id=j.id returning * into j;
 return private.exam_import_dto(j)||jsonb_build_object('path',j.path);
end $$;
create function public.exam_import_owned(p_id uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare j private.exam_import_jobs;
begin perform private.require_active_user(); select * into j from private.exam_import_jobs where id=p_id and owner_id=auth.uid(); if not found then raise exception 'exam_import_not_found' using errcode='PT404'; end if; return private.exam_import_dto(j); end $$;
create function public.control_exam_import(p_id uuid,p_action text) returns jsonb language plpgsql security definer set search_path='' as $$
declare j private.exam_import_jobs;
begin
 perform private.require_active_user(); select * into j from private.exam_import_jobs where id=p_id and owner_id=auth.uid() for update; if not found then raise exception 'exam_import_not_found' using errcode='PT404'; end if;
 if p_action='cancel' then
  if j.status<>'applied' then update private.exam_import_jobs set status='cancelled',lease_token=null,lease_until=null,not_before=clock_timestamp(),updated_at=clock_timestamp() where id=j.id returning * into j; end if;
 elsif p_action='retry' then
  if not private.has_premium(auth.uid()) then raise exception 'premium_required' using errcode='PT402'; end if;
  if j.expires_at<=clock_timestamp() or j.attempts>=2 or j.status not in ('failed','waiting_quota') or j.error_code not in ('provider_unavailable','waiting_quota') then raise exception 'exam_import_not_retryable' using errcode='PT409'; end if;
  if j.not_before>clock_timestamp() then raise exception 'exam_import_wait' using errcode='PT429'; end if;
  update private.exam_import_jobs set status='queued',lease_token=null,lease_until=null,error_code=null,updated_at=clock_timestamp() where id=j.id returning * into j;
 else raise exception 'exam_import_invalid' using errcode='PT400'; end if;
 return private.exam_import_dto(j);
end $$;
create function public.exam_import_upload_target(p_id uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare j private.exam_import_jobs;
begin perform private.require_active_user(); if not private.has_premium(auth.uid()) then raise exception 'premium_required' using errcode='PT402'; end if;
 select * into j from private.exam_import_jobs where id=p_id and owner_id=auth.uid() and expires_at>clock_timestamp() and status='reserved'; if not found then raise exception 'exam_import_not_found' using errcode='PT404'; end if;
 return jsonb_build_object('path',j.path,'format',j.format,'bytes',j.bytes);
end $$;
create function public.complete_exam_import(p_id uuid,p_hash text) returns jsonb language plpgsql security definer set search_path='' as $$
declare j private.exam_import_jobs;
begin perform private.require_active_user(); if not private.has_premium(auth.uid()) then raise exception 'premium_required' using errcode='PT402'; end if;
 select * into j from private.exam_import_jobs where id=p_id and owner_id=auth.uid() and expires_at>clock_timestamp() for update;
 if not found then raise exception 'exam_import_not_found' using errcode='PT404'; end if;
 if j.hash=p_hash and j.status<>'reserved' then return private.exam_import_dto(j); end if;
 if j.status<>'reserved' or p_hash is null or p_hash !~ '^[a-f0-9]{64}$' then raise exception 'exam_import_invalid' using errcode='PT409'; end if;
 if not exists(select 1 from storage.objects where bucket_id='exam-imports' and name=j.path and (metadata->>'size')::bigint=j.bytes) then raise exception 'exam_import_upload_missing' using errcode='PT409'; end if;
 update private.exam_import_jobs set hash=p_hash,status='queued',updated_at=clock_timestamp() where id=j.id returning * into j;
 return private.exam_import_dto(j);
end $$;

create function public.exam_import_claim() returns jsonb language plpgsql security definer set search_path='' as $$
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
  else task:=j.stage; update private.exam_import_jobs set status=case when task='extract' then 'extracting' else 'generating' end where id=j.id returning * into j;
  end if;
 end if;
 update private.exam_import_jobs set lease_token=gen_random_uuid(),lease_until=clock_timestamp()+interval '45 seconds',updated_at=clock_timestamp() where id=j.id returning * into j;
 return jsonb_build_object('task',task,'job',to_jsonb(j));
end $$;
create function public.exam_import_reserve_attempt(p_id uuid,p_lease uuid) returns void language plpgsql security definer set search_path='' as $$
declare j private.exam_import_jobs;
begin
 if auth.role() is distinct from 'service_role' then raise exception 'not_authorized' using errcode='42501'; end if;
 select * into j from private.exam_import_jobs where id=p_id and lease_token=p_lease and lease_until>clock_timestamp() and expires_at>clock_timestamp() and status='generating' for update;
 if not found then raise exception 'lease_lost' using errcode='PT409'; end if;
 if j.attempts>=2 then raise exception 'attempt_budget_exhausted' using errcode='PT409'; end if;
 if not private.has_premium(j.owner_id) or exists(select 1 from private.account_controls where user_id=j.owner_id and status='blocked') or not exists(select 1 from private.ai_settings where id and chat_model is not null) then raise exception 'owner_unavailable' using errcode='PT403'; end if;
 update private.exam_import_jobs set attempts=attempts+1 where id=j.id;
end $$;
create function public.exam_import_checkpoint(p_id uuid,p_lease uuid,p_action text,p_data jsonb default null,p_cursor integer default 0,p_code text default null) returns void language plpgsql security definer set search_path='' as $$
declare j private.exam_import_jobs; chars integer;
begin
 if auth.role() is distinct from 'service_role' then raise exception 'not_authorized' using errcode='42501'; end if;
 select * into j from private.exam_import_jobs where id=p_id and lease_token=p_lease and lease_until>clock_timestamp() for update;
 if not found then raise exception 'lease_lost' using errcode='PT409'; end if;
 if p_action='cleaned' then
  if j.status not in ('applied','cancelled','failed','expired') then raise exception 'lease_lost' using errcode='PT409'; end if;
  update private.exam_import_jobs set path=null,sections='[]',result=null,lease_token=null,lease_until=null,updated_at=clock_timestamp() where id=j.id; return;
 end if;
 if j.status not in ('extracting','generating') or j.expires_at<=clock_timestamp() then raise exception 'lease_lost' using errcode='PT409'; end if;
 if p_action in ('extracted','extracting') then
  if j.stage<>'extract' or p_data is null or jsonb_typeof(p_data)<>'array' or octet_length(p_data::text)>500000 or p_cursor<=j.cursor then raise exception 'exam_import_invalid' using errcode='PT400'; end if;
  select coalesce(sum(length(value->>'text')),0) into chars from jsonb_array_elements(p_data);
  if j.text_chars+chars>100000 then raise exception 'text_limit' using errcode='PT413'; end if;
  update private.exam_import_jobs set sections=sections||p_data,text_chars=text_chars+chars,cursor=p_cursor,stage=case when p_action='extracted' then 'generate' else 'extract' end,status='queued',lease_token=null,lease_until=null,updated_at=clock_timestamp() where id=j.id;
 elsif p_action='review' then
  if p_data is null or octet_length(p_data::text)>500000 then raise exception 'exam_import_invalid' using errcode='PT400'; end if;
  perform private.validate_exam_document(p_data->'form'->'document',false);
  update private.exam_import_jobs set result=p_data,status='needs_review',lease_token=null,lease_until=null,error_code=null,updated_at=clock_timestamp() where id=j.id;
 elsif p_action='waiting_quota' then
  update private.exam_import_jobs set status='waiting_quota',error_code='waiting_quota',not_before=clock_timestamp()+interval '1 minute',lease_token=null,lease_until=null,updated_at=clock_timestamp() where id=j.id;
 elsif p_action='failed' then
  update private.exam_import_jobs set status='failed',error_code=case when p_code in ('provider_unavailable','invalid_extract','input_too_long','no_text','unsupported_file','source_changed','owner_unavailable','attempt_budget_exhausted') then p_code else 'processing_failed' end,not_before=clock_timestamp()+interval '1 minute',lease_token=null,lease_until=null,updated_at=clock_timestamp() where id=j.id;
 else raise exception 'exam_import_invalid' using errcode='PT400'; end if;
end $$;
create function public.apply_exam_import(p_id uuid,p_form jsonb,p_reviewed boolean) returns jsonb language plpgsql security definer set search_path='' as $$
declare j private.exam_import_jobs; r jsonb;
begin
 perform private.require_active_user(); select * into j from private.exam_import_jobs where id=p_id and owner_id=auth.uid() for update;
 if not found then raise exception 'exam_import_not_found' using errcode='PT404'; end if;
 if j.status='applied' and j.applied_exam_id is not null then return jsonb_build_object('id',j.applied_exam_id); end if;
 if j.status<>'needs_review' or j.expires_at<=clock_timestamp() or p_reviewed is distinct from true then raise exception 'exam_import_review_required' using errcode='PT409'; end if;
 r:=public.save_exam(null,null,j.id,p_form->>'title',coalesce(p_form->>'description',''),p_form->'document');
 update private.exam_import_jobs set status='applied',applied_exam_id=(r->>'id')::uuid,lease_token=null,lease_until=null,updated_at=clock_timestamp() where id=j.id;
 return r;
end $$;
revoke all on function public.exam_import_preflight(),public.exam_import_list(),public.reserve_exam_import(uuid,text,text,integer,boolean),public.exam_import_owned(uuid),public.control_exam_import(uuid,text),public.exam_import_upload_target(uuid),public.complete_exam_import(uuid,text),public.apply_exam_import(uuid,jsonb,boolean) from public,anon;
grant execute on function public.exam_import_preflight(),public.exam_import_list(),public.reserve_exam_import(uuid,text,text,integer,boolean),public.exam_import_owned(uuid),public.control_exam_import(uuid,text),public.exam_import_upload_target(uuid),public.complete_exam_import(uuid,text),public.apply_exam_import(uuid,jsonb,boolean) to authenticated;
revoke all on function public.exam_import_claim(),public.exam_import_reserve_attempt(uuid,uuid),public.exam_import_checkpoint(uuid,uuid,text,jsonb,integer,text) from public,anon,authenticated;
grant execute on function public.exam_import_claim(),public.exam_import_reserve_attempt(uuid,uuid),public.exam_import_checkpoint(uuid,uuid,text,jsonb,integer,text) to service_role;
