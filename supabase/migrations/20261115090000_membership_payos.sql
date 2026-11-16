-- Premium purchases are server-confirmed, one-off payments. Quizzes remain free.
create table public.membership_entitlements (
  user_id uuid primary key references auth.users(id) on delete cascade,
  premium_until timestamptz not null,
  updated_at timestamptz not null default now()
);

create sequence private.membership_order_code_seq minvalue 1 maxvalue 9007199254740991;
select setval('private.membership_order_code_seq', (extract(epoch from clock_timestamp()) * 1000)::bigint * 1000);
revoke all on sequence private.membership_order_code_seq from public, anon, authenticated;

create table public.membership_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  order_code bigint not null unique default nextval('private.membership_order_code_seq'),
  plan_id text not null check (plan_id in ('premium_monthly', 'premium_yearly')),
  amount integer not null,
  status text not null default 'pending' check (status in ('pending', 'paid', 'cancelled', 'expired')),
  payment_link_id text unique,
  checkout_url text,
  expires_at timestamptz not null default now() + interval '30 minutes',
  created_at timestamptz not null default now(),
  paid_at timestamptz,
  last_checked_at timestamptz,
  constraint membership_price_check check (
    (plan_id = 'premium_monthly' and amount = 50000) or (plan_id = 'premium_yearly' and amount = 500000)
  ),
  constraint membership_paid_check check ((status = 'paid') = (paid_at is not null)),
  constraint membership_checkout_check check (checkout_url is null or checkout_url ~ '^https://pay\.payos\.vn/')
);
create index membership_orders_owner_created on public.membership_orders(user_id, created_at desc);

alter table public.membership_entitlements enable row level security;
alter table public.membership_orders enable row level security;
revoke all on public.membership_entitlements, public.membership_orders from public, anon, authenticated;
grant select on public.membership_entitlements, public.membership_orders to authenticated;
grant all on public.membership_entitlements, public.membership_orders to service_role;
create policy membership_own_entitlement on public.membership_entitlements for select to authenticated
  using (user_id = (select auth.uid()));
create policy membership_own_orders on public.membership_orders for select to authenticated
  using (user_id = (select auth.uid()));

create function private.has_premium(p_user uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.membership_entitlements where user_id = p_user and premium_until > now());
$$;
revoke all on function private.has_premium(uuid) from public, anon, authenticated;

create function public.membership_status()
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('active', coalesce(max(premium_until) > now(), false), 'premiumUntil', max(premium_until))
  from public.membership_entitlements where user_id = (select auth.uid());
$$;
revoke all on function public.membership_status() from public, anon;
grant execute on function public.membership_status() to authenticated;

