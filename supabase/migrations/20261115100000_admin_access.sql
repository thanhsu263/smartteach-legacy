-- Application roles never grant table-wide access to teachers' private data.
create table private.account_controls (
  user_id uuid primary key references auth.users(id) on delete cascade,
  app_role text not null default 'teacher' check (app_role in ('teacher','admin')),
  status text not null default 'active' check (status in ('active','blocked')),
  version integer not null default 1,
  updated_at timestamptz not null default now()
);
create table private.admin_audit (
  id bigint generated always as identity primary key,
  actor_id uuid references auth.users(id) on delete set null,
  target_id text not null,
  action text not null,
  metadata jsonb not null default '{}',
  request_id uuid unique,
  created_at timestamptz not null default now()
);
revoke all on private.account_controls, private.admin_audit from public, anon, authenticated;
insert into private.account_controls(user_id) select id from auth.users on conflict do nothing;

create function private.is_active_user() returns boolean language sql stable security definer set search_path='' as $$
  select (select auth.uid()) is not null and not exists (
    select 1 from private.account_controls where user_id=(select auth.uid()) and status='blocked'
  );
$$;
create function private.require_active_user() returns void language plpgsql stable security definer set search_path='' as $$
begin
  if (select auth.role()) = 'service_role' then return; end if;
  if not private.is_active_user() then raise exception 'account_unavailable' using errcode='42501'; end if;
end;
$$;
create function private.is_admin() returns boolean language sql stable security definer set search_path='' as $$
  select exists(select 1 from private.account_controls where user_id=(select auth.uid()) and app_role='admin' and status='active');
$$;
create function private.require_admin() returns void language plpgsql stable security definer set search_path='' as $$
begin
  if not private.is_admin() then raise exception 'admin_required' using errcode='42501'; end if;
end;
$$;
revoke all on function private.is_active_user(),private.require_active_user(),private.is_admin(),private.require_admin() from public,anon,authenticated;
grant usage on schema private to authenticated;
grant execute on function private.is_active_user(),private.is_admin() to authenticated;

-- Apply AND restriction to legacy direct table access without broadening owner policies.
do $guard$
declare r record;
begin
  for r in select c.relname from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relkind='r' and c.relrowsecurity
  loop
    execute format('create policy active_account_guard on public.%I as restrictive for all to authenticated using ((select private.is_active_user())) with check ((select private.is_active_user()))',r.relname);
  end loop;
end;
$guard$;

-- SECURITY DEFINER functions bypass RLS. Guard all legacy functions that resolve auth.uid().
-- pg_get_functiondef preserves signatures, defaults, volatility, security and return contracts.
do $rpc_guard$
declare r record; v_body text; v_definition text;
begin
  for r in select p.oid,p.prosrc,l.lanname from pg_proc p
    join pg_namespace n on n.oid=p.pronamespace join pg_language l on l.oid=p.prolang
    where n.nspname in ('public','private') and p.prosecdef and p.prosrc like '%auth.uid()%'
    and p.proname not in ('is_active_user','require_active_user','is_admin','require_admin')
  loop
    if r.lanname='plpgsql' then
      v_body:=regexp_replace(r.prosrc,'\mbegin\M','begin PERFORM private.require_active_user();','i');
    elsif r.lanname='sql' then
      v_body:='select private.require_active_user(); '||r.prosrc;
    else raise exception 'unsupported_guard_language'; end if;
    if v_body=r.prosrc then raise exception 'guard_not_applied'; end if;
    v_definition:=pg_get_functiondef(r.oid);
    v_definition:=replace(v_definition,r.prosrc,v_body);
    execute v_definition;
  end loop;
end;
$rpc_guard$;

create function public.account_session() returns jsonb language sql stable security definer set search_path='' as $$
  select case when (select auth.uid()) is null then null else jsonb_build_object(
    'userId',(select auth.uid()),'role',coalesce(c.app_role,'teacher'),
    'status',coalesce(c.status,'active'),'version',coalesce(c.version,0))
  end from (select 1) seed left join private.account_controls c on c.user_id=(select auth.uid());
$$;

create function public.bootstrap_admin(p_user uuid) returns void language plpgsql security definer set search_path='' as $$
begin
  if (select auth.role()) is distinct from 'service_role' then raise exception 'not_authorized' using errcode='42501'; end if;
  perform pg_advisory_xact_lock(hashtextextended('admin-controls',0));
  if exists(select 1 from private.account_controls where app_role='admin' and status='active') then
    raise exception 'admin_already_exists' using errcode='PT409';
  end if;
  if not exists(select 1 from auth.users where id=p_user) then raise exception 'user_not_found' using errcode='PT404'; end if;
  insert into private.account_controls(user_id,app_role) values(p_user,'admin')
    on conflict(user_id) do update set app_role='admin',status='active',version=private.account_controls.version+1,updated_at=now();
  insert into private.admin_audit(actor_id,target_id,action) values(p_user,p_user::text,'admin.bootstrap');
