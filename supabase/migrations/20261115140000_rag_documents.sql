create extension if not exists vector with schema extensions;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
 values('rag-documents','rag-documents',false,10485760,array['application/pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document'])
 on conflict(id) do nothing;
create table private.rag_sources(
 id uuid primary key default gen_random_uuid(),kind text not null check(kind in ('document','library')),
 publication_id uuid unique references public.quiz_publications(id) on delete cascade,
 title text not null check(length(btrim(title)) between 1 and 200),subject text,grades text[] not null default '{}',
 generation integer not null default 1,active_version uuid,deleted_at timestamptz,created_at timestamptz not null default now()
);
create table private.rag_versions(
 id uuid primary key default gen_random_uuid(),source_id uuid not null references private.rag_sources(id) on delete cascade,
 generation integer not null,path text,bytes bigint not null default 0 check(bytes between 0 and 10485760),
 format text not null check(format in ('pdf','docx','library')),
 status text not null default 'reserved' check(status in ('reserved','extracting','embedding','ready','failed','deleted')),
 hash text,text_chars integer not null default 0 check(text_chars between 0 and 1000000),
 chunk_count integer not null default 0 check(chunk_count between 0 and 2000),
 created_at timestamptz not null default now(),unique(source_id,generation)
);
alter table private.rag_sources add foreign key(active_version) references private.rag_versions(id) on delete set null;
create table private.rag_chunks(
 id uuid primary key default gen_random_uuid(),version_id uuid not null references private.rag_versions(id) on delete cascade,
 position integer not null check(position>=0),body text not null check(length(body) between 1 and 1400),locator jsonb not null,
 embedding extensions.vector(768),model text not null default 'gemini-embedding-001' check(model='gemini-embedding-001'),unique(version_id,position)
);
create index rag_chunks_embedding on private.rag_chunks using hnsw(embedding extensions.vector_cosine_ops);
create table private.rag_jobs(
 id uuid primary key default gen_random_uuid(),version_id uuid not null unique references private.rag_versions(id) on delete cascade,
 kind text not null default 'extract' check(kind in ('extract','embed','cleanup')),
 status text not null default 'queued' check(status in ('queued','running','waiting_quota','succeeded','failed','cancelled')),
 cursor integer not null default 0,attempts integer not null default 0,next_run_at timestamptz not null default now(),
 lease_token uuid,lease_until timestamptz,error_code text,updated_at timestamptz not null default now()
);
create table private.rag_scheduler_state(id boolean primary key default true check(id),last_run_at timestamptz,last_result text);
insert into private.rag_scheduler_state(id) values(true);
revoke all on private.rag_sources,private.rag_versions,private.rag_chunks,private.rag_jobs,private.rag_scheduler_state from public,anon,authenticated;
create function private.require_service() returns void language plpgsql stable security definer set search_path='' as $$
begin if auth.role() is distinct from 'service_role' then raise exception 'not_authorized' using errcode='42501';end if;end;
$$;
revoke all on function private.require_service() from public,anon,authenticated;
create function public.admin_rag_documents() returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 perform private.require_admin();
 return jsonb_build_object('items',(select coalesce(jsonb_agg(r),'[]') from(
  select s.id,s.title,s.subject,s.grades,s.generation,s.active_version as "activeVersion",v.id as "versionId",v.format,v.bytes,v.status,
  v.chunk_count as "chunkCount",j.status as "jobStatus",j.cursor,j.error_code as "errorCode"
  from private.rag_sources s left join private.rag_versions v on v.source_id=s.id and v.generation=s.generation left join private.rag_jobs j on j.version_id=v.id
  where s.kind='document' and s.deleted_at is null order by s.created_at desc limit 50)r),
 'capacity',jsonb_build_object('documents',(select count(*) from private.rag_sources where kind='document' and deleted_at is null),
 'bytes',(select coalesce(sum(bytes),0) from private.rag_versions where status<>'deleted'),'chunks',(select count(*) from private.rag_chunks)));
