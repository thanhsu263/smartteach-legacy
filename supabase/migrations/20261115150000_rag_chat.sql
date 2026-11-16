create table public.chat_threads(
 id uuid primary key default gen_random_uuid(),owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 title text not null default 'Cuộc trò chuyện mới' check(length(title)<=80),generation integer not null default 1,
 deleted_at timestamptz,created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create table private.chat_requests(
 owner_id uuid not null references auth.users(id) on delete cascade,request_id uuid not null,
 thread_id uuid not null references public.chat_threads(id) on delete cascade,generation integer not null,
 text_hash text not null,lease_token uuid not null default gen_random_uuid(),
 status text not null default 'processing' check(status in ('processing','completed','failed')),
 error_code text,created_at timestamptz not null default now(),expires_at timestamptz not null default now()+interval '30 days',
 primary key(owner_id,request_id)
);
create table public.chat_messages(
 id uuid primary key default gen_random_uuid(),owner_id uuid not null references auth.users(id) on delete cascade,
 thread_id uuid not null references public.chat_threads(id) on delete cascade,request_id uuid not null,
 role text not null check(role in ('user','assistant')),body text not null check(length(body) between 1 and 12000),
 citations jsonb not null default '[]',outcome text not null default 'answer',
 created_at timestamptz not null default now(),expires_at timestamptz not null default now()+interval '30 days',
 unique(owner_id,request_id,role),check(expires_at=created_at+interval '30 days')
);
create index chat_messages_thread on public.chat_messages(thread_id,created_at,id);
create index chat_messages_expiry on public.chat_messages(expires_at);
create index chat_requests_owner_time on private.chat_requests(owner_id,created_at);
revoke all on public.chat_threads,public.chat_messages,private.chat_requests from public,anon,authenticated;
alter table public.chat_threads enable row level security;
alter table public.chat_messages enable row level security;
grant select on public.chat_threads,public.chat_messages to authenticated;
create policy chat_thread_owner on public.chat_threads for select to authenticated using(owner_id=(select auth.uid()) and deleted_at is null and private.is_active_user());
create policy chat_message_owner on public.chat_messages for select to authenticated using(owner_id=(select auth.uid()) and expires_at>now() and private.is_active_user() and exists(select 1 from public.chat_threads t where t.id=thread_id and t.deleted_at is null));
create function public.chat_config() returns jsonb language plpgsql stable security definer set search_path='' as $$
declare enabled boolean;available boolean;
begin
 perform private.require_active_user();
 select (data->>'chatbotEnabled')::boolean into enabled from public.site_settings where id;
 available:=coalesce(enabled,false) and exists(select 1 from private.ai_settings where chat_model is not null)
 and exists(select 1 from private.ai_credentials where enabled and state='healthy')
 and exists(select 1 from private.rag_sources s where private.rag_eligible(s.active_version));
 return jsonb_build_object('enabled',coalesce(enabled,false),'available',available,'retentionDays',30,
 'message',case when not coalesce(enabled,false) then 'Chatbot đang tắt.' when not available then 'Trợ lý chưa được cấu hình đủ model, key và nguồn kiến thức.' else 'Chỉ trả lời từ nguồn đã được duyệt.' end);
end;
$$;
create function public.chat_create_thread() returns uuid language plpgsql security definer set search_path='' as $$
declare v_id uuid;
begin
 perform private.require_active_user();
 perform pg_advisory_xact_lock(hashtextextended('chat-owner:'||auth.uid()::text,0));
 if (select count(*) from public.chat_threads where owner_id=auth.uid() and deleted_at is null)>=100 then raise exception 'thread_limit' using errcode='PT429';end if;
 insert into public.chat_threads(owner_id) values(auth.uid()) returning id into v_id;return v_id;
end;
$$;
create function public.chat_delete_thread(p_id uuid) returns void language plpgsql security definer set search_path='' as $$
begin
 perform private.require_active_user();
 update public.chat_threads set deleted_at=now(),generation=generation+1 where id=p_id and owner_id=auth.uid() and deleted_at is null;
 if not found then raise exception 'thread_not_found' using errcode='PT404';end if;
 delete from public.chat_messages where thread_id=p_id;
 update private.chat_requests set status='failed',error_code='thread_deleted' where thread_id=p_id;
end;
$$;
create function public.chat_begin(p_thread uuid,p_request uuid,p_text text,p_hash text) returns jsonb language plpgsql security definer set search_path='' as $$
declare t public.chat_threads;r private.chat_requests;cap integer;
begin
 perform private.require_active_user();
 if p_text is null or length(btrim(p_text)) not between 1 and 1400 or octet_length(p_text)>8192 or p_hash is null or p_hash !~ '^[a-f0-9]{64}$' or p_request is null then raise exception 'message_invalid' using errcode='PT400';end if;
 perform pg_advisory_xact_lock(hashtextextended('chat-owner:'||auth.uid()::text,0));
 select * into t from public.chat_threads where id=p_thread and owner_id=auth.uid() and deleted_at is null for update;
 if not found then raise exception 'thread_not_found' using errcode='PT404';end if;
 select * into r from private.chat_requests where owner_id=auth.uid() and request_id=p_request;
 if found then
  if r.thread_id<>p_thread or r.text_hash<>p_hash then raise exception 'request_conflict' using errcode='PT409';end if;
  return jsonb_build_object('state',case when r.status='processing' and r.created_at<now()-interval '1 minute' then 'failed' else r.status end,'requestId',p_request);
 end if;
 if not coalesce((public.chat_config()->>'available')::boolean,false) then raise exception 'chat_unavailable' using errcode='PT503';end if;
 if exists(select 1 from private.chat_requests where thread_id=p_thread and status='processing' and created_at>now()-interval '1 minute') then raise exception 'thread_busy' using errcode='PT409';end if;
 select user_daily_cap into cap from private.ai_settings where id;
 if (select count(*) from private.chat_requests where owner_id=auth.uid() and created_at>=((now() at time zone 'Asia/Ho_Chi_Minh')::date at time zone 'Asia/Ho_Chi_Minh'))>=cap then raise exception 'user_daily_cap' using errcode='PT429';end if;
 insert into private.chat_requests(owner_id,request_id,thread_id,generation,text_hash) values(auth.uid(),p_request,p_thread,t.generation,p_hash) returning * into r;
 insert into public.chat_messages(owner_id,thread_id,request_id,role,body) values(auth.uid(),p_thread,p_request,'user',btrim(p_text));
 update public.chat_threads set title=case when title='Cuộc trò chuyện mới' then left(btrim(p_text),80) else title end,updated_at=now() where id=p_thread;
 return jsonb_build_object('state','started','requestId',p_request,'lease',r.lease_token);
end;
$$;
create function public.chat_finish(p_owner uuid,p_request uuid,p_lease uuid,p_body text,p_citations jsonb,p_outcome text,p_error text default null) returns void
language plpgsql security definer set search_path='' as $$
declare r private.chat_requests;t public.chat_threads;c jsonb;
begin
 perform private.require_service();
 select * into r from private.chat_requests where owner_id=p_owner and request_id=p_request and lease_token=p_lease and status='processing' and created_at>now()-interval '1 minute' for update;
 if not found then raise exception 'request_expired' using errcode='PT409';end if;
 select * into t from public.chat_threads where id=r.thread_id for update;
 if t.deleted_at is not null or t.generation<>r.generation or exists(select 1 from private.account_controls where user_id=p_owner and status='blocked') then raise exception 'thread_deleted' using errcode='PT409';end if;
 if p_error is not null then
  if p_error !~ '^[a-z_]{1,60}$' then raise exception 'error_invalid' using errcode='PT400';end if;
  update private.chat_requests set status='failed',error_code=p_error where owner_id=p_owner and request_id=p_request;return;
 end if;
 if p_body is null or length(p_body) not between 1 and 12000 or p_outcome not in ('answer','no_source','clarify') or jsonb_typeof(p_citations) is distinct from 'array' or jsonb_array_length(p_citations)>6 then raise exception 'answer_invalid' using errcode='PT400';end if;
 if p_outcome='answer' and jsonb_array_length(p_citations)=0 then raise exception 'citations_required' using errcode='PT400';end if;
 for c in select * from jsonb_array_elements(p_citations) loop
  if not exists(select 1 from private.rag_chunks k where k.id=(c->>'id')::uuid and k.version_id=(c->>'versionId')::uuid and private.rag_eligible(k.version_id)) then raise exception 'source_changed' using errcode='PT409';end if;
 end loop;
 insert into public.chat_messages(owner_id,thread_id,request_id,role,body,citations,outcome) values(p_owner,r.thread_id,p_request,'assistant',p_body,p_citations,p_outcome);
 update private.chat_requests set status='completed' where owner_id=p_owner and request_id=p_request;
 update public.chat_threads set updated_at=now() where id=t.id;
end;
$$;
create function public.chat_thread_messages(p_id uuid,p_offset integer default 0) returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 perform private.require_active_user();
 if p_offset is null or p_offset not between 0 and 100000 then raise exception 'invalid_page' using errcode='PT400';end if;
 if not exists(select 1 from public.chat_threads where id=p_id and owner_id=auth.uid() and deleted_at is null) then raise exception 'thread_not_found' using errcode='PT404';end if;
 return(select jsonb_build_object('items',coalesce(jsonb_agg(r order by r."createdAt",r.id),'[]')) from(
 select m.id,m.request_id as "requestId",m.role,m.body,m.outcome,m.created_at as "createdAt",m.expires_at as "expiresAt",m.citations,
 not exists(select 1 from jsonb_array_elements(m.citations)c where not private.rag_eligible((c->>'versionId')::uuid)) as "sourcesAvailable"
 from public.chat_messages m where m.thread_id=p_id and m.owner_id=auth.uid() and m.expires_at>now() order by m.created_at desc,m.id desc limit 50 offset p_offset)r);
end;
$$;
revoke all on function public.chat_config(),public.chat_create_thread(),public.chat_delete_thread(uuid),public.chat_begin(uuid,uuid,text,text),public.chat_thread_messages(uuid,integer) from public,anon;
grant execute on function public.chat_config(),public.chat_create_thread(),public.chat_delete_thread(uuid),public.chat_begin(uuid,uuid,text,text),public.chat_thread_messages(uuid,integer) to authenticated;
revoke all on function public.chat_finish(uuid,uuid,uuid,text,jsonb,text,text) from public,anon,authenticated;
grant execute on function public.chat_finish(uuid,uuid,uuid,text,jsonb,text,text) to service_role;
