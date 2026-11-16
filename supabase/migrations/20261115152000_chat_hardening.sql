create or replace function public.chat_config() returns jsonb language plpgsql stable security definer set search_path='' as $$
declare v_enabled boolean;v_available boolean;
begin
 perform private.require_active_user();
 select (data->>'chatbotEnabled')::boolean into v_enabled from public.site_settings where id;
 v_available:=coalesce(v_enabled,false) and exists(select 1 from private.ai_settings where chat_model is not null)
 and exists(select 1 from private.ai_credentials c where c.enabled and c.state='healthy')
 and exists(select 1 from private.rag_sources s where private.rag_eligible(s.active_version));
 return jsonb_build_object('enabled',coalesce(v_enabled,false),'available',v_available,'retentionDays',30,
 'message',case when not coalesce(v_enabled,false) then 'Chatbot đang tắt.' when not v_available then 'Trợ lý chưa được cấu hình đủ model, key và nguồn kiến thức.' else 'Chỉ trả lời từ nguồn đã được duyệt.' end);
end;
$$;
-- Delete and finish always lock thread before request, preventing a delete/finish deadlock.
do $locks$
declare body text;definition text;
begin
 select prosrc,pg_get_functiondef(oid) into body,definition from pg_proc where oid='public.chat_finish(uuid,uuid,uuid,text,jsonb,text,text)'::regprocedure;
 body:=replace(body,'for update;',';');
 body:=replace(body,'if t.deleted_at is not null',
 'perform 1 from public.chat_threads where id=r.thread_id for update; perform 1 from private.chat_requests where owner_id=p_owner and request_id=p_request for update; select * into t from public.chat_threads where id=r.thread_id; if t.deleted_at is not null');
 execute replace(definition,(select prosrc from pg_proc where oid='public.chat_finish(uuid,uuid,uuid,text,jsonb,text,text)'::regprocedure),body);
end;
$locks$;
