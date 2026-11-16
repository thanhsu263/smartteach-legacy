do $sync$
declare body text;definition text;
begin
 select prosrc,pg_get_functiondef(oid) into body,definition from pg_proc where oid='public.admin_update_user(uuid,text,text,integer,uuid,text)'::regprocedure;
 body:=replace(body,'insert into private.admin_audit(actor_id,target_id,action,metadata,request_id)',
 'if p_action in (''block'',''unblock'') then update private.account_controls set auth_sync_pending=true where user_id=p_user;end if; insert into private.admin_audit(actor_id,target_id,action,metadata,request_id)');
 execute replace(definition,(select prosrc from pg_proc where oid='public.admin_update_user(uuid,text,text,integer,uuid,text)'::regprocedure),body);
end;
$sync$;
