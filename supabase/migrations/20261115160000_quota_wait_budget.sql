-- Waiting for the shared daily quota must not consume the crash/step attempt budget.
do $quota$
declare body text;definition text;
begin
 select prosrc,pg_get_functiondef(oid) into body,definition from pg_proc where oid='public.rag_job_result(uuid,uuid,text,text)'::regprocedure;
 body:=replace(body,'update private.rag_jobs set status=case when p_result=',
 'update private.rag_jobs set attempts=case when p_result=''waiting_quota'' then greatest(attempts-1,0) else attempts end,status=case when p_result=');
 execute replace(definition,(select prosrc from pg_proc where oid='public.rag_job_result(uuid,uuid,text,text)'::regprocedure),body);
end;
$quota$;