end;
$$;
revoke all on function public.bootstrap_admin(uuid) from public,anon,authenticated;
grant execute on function public.bootstrap_admin(uuid) to service_role;

create function public.admin_users(p_query text default '',p_role text default '',p_status text default '',p_offset integer default 0,p_limit integer default 20)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare v_items jsonb; v_count bigint;
begin
  perform private.require_admin();
  if p_limit not between 1 and 50 or p_offset<0 or length(p_query)>100 then raise exception 'invalid_page' using errcode='PT400'; end if;
  select count(*) into v_count from auth.users u left join private.account_controls c on c.user_id=u.id
    where coalesce(u.email,'') ilike '%'||p_query||'%' and (p_role='' or coalesce(c.app_role,'teacher')=p_role)
    and (p_status='' or coalesce(c.status,'active')=p_status);
  select coalesce(jsonb_agg(row),'[]') into v_items from (
    select u.id as "userId",u.email,u.created_at as "createdAt",u.last_sign_in_at as "lastSignInAt",
      coalesce(c.app_role,'teacher') as role,coalesce(c.status,'active') as status,coalesce(c.version,0) as version,
      e.premium_until as "premiumUntil"
    from auth.users u left join private.account_controls c on c.user_id=u.id
    left join public.membership_entitlements e on e.user_id=u.id
    where coalesce(u.email,'') ilike '%'||p_query||'%' and (p_role='' or coalesce(c.app_role,'teacher')=p_role)
      and (p_status='' or coalesce(c.status,'active')=p_status)
    order by u.created_at desc,u.id limit p_limit offset p_offset
  ) row;
  return jsonb_build_object('items',v_items,'total',v_count,'nextOffset',case when p_offset+p_limit<v_count then p_offset+p_limit else null end);
end;
$$;

create function public.admin_update_user(p_user uuid,p_action text,p_reason text,p_expected_version integer,p_request_id uuid,p_role text default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_before private.account_controls; v_role text; v_status text;
begin
  perform private.require_admin();
  if length(btrim(p_reason)) not between 3 and 500 or p_request_id is null or p_action not in ('set_role','block','unblock') then
    raise exception 'invalid_action' using errcode='PT400';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('admin-controls',0));
  perform private.require_admin();
  if exists(select 1 from private.admin_audit where request_id=p_request_id and actor_id=(select auth.uid()) and target_id=p_user::text and action='account.'||p_action) then
    return jsonb_build_object('ok',true);
  end if;
  if not exists(select 1 from auth.users where id=p_user) then raise exception 'user_not_found' using errcode='PT404'; end if;
  select * into v_before from private.account_controls where user_id=p_user for update;
  if coalesce(v_before.version,0) is distinct from p_expected_version then raise exception 'version_conflict' using errcode='PT409'; end if;
  v_role:=case when p_action='set_role' then p_role else coalesce(v_before.app_role,'teacher') end;
  v_status:=case p_action when 'block' then 'blocked' when 'unblock' then 'active' else coalesce(v_before.status,'active') end;
  if v_role is null or v_role not in ('teacher','admin') then raise exception 'invalid_role' using errcode='PT400'; end if;
  if v_before.app_role='admin' and v_before.status='active' and (v_role<>'admin' or v_status<>'active')
    and (select count(*) from private.account_controls where app_role='admin' and status='active')<=1 then
    raise exception 'last_admin' using errcode='PT409';
  end if;
  insert into private.account_controls(user_id,app_role,status) values(p_user,v_role,v_status)
    on conflict(user_id) do update set app_role=excluded.app_role,status=excluded.status,version=private.account_controls.version+1,updated_at=now();
  insert into private.admin_audit(actor_id,target_id,action,metadata,request_id) values(
    (select auth.uid()),p_user::text,'account.'||p_action,jsonb_build_object('reason',p_reason,'role',v_role,'status',v_status),p_request_id);
  return jsonb_build_object('ok',true);
end;
$$;

create function public.admin_audit_list(p_offset integer default 0,p_limit integer default 20)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare v_items jsonb;
begin
  perform private.require_admin();
  if p_limit not between 1 and 50 or p_offset<0 then raise exception 'invalid_page' using errcode='PT400'; end if;
  select coalesce(jsonb_agg(row),'[]') into v_items from (
    select id,actor_id as "actorId",target_id as "targetId",action,metadata,created_at as "createdAt"
    from private.admin_audit order by id desc limit p_limit offset p_offset
  ) row;
  return jsonb_build_object('items',v_items);
end;
$$;
revoke all on function public.account_session(),public.admin_users(text,text,text,integer,integer),public.admin_update_user(uuid,text,text,integer,uuid,text),public.admin_audit_list(integer,integer) from public,anon;
grant execute on function public.account_session(),public.admin_users(text,text,text,integer,integer),public.admin_update_user(uuid,text,text,integer,uuid,text),public.admin_audit_list(integer,integer) to authenticated;
