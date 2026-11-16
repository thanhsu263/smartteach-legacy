create function private.rag_sync_publications() returns void language plpgsql security definer set search_path='' as $$
declare e record;p public.quiz_publications;s private.rag_sources;v uuid;
begin
 for e in select * from private.publication_events where not processed order by id limit 10 for update skip locked loop
  select * into p from public.quiz_publications where id=e.publication_id;
  if found and p.status='approved' then
   insert into private.rag_sources(kind,publication_id,title,subject,grades,generation) values('library',p.id,p.title,p.subject,p.grades,p.version)
   on conflict(publication_id) do update set title=excluded.title,subject=excluded.subject,grades=excluded.grades,generation=excluded.generation,deleted_at=null
   returning * into s;
   insert into private.rag_versions(source_id,generation,format,status) values(s.id,p.version,'library','extracting') on conflict do nothing returning id into v;
   if v is not null then insert into private.rag_jobs(version_id) values(v) on conflict do nothing;end if;
  else
   update private.rag_sources set deleted_at=now(),active_version=null where publication_id=e.publication_id;
   insert into private.rag_jobs(version_id,kind) select v.id,'cleanup' from private.rag_versions v join private.rag_sources s on s.id=v.source_id where s.publication_id=e.publication_id
   on conflict(version_id) do update set kind='cleanup',status='queued',next_run_at=now(),lease_token=null,lease_until=null;
  end if;
  update private.publication_events set processed=true where id=e.id;
 end loop;
end;
$$;
revoke all on function private.rag_sync_publications() from public,anon,authenticated;
insert into private.publication_events(publication_id,version,status) select id,version,status from public.quiz_publications where status='approved';
do $sync$
declare body text;definition text;
begin
 select prosrc,pg_get_functiondef(oid) into body,definition from pg_proc where oid='public.rag_claim_job()'::regprocedure;
 execute replace(definition,body,replace(body,'perform private.require_service();','perform private.require_service(); perform private.rag_sync_publications();'));
end;
$sync$;
create function public.rag_library_sections(p_version uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare p public.quiz_publications;
begin
 perform private.require_service();
 select p1.* into p from public.quiz_publications p1 join private.rag_sources s on s.publication_id=p1.id join private.rag_versions v on v.source_id=s.id
 where v.id=p_version and s.deleted_at is null and p1.status='approved' and p1.version=v.generation;
 if not found then raise exception 'source_changed' using errcode='PT409';end if;
 return jsonb_build_array(jsonb_build_object('text',p.title||E'\n'||p.description,'locator',jsonb_build_object('paragraph',1)))
 ||(select coalesce(jsonb_agg(jsonb_build_object('text',q->>'prompt'||E'\n'||coalesce((select string_agg(o->>'label',E'\n') from jsonb_array_elements(coalesce(q->'options','[]'))o),''),'locator',jsonb_build_object('question',n))),'[]')
 from jsonb_array_elements(p.quiz_snapshot->'questions') with ordinality x(q,n));
end;
$$;
create function private.rag_eligible(p_version uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from private.rag_versions v join private.rag_sources s on s.id=v.source_id
 left join public.quiz_publications p on p.id=s.publication_id
 where v.id=p_version and s.active_version=v.id and s.deleted_at is null and v.status='ready'
 and (s.kind='document' or (p.status='approved' and p.version=v.generation)));
$$;
revoke all on function private.rag_eligible(uuid) from public,anon,authenticated;
create function public.rag_retrieve(p_embedding text,p_subject text default null,p_grade text default null) returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 perform private.require_active_user();
 return(select coalesce(jsonb_agg(r),'[]') from(
 select c.id,c.body,c.locator,s.id as "sourceId",v.id as "versionId",s.title,s.kind,s.publication_id as "publicationId",
 1-(c.embedding OPERATOR(extensions.<=>) p_embedding::extensions.vector) as score
 from private.rag_chunks c join private.rag_versions v on v.id=c.version_id join private.rag_sources s on s.id=v.source_id
 where private.rag_eligible(v.id) and c.embedding is not null
 and (p_subject is null or s.subject=p_subject) and (p_grade is null or p_grade=any(s.grades))
 and c.embedding OPERATOR(extensions.<=>) p_embedding::extensions.vector<0.65
 order by c.embedding OPERATOR(extensions.<=>) p_embedding::extensions.vector,c.id limit 6)r);
end;
$$;
create function public.rag_source(p_id uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 perform private.require_active_user();
 return(select jsonb_build_object('id',c.id,'body',c.body,'locator',c.locator,'sourceId',s.id,'versionId',v.id,'title',s.title,'kind',s.kind,'publicationId',s.publication_id)
 from private.rag_chunks c join private.rag_versions v on v.id=c.version_id join private.rag_sources s on s.id=v.source_id
 where c.id=p_id and private.rag_eligible(v.id));
end;
$$;
revoke all on function public.rag_library_sections(uuid) from public,anon,authenticated;
grant execute on function public.rag_library_sections(uuid) to service_role;
revoke all on function public.rag_retrieve(text,text,text),public.rag_source(uuid) from public,anon;
grant execute on function public.rag_retrieve(text,text,text),public.rag_source(uuid) to authenticated;
