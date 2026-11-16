create function public.admin_audit_search(p_offset integer default 0,p_query text default '') returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 perform private.require_admin();
 if p_offset is null or p_offset not between 0 and 100000 or p_query is null or length(p_query)>100 then raise exception 'invalid_page' using errcode='PT400';end if;
 return(select jsonb_build_object('items',coalesce(jsonb_agg(r),'[]')) from(
 select id,actor_id as "actorId",target_id as "targetId",action,metadata,created_at as "createdAt"
 from private.admin_audit where p_query='' or action ilike '%'||p_query||'%' or target_id=p_query or actor_id::text=p_query
 order by id desc limit 20 offset p_offset)r);
end;
$$;
revoke all on function public.admin_audit_search(integer,text) from public,anon;
grant execute on function public.admin_audit_search(integer,text) to authenticated;
