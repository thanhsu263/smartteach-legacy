alter table private.account_controls add column auth_sync_pending boolean not null default false;
create function public.admin_auth_sync_result(p_user uuid,p_pending boolean) returns void language plpgsql security definer set search_path='' as $$
begin
 perform private.require_service();
 update private.account_controls set auth_sync_pending=p_pending where user_id=p_user;
end;
$$;
create function public.admin_auth_sync_status() returns integer language plpgsql stable security definer set search_path='' as $$
begin
 perform private.require_admin();
 return(select count(*)::integer from private.account_controls where auth_sync_pending);
end;
$$;
revoke all on function public.admin_auth_sync_result(uuid,boolean) from public,anon,authenticated;
grant execute on function public.admin_auth_sync_result(uuid,boolean) to service_role;
revoke all on function public.admin_auth_sync_status() from public,anon;
grant execute on function public.admin_auth_sync_status() to authenticated;
do $guard$
declare body text;definition text;
begin
 select prosrc,pg_get_functiondef(oid) into body,definition from pg_proc where oid='public.admin_save_ai_credential(uuid,text,text,jsonb,text,boolean,integer)'::regprocedure;
 body:=replace(body,'perform private.require_admin();',
 'perform private.require_admin(); perform pg_advisory_xact_lock(hashtextextended(''ai-credential-capacity'',0)); if not exists(select 1 from private.ai_credentials where id=p_id) and (select count(*) from private.ai_credentials)>=20 then raise exception ''credential_limit'' using errcode=''PT409'';end if;');
 execute replace(definition,(select prosrc from pg_proc where oid='public.admin_save_ai_credential(uuid,text,text,jsonb,text,boolean,integer)'::regprocedure),body);
 select prosrc,pg_get_functiondef(oid) into body,definition from pg_proc where oid='public.rag_job_result(uuid,uuid,text,text)'::regprocedure;
 body:=replace(body,'update private.rag_versions set status=''deleted'',bytes=0 where id=j.version_id;',
 'update private.rag_versions set status=''deleted'',bytes=0 where id=j.version_id; update private.rag_sources src set deleted_at=now() from private.rag_versions ver where src.id=ver.source_id and ver.id=j.version_id and src.active_version is null and src.generation=ver.generation;');
 execute replace(definition,(select prosrc from pg_proc where oid='public.rag_job_result(uuid,uuid,text,text)'::regprocedure),body);
end;
$guard$;
