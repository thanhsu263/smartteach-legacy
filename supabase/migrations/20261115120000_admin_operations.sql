alter table public.membership_entitlements add column version integer not null default 1;
create function private.entitlement_revision() returns trigger language plpgsql set search_path='' as $$
begin new.version:=old.version+1;return new;end;
$$;
revoke all on function private.entitlement_revision() from public,anon,authenticated;
create trigger entitlement_revision before update on public.membership_entitlements for each row execute function private.entitlement_revision();
create table private.membership_adjustments(
 id uuid primary key,actor_id uuid references auth.users(id) on delete set null,
 user_id uuid references auth.users(id) on delete cascade,action text not null,
 reason text not null,old_until timestamptz,new_until timestamptz not null,created_at timestamptz not null default now()
);
revoke all on private.membership_adjustments from public,anon,authenticated;
create function public.admin_membership(p_user uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 perform private.require_admin();
 if not exists(select 1 from auth.users where id=p_user) then raise exception 'user_not_found' using errcode='PT404';end if;
 return jsonb_build_object('userId',p_user,'version',coalesce((select version from public.membership_entitlements where user_id=p_user),0),
 'premiumUntil',(select premium_until from public.membership_entitlements where user_id=p_user),
 'orders',(select coalesce(jsonb_agg(r),'[]') from(select id,plan_id as "planId",amount,status,created_at as "createdAt",paid_at as "paidAt" from public.membership_orders where user_id=p_user order by created_at desc limit 20)r),
 'adjustments',(select coalesce(jsonb_agg(r),'[]') from(select id,action,reason,new_until as "premiumUntil",created_at as "createdAt" from private.membership_adjustments where user_id=p_user order by created_at desc limit 20)r));
end;
$$;
create function public.admin_adjust_membership(p_user uuid,p_action text,p_reason text,p_expected_version integer,p_request_id uuid) returns timestamptz
language plpgsql security definer set search_path='' as $$
declare old_until timestamptz;new_until timestamptz;v_version integer;previous private.membership_adjustments;
begin
 perform private.require_admin();
 if p_user is null or p_action is null or p_action not in ('month','year','revoke') or p_reason is null
 or length(btrim(p_reason)) not between 3 and 500 or p_expected_version is null or p_request_id is null then raise exception 'invalid_adjustment' using errcode='PT400';end if;
 perform pg_advisory_xact_lock(hashtextextended('membership:'||p_user::text,0));
 select * into previous from private.membership_adjustments where id=p_request_id;
 if found then
  if previous.actor_id=auth.uid() and previous.user_id=p_user and previous.action=p_action and previous.reason=p_reason then return previous.new_until;end if;
  raise exception 'idempotency_conflict' using errcode='PT409';
 end if;
 if not exists(select 1 from auth.users where id=p_user) then raise exception 'user_not_found' using errcode='PT404';end if;
 select premium_until,version into old_until,v_version from public.membership_entitlements where user_id=p_user for update;
 if coalesce(v_version,0)<>p_expected_version then raise exception 'version_conflict' using errcode='PT409';end if;
 new_until:=case when p_action='revoke' then now() else
  (greatest(coalesce(old_until,now()),now()) at time zone 'UTC' + make_interval(months=>case p_action when 'month' then 1 else 12 end)) at time zone 'UTC' end;
 insert into public.membership_entitlements(user_id,premium_until) values(p_user,new_until)
 on conflict(user_id) do update set premium_until=excluded.premium_until,updated_at=now();
 insert into private.membership_adjustments(id,actor_id,user_id,action,reason,old_until,new_until) values(p_request_id,auth.uid(),p_user,p_action,p_reason,old_until,new_until);
 insert into private.admin_audit(actor_id,target_id,action,metadata,request_id) values(auth.uid(),p_user::text,'membership.'||p_action,jsonb_build_object('reason',p_reason,'premiumUntil',new_until),p_request_id);
 return new_until;
end;
$$;
create function public.admin_overview() returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 perform private.require_admin();
 return jsonb_build_object('users',(select count(*) from auth.users),'quizzes',(select count(*) from public.quizzes),
 'approved',(select count(*) from public.quiz_publications where status='approved'),
 'pending',(select count(*) from public.quiz_publications where status='pending'),
 'reports',(select count(*) from public.publication_reports where resolved_at is null),
 'adjustments',(select count(*) from private.membership_adjustments),
 'orders',(select coalesce(jsonb_object_agg(status,n),'{}') from(select status,count(*) n from public.membership_orders group by status)r));
end;
$$;
revoke all on function public.admin_membership(uuid),public.admin_adjust_membership(uuid,text,text,integer,uuid),public.admin_overview() from public,anon;
grant execute on function public.admin_membership(uuid),public.admin_adjust_membership(uuid,text,text,integer,uuid),public.admin_overview() to authenticated;
