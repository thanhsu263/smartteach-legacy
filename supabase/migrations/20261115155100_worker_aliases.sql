do $aliases$
declare body text;definition text;
begin
 select prosrc,pg_get_functiondef(oid) into body,definition from pg_proc where oid='public.rag_claim_job()'::regprocedure;
 body:=replace(body,'update private.rag_jobs j set next_run_at=greatest(j.next_run_at,v.created_at+interval ''3 hours'') from private.rag_versions v where j.version_id=v.id and j.kind=''cleanup'' and v.path is not null and j.status=''queued'';',
 'update private.rag_jobs queued_job set next_run_at=greatest(queued_job.next_run_at,ver.created_at+interval ''3 hours'') from private.rag_versions ver where queued_job.version_id=ver.id and queued_job.kind=''cleanup'' and ver.path is not null and queued_job.status=''queued'';');
 execute replace(definition,(select prosrc from pg_proc where oid='public.rag_claim_job()'::regprocedure),body);
end;
$aliases$;
