-- Metadata is read at retrieval time, so existing ready vectors remain usable.
do $metadata$
declare body text;definition text;
begin
 select prosrc,pg_get_functiondef(oid) into body,definition from pg_proc where oid='public.rag_retrieve(text,text,text)'::regprocedure;
 body:=replace(body,'s.title,s.kind,s.publication_id','s.title,s.subject,s.grades,s.kind,s.publication_id');
 execute replace(definition,(select prosrc from pg_proc where oid='public.rag_retrieve(text,text,text)'::regprocedure),body);
end;
$metadata$;