end;
$$;
create function public.admin_reserve_document(p_title text,p_format text,p_bytes bigint,p_subject text default null,p_grades text[] default '{}',p_source uuid default null) returns jsonb
language plpgsql security definer set search_path='' as $$
declare source uuid;version uuid:=gen_random_uuid();gen integer;path text;
begin
 perform private.require_admin();
 if p_title is null or length(btrim(p_title)) not between 1 and 200 or p_format is null or p_format not in ('pdf','docx')
 or p_bytes is null or p_bytes not between 1 and 10485760 or cardinality(p_grades)>13
 or (p_subject is not null and p_subject not in ('toan','ngu-van','tieng-anh','khoa-hoc-tu-nhien','lich-su-dia-li','tin-hoc'))
 or not p_grades<@array['1','2','3','4','5','6','7','8','9','10','11','12','dai-hoc']::text[] then raise exception 'document_invalid' using errcode='PT400';end if;
 perform pg_advisory_xact_lock(hashtextextended('rag-capacity',0));
 if (select coalesce(sum(bytes),0) from private.rag_versions where status<>'deleted')+p_bytes>536870912 then raise exception 'capacity_exceeded' using errcode='PT409';end if;
 if p_source is null then
  if (select count(*) from private.rag_sources where kind='document' and deleted_at is null)>=50 then raise exception 'capacity_exceeded' using errcode='PT409';end if;
  insert into private.rag_sources(kind,title,subject,grades) values('document',btrim(p_title),p_subject,p_grades) returning id,generation into source,gen;
 else
  update private.rag_sources set generation=generation+1,title=btrim(p_title),subject=p_subject,grades=p_grades where id=p_source and kind='document' and deleted_at is null returning id,generation into source,gen;
  if not found then raise exception 'source_not_found' using errcode='PT404';end if;
  if exists(select 1 from private.rag_versions where source_id=source and status in ('reserved','extracting','embedding')) then raise exception 'already_processing' using errcode='PT409';end if;
 end if;
 path:=source::text||'/'||version::text||'.'||p_format;
 insert into private.rag_versions(id,source_id,generation,path,bytes,format) values(version,source,gen,path,p_bytes,p_format);
 insert into private.admin_audit(actor_id,target_id,action) values(auth.uid(),source::text,'rag.reserve');
 return jsonb_build_object('id',source,'versionId',version,'path',path);
end;
$$;
create function public.admin_delete_document(p_id uuid,p_generation integer) returns void language plpgsql security definer set search_path='' as $$
begin
 perform private.require_admin();
 update private.rag_sources set deleted_at=now(),generation=generation+1,active_version=null where id=p_id and kind='document' and deleted_at is null and generation=p_generation;
 if not found then raise exception 'version_conflict' using errcode='PT409';end if;
 update private.rag_jobs set kind='cleanup',status='queued',lease_token=null,lease_until=null,next_run_at=now() where version_id in(select id from private.rag_versions where source_id=p_id);
 insert into private.rag_jobs(version_id,kind) select id,'cleanup' from private.rag_versions where source_id=p_id on conflict do nothing;
 insert into private.admin_audit(actor_id,target_id,action) values(auth.uid(),p_id::text,'rag.delete');
end;
$$;
create function public.rag_complete_upload(p_version uuid,p_hash text) returns void language plpgsql security definer set search_path='' as $$
declare v private.rag_versions;
begin
 perform private.require_service();
 select * into v from private.rag_versions where id=p_version for update;
 if not found or v.status<>'reserved' or not exists(select 1 from private.rag_sources where id=v.source_id and deleted_at is null and generation=v.generation) then raise exception 'version_conflict' using errcode='PT409';end if;
 update private.rag_versions set hash=p_hash,status='extracting' where id=p_version;
 insert into private.rag_jobs(version_id) values(p_version) on conflict do nothing;
