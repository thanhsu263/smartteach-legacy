create or replace function private.rag_sync_publications() returns void language plpgsql security definer set search_path='' as $$
declare v_event record;v_publication public.quiz_publications;v_source private.rag_sources;v_version uuid;
begin
 for v_event in select * from private.publication_events where not processed order by id limit 10 for update skip locked loop
  v_version:=null;
  select * into v_publication from public.quiz_publications where id=v_event.publication_id;
  if found and v_publication.status='approved' then
   insert into private.rag_sources(kind,publication_id,title,subject,grades,generation)
   values('library',v_publication.id,v_publication.title,v_publication.subject,v_publication.grades,v_publication.version)
   on conflict(publication_id) do update set title=excluded.title,subject=excluded.subject,grades=excluded.grades,generation=excluded.generation,deleted_at=null returning * into v_source;
   insert into private.rag_versions(source_id,generation,format,status) values(v_source.id,v_publication.version,'library','extracting') on conflict do nothing returning id into v_version;
   if v_version is not null then insert into private.rag_jobs(version_id) values(v_version) on conflict do nothing;end if;
  else
   update private.rag_sources set deleted_at=now(),active_version=null where publication_id=v_event.publication_id;
   insert into private.rag_jobs(version_id,kind) select ver.id,'cleanup' from private.rag_versions ver join private.rag_sources src on src.id=ver.source_id where src.publication_id=v_event.publication_id
   on conflict(version_id) do update set kind='cleanup',status='queued',next_run_at=now(),lease_token=null,lease_until=null;
  end if;
  update private.publication_events set processed=true where id=v_event.id;
 end loop;
end;
$$;
