-- Thread metadata must not retain a copy of the first prompt after its 30-day TTL.
update public.chat_threads set title='Cuộc trò chuyện mới';
do $title$
declare body text;definition text;
begin
 select prosrc,pg_get_functiondef(oid) into body,definition from pg_proc where oid='public.chat_begin(uuid,uuid,text,text)'::regprocedure;
 body:=replace(body,'title=case when title=''Cuộc trò chuyện mới'' then left(btrim(p_text),80) else title end','title=''Cuộc trò chuyện mới''');
 execute replace(definition,(select prosrc from pg_proc where oid='public.chat_begin(uuid,uuid,text,text)'::regprocedure),body);
end;
$title$;
create function public.chat_list_threads(p_offset integer default 0) returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 perform private.require_active_user();
 if p_offset is null or p_offset not between 0 and 100000 then raise exception 'invalid_page' using errcode='PT400';end if;
 return(select jsonb_build_object('items',coalesce(jsonb_agg(r),'[]')) from(
 select t.id,coalesce((select left(m.body,80) from public.chat_messages m where m.thread_id=t.id and m.role='user' and m.expires_at>now() order by m.created_at desc,m.id desc limit 1),'Cuộc trò chuyện mới') as title,t.created_at,t.updated_at
 from public.chat_threads t where t.owner_id=auth.uid() and t.deleted_at is null order by t.updated_at desc,t.id limit 20 offset p_offset)r);
end;
$$;
revoke all on function public.chat_list_threads(integer) from public,anon;
grant execute on function public.chat_list_threads(integer) to authenticated;