end;
$$;
create function public.rag_version(p_id uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
begin perform private.require_service();return(select to_jsonb(v) from private.rag_versions v where id=p_id);end;
$$;
create function public.rag_claim_job() returns jsonb language plpgsql security definer set search_path='' as $$
declare j private.rag_jobs;v private.rag_versions;
begin
 perform private.require_service();
 perform pg_advisory_xact_lock(hashtextextended('rag-worker',0));
 update private.rag_scheduler_state set last_run_at=now(),last_result='running' where id;
 -- Orphan reservations expire independently of browser traffic.
 insert into private.rag_jobs(version_id,kind) select id,'cleanup' from private.rag_versions where status='reserved' and created_at<now()-interval '3 hours' on conflict do nothing;
 if exists(select 1 from private.rag_jobs where status='running' and lease_until>now()) then return null;end if;
 select * into j from private.rag_jobs where (status in ('queued','waiting_quota') and next_run_at<=now()) or (status='running' and lease_until<now()) order by next_run_at,id limit 1 for update skip locked;
 if not found then update private.rag_scheduler_state set last_result='idle' where id;return null;end if;
 if j.attempts>=1000 then update private.rag_jobs set status='failed',error_code='attempt_limit' where id=j.id;return null;end if;
 update private.rag_jobs set status='running',lease_token=gen_random_uuid(),lease_until=now()+interval '45 seconds',attempts=attempts+1,updated_at=now() where id=j.id returning * into j;
 select * into v from private.rag_versions where id=j.version_id;
 return jsonb_build_object('job',to_jsonb(j),'version',to_jsonb(v));
end;
$$;
create function public.rag_checkpoint(p_job uuid,p_lease uuid,p_chunks jsonb,p_cursor integer,p_done boolean,p_chars integer) returns void language plpgsql security definer set search_path='' as $$
declare j private.rag_jobs;v private.rag_versions;c jsonb;added integer:=0;
begin
 perform private.require_service();
 perform pg_advisory_xact_lock(hashtextextended('rag-capacity',0));
 select * into j from private.rag_jobs where id=p_job and lease_token=p_lease and status='running' and lease_until>now() for update;
 if not found then raise exception 'lease_lost' using errcode='PT409';end if;
 select * into v from private.rag_versions where id=j.version_id for update;
 if not exists(select 1 from private.rag_sources where id=v.source_id and generation=v.generation and deleted_at is null) then raise exception 'source_changed' using errcode='PT409';end if;
 if jsonb_typeof(p_chunks) is distinct from 'array' or jsonb_array_length(p_chunks)>2000 or p_chars<0 then raise exception 'chunks_invalid' using errcode='PT400';end if;
 if j.kind='extract' then
  if v.text_chars+p_chars>1000000 or v.chunk_count+jsonb_array_length(p_chunks)>2000 or (select count(*) from private.rag_chunks)+jsonb_array_length(p_chunks)>20000 then raise exception 'capacity_exceeded' using errcode='PT409';end if;
  for c in select * from jsonb_array_elements(p_chunks) loop
   insert into private.rag_chunks(version_id,position,body,locator) values(v.id,v.chunk_count+added,c->>'body',c->'locator');added:=added+1;
  end loop;
  update private.rag_versions set text_chars=text_chars+p_chars,chunk_count=chunk_count+added,status=case when p_done then 'embedding' else 'extracting' end where id=v.id;
  update private.rag_jobs set kind=case when p_done then 'embed' else kind end,cursor=case when p_done then 0 else p_cursor end,status='queued',lease_token=null,lease_until=null,updated_at=now() where id=j.id;
 elsif j.kind='embed' then
  for c in select * from jsonb_array_elements(p_chunks) loop
   update private.rag_chunks set embedding=(c->>'embedding')::extensions.vector where id=(c->>'id')::uuid and version_id=v.id;
  end loop;
  update private.rag_jobs set cursor=p_cursor,status=case when p_done then 'succeeded' else 'queued' end,lease_token=null,lease_until=null,updated_at=now() where id=j.id;
  if p_done then
   if not exists(select 1 from private.rag_chunks where version_id=v.id) or exists(select 1 from private.rag_chunks where version_id=v.id and embedding is null) then raise exception 'embedding_incomplete' using errcode='PT409';end if;
   update private.rag_versions set status='ready' where id=v.id;
   update private.rag_sources set active_version=v.id where id=v.source_id and generation=v.generation and deleted_at is null;
   -- Retire old generations only after atomic activation.
   insert into private.rag_jobs(version_id,kind) select id,'cleanup' from private.rag_versions where source_id=v.source_id and id<>v.id
    on conflict(version_id) do update set kind='cleanup',status='queued',next_run_at=now(),lease_token=null,lease_until=null;
  end if;
 else raise exception 'job_kind_invalid' using errcode='PT400';end if;
 update private.rag_scheduler_state set last_result='healthy' where id;
end;
$$;
create function public.rag_pending_chunks(p_version uuid,p_limit integer default 8) returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 perform private.require_service();
 return(select coalesce(jsonb_agg(r),'[]') from(select id,body from private.rag_chunks where version_id=p_version and embedding is null order by position limit least(greatest(p_limit,1),8))r);
end;
$$;
create function public.rag_job_result(p_job uuid,p_lease uuid,p_result text,p_code text default null) returns void language plpgsql security definer set search_path='' as $$
declare j private.rag_jobs;
begin
 perform private.require_service();
 if p_result is null or p_result not in ('waiting_quota','failed','cancelled','cleaned') or (p_code is not null and p_code !~ '^[a-z_]{1,60}$') then raise exception 'result_invalid' using errcode='PT400';end if;
 select * into j from private.rag_jobs where id=p_job and lease_token=p_lease and status='running' and lease_until>now() for update;
 if not found then raise exception 'lease_lost' using errcode='PT409';end if;
 if p_result='cleaned' then
  if exists(select 1 from private.rag_sources where active_version=j.version_id) then raise exception 'active_version' using errcode='PT409';end if;
  delete from private.rag_chunks where version_id=j.version_id;
  update private.rag_versions set status='deleted',bytes=0 where id=j.version_id;
 elsif p_result='failed' then update private.rag_versions set status='failed' where id=j.version_id and status<>'ready';
 end if;
 update private.rag_jobs set status=case when p_result='cleaned' then 'succeeded' else p_result end,error_code=p_code,next_run_at=now()+interval '1 minute',lease_token=null,lease_until=null,updated_at=now() where id=j.id;
 update private.rag_scheduler_state set last_result=coalesce(p_code,p_result) where id;
end;
$$;
create function public.rag_operations() returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 perform private.require_admin();
 return jsonb_build_object('heartbeat',(select to_jsonb(s)-'id' from private.rag_scheduler_state s where id),
 'jobs',(select coalesce(jsonb_object_agg(status,n),'{}') from(select status,count(*) n from private.rag_jobs group by status)r),
 'sources',(select count(*) from private.rag_sources where deleted_at is null and active_version is not null),
 'bytes',(select coalesce(sum(bytes),0) from private.rag_versions where status<>'deleted'),
 'chunks',(select count(*) from private.rag_chunks));
end;
$$;
-- Deny new RPCs by default, grant explicit admin/service surfaces.
revoke all on function public.admin_rag_documents(),public.admin_reserve_document(text,text,bigint,text,text[],uuid),public.admin_delete_document(uuid,integer) from public,anon;
grant execute on function public.admin_rag_documents(),public.admin_reserve_document(text,text,bigint,text,text[],uuid),public.admin_delete_document(uuid,integer) to authenticated;
revoke all on function public.rag_complete_upload(uuid,text),public.rag_version(uuid),public.rag_claim_job(),public.rag_checkpoint(uuid,uuid,jsonb,integer,boolean,integer),public.rag_pending_chunks(uuid,integer),public.rag_job_result(uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function public.rag_complete_upload(uuid,text),public.rag_version(uuid),public.rag_claim_job(),public.rag_checkpoint(uuid,uuid,jsonb,integer,boolean,integer),public.rag_pending_chunks(uuid,integer),public.rag_job_result(uuid,uuid,text,text) to service_role;
revoke all on function public.rag_operations() from public,anon;
grant execute on function public.rag_operations() to authenticated;
