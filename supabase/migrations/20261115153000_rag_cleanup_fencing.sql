-- Signed upload capabilities expire after two hours; keep cleanup after that window
-- so a previously issued capability cannot recreate an orphan after deletion.
do $cleanup$
declare body text;definition text;
begin
 select prosrc,pg_get_functiondef(oid) into body,definition from pg_proc where oid='public.rag_claim_job()'::regprocedure;
 body:=replace(body,'if exists(select 1 from private.rag_jobs where status=',
 'update private.rag_jobs j set next_run_at=greatest(j.next_run_at,v.created_at+interval ''3 hours'') from private.rag_versions v where j.version_id=v.id and j.kind=''cleanup'' and v.path is not null and j.status=''queued''; if exists(select 1 from private.rag_jobs where status=');
 execute replace(definition,(select prosrc from pg_proc where oid='public.rag_claim_job()'::regprocedure),body);
end;
$cleanup$;