create function public.prepare_membership_checkout(p_plan text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := (select auth.uid());
  v_order public.membership_orders;
  v_amount integer;
begin
  if v_user is null then raise exception 'not_authenticated' using errcode = '42501'; end if;
  v_amount := case p_plan when 'premium_monthly' then 50000 when 'premium_yearly' then 500000 else null end;
  if v_amount is null then raise exception 'membership_plan_invalid' using errcode = 'PT400'; end if;
  perform pg_advisory_xact_lock(hashtextextended('membership:' || v_user::text, 0));
  select * into v_order from public.membership_orders
    where user_id = v_user and plan_id = p_plan and status = 'pending' and expires_at > now()
    order by created_at desc limit 1;
  if found then return to_jsonb(v_order); end if;
  if (select count(*) from public.membership_orders where user_id = v_user and created_at > now() - interval '1 hour') >= 10 then
    raise exception 'membership_order_limit' using errcode = 'PT429';
  end if;
  insert into public.membership_orders(user_id, plan_id, amount) values (v_user, p_plan, v_amount) returning * into v_order;
  return to_jsonb(v_order);
end;
$$;
revoke all on function public.prepare_membership_checkout(text) from public, anon;
grant execute on function public.prepare_membership_checkout(text) to authenticated;

create function public.claim_membership_check(p_order uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_order public.membership_orders;
begin
  if (select auth.uid()) is null then raise exception 'not_authenticated' using errcode = '42501'; end if;
  select * into v_order from public.membership_orders where id = p_order and user_id = (select auth.uid()) for update;
  if not found then raise exception 'membership_order_not_found' using errcode = 'PT404'; end if;
  if v_order.status <> 'paid' then
    if v_order.last_checked_at > clock_timestamp() - interval '10 seconds' then
      raise exception 'membership_check_limit' using errcode = 'PT429';
    end if;
    update public.membership_orders set last_checked_at = clock_timestamp() where id = p_order;
  end if;
  return to_jsonb(v_order);
end;
$$;
revoke all on function public.claim_membership_check(uuid) from public, anon;
grant execute on function public.claim_membership_check(uuid) to authenticated;

create function public.bind_membership_payment(p_order uuid, p_payment_link_id text, p_checkout_url text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_order public.membership_orders;
begin
  if (select auth.role()) is distinct from 'service_role' then raise exception 'not_authorized' using errcode = '42501'; end if;
  if p_payment_link_id is null or length(p_payment_link_id) not between 1 and 100
     or p_checkout_url is null or p_checkout_url !~ '^https://pay\.payos\.vn/' then
    raise exception 'membership_payment_invalid' using errcode = 'PT400';
  end if;
  select * into v_order from public.membership_orders where id = p_order for update;
  if not found then raise exception 'membership_order_not_found' using errcode = 'PT404'; end if;
  if v_order.payment_link_id is not null and v_order.payment_link_id <> p_payment_link_id then
    raise exception 'membership_payment_mismatch' using errcode = 'PT409';
  end if;
  update public.membership_orders set payment_link_id = p_payment_link_id, checkout_url = p_checkout_url where id = p_order;
end;
$$;

create function public.settle_membership_payment(p_order_code bigint, p_payment_link_id text, p_amount integer)
returns timestamptz language plpgsql security definer set search_path = '' as $$
declare
  v_order public.membership_orders;
  v_user uuid;
  v_until timestamptz;
  v_now timestamptz := clock_timestamp();
begin
  if (select auth.role()) is distinct from 'service_role' then raise exception 'not_authorized' using errcode = '42501'; end if;
  select user_id into v_user from public.membership_orders where order_code = p_order_code;
  if not found then raise exception 'membership_order_not_found' using errcode = 'PT404'; end if;
  -- Same lock order as prepare: user first, then order. Serializes two different paid orders too.
  perform pg_advisory_xact_lock(hashtextextended('membership:' || v_user::text, 0));
  select * into v_order from public.membership_orders where order_code = p_order_code for update;
  if p_amount is distinct from v_order.amount or p_payment_link_id is null or length(p_payment_link_id) not between 1 and 100
     or (v_order.payment_link_id is not null and v_order.payment_link_id <> p_payment_link_id) then
    raise exception 'membership_payment_mismatch' using errcode = 'PT409';
  end if;
  if v_order.status = 'paid' then
    select premium_until into v_until from public.membership_entitlements where user_id = v_user;
    return v_until;
  end if;
  select greatest(premium_until, v_now) into v_until from public.membership_entitlements where user_id = v_user;
  v_until := ((coalesce(v_until, v_now) at time zone 'UTC')
    + make_interval(months => case v_order.plan_id when 'premium_monthly' then 1 else 12 end)) at time zone 'UTC';
  insert into public.membership_entitlements(user_id, premium_until, updated_at) values (v_user, v_until, v_now)
    on conflict (user_id) do update set premium_until = excluded.premium_until, updated_at = excluded.updated_at;
  update public.membership_orders set status = 'paid', paid_at = v_now, payment_link_id = p_payment_link_id where id = v_order.id;
  return v_until;
end;
$$;

create function public.set_membership_order_state(p_order uuid, p_status text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if (select auth.role()) is distinct from 'service_role' then raise exception 'not_authorized' using errcode = '42501'; end if;
  if p_status not in ('cancelled', 'expired') or p_status is null then raise exception 'membership_state_invalid' using errcode = 'PT400'; end if;
  update public.membership_orders set status = p_status where id = p_order and status <> 'paid';
end;
$$;
revoke all on function public.bind_membership_payment(uuid, text, text),
  public.settle_membership_payment(bigint, text, integer), public.set_membership_order_state(uuid, text)
  from public, anon, authenticated;
grant execute on function public.bind_membership_payment(uuid, text, text),
  public.settle_membership_payment(bigint, text, integer), public.set_membership_order_state(uuid, text)
  to service_role;

-- Guard the actual write boundary, including calls made through existing SECURITY DEFINER RPCs.
create function private.require_assignment_premium()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_needs_premium boolean := tg_op = 'INSERT';
begin
  if (select auth.role()) = 'service_role' then return new; end if;
  if tg_op = 'UPDATE' then
    v_needs_premium := new.title is distinct from old.title or new.description is distinct from old.description
      or new.opens_at is distinct from old.opens_at or new.due_at is distinct from old.due_at
      or new.reveal_policy is distinct from old.reveal_policy
      or (new.status = 'published' and old.status <> 'published');
  end if;
  if v_needs_premium and not private.has_premium(new.owner_id) then
    raise exception 'premium_required' using errcode = 'PT402';
  end if;
  return new;
end;
$$;
revoke all on function private.require_assignment_premium() from public, anon, authenticated;
create trigger assignments_require_premium before insert or update on public.assignments
  for each row execute function private.require_assignment_premium();
