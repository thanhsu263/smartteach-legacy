-- host RPCs share an invoker helper, called inside their definer boundary.
do $guard$
declare v_oid oid; v_body text; v_definition text;
begin
  select p.oid,p.prosrc into v_oid,v_body from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='private' and p.proname='host_session';
  if v_oid is null then raise exception 'host_helper_missing'; end if;
  v_definition:=pg_get_functiondef(v_oid);
  execute replace(v_definition,v_body,regexp_replace(v_body,'\mbegin\M','begin PERFORM private.require_active_user();','i'));
end;
$guard$;
