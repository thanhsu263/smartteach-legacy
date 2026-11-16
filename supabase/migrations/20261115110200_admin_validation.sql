-- Validate at the database boundary too: callers can bypass the Next.js API.
create function private.valid_catalog(p jsonb) returns boolean language sql immutable set search_path='' as $$
 select jsonb_typeof(p->'title')='string' and jsonb_typeof(p->'description')='string'
 and jsonb_typeof(p->'embedUrl')='string'
 and (not p ? 'featured' or jsonb_typeof(p->'featured')='boolean')
 and (not p ? 'credits' or (jsonb_typeof(p->'credits')='string' and length(p->>'credits')<=1000))
 and not exists(select 1 from jsonb_array_elements_text(p->'subjects') s where s not in ('toan','ngu-van','tieng-anh','khoa-hoc-tu-nhien','lich-su-dia-li','tin-hoc'))
 and not exists(select 1 from jsonb_array_elements_text(p->'grades') g where g not in ('1','2','3','4','5','6','7','8','9','10','11','12','dai-hoc'));
$$;
create function private.valid_site_settings(p jsonb) returns boolean language sql immutable set search_path='' as $$
 select jsonb_typeof(p->'contactEmail')='string' and p->>'contactEmail' ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
 and jsonb_typeof(p->'announcement')='string'
 and not exists(select 1 from jsonb_array_elements(p->'faq') f where jsonb_typeof(f)<>'object'
  or jsonb_typeof(f->'question') is distinct from 'string' or jsonb_typeof(f->'answer') is distinct from 'string'
  or length(btrim(f->>'question')) not between 1 and 200 or length(btrim(f->>'answer')) not between 1 and 2000
  or exists(select 1 from jsonb_object_keys(f) k where k not in ('question','answer')));
$$;
revoke all on function private.valid_catalog(jsonb),private.valid_site_settings(jsonb) from public,anon,authenticated;
-- Constraints run under the writing SECURITY DEFINER RPC, never require exposing private helpers.
alter table public.game_catalog add constraint catalog_payload_valid check(private.valid_catalog(payload) is true);
alter table public.site_settings add constraint site_payload_valid check(private.valid_site_settings(data) is true);
do $hardening$
declare r record; guard text; body text;
begin
 for r in select p.oid,p.proname,p.prosrc from pg_proc p join pg_namespace n on n.oid=p.pronamespace
 where n.nspname='public' and p.proname in ('admin_update_user','admin_users','admin_audit_list') loop
  guard:=case r.proname when 'admin_update_user' then
   'IF p_user IS NULL OR p_action IS NULL OR p_reason IS NULL OR p_expected_version IS NULL OR p_request_id IS NULL THEN RAISE EXCEPTION ''invalid_action'' USING ERRCODE=''PT400''; END IF;'
   else 'IF p_offset IS NULL OR p_limit IS NULL OR p_offset>100000 THEN RAISE EXCEPTION ''invalid_page'' USING ERRCODE=''PT400''; END IF;' end;
  body:=replace(r.prosrc,'perform private.require_admin();','perform private.require_admin(); '||guard);
  execute replace(pg_get_functiondef(r.oid),r.prosrc,body);
 end loop;
end;
$hardening$;
alter table public.publication_reports add column resolved_at timestamptz;
alter table public.publication_reports add column resolution text check(length(resolution)<=500);
create function public.admin_reports(p_offset integer default 0) returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
 perform private.require_admin();
 if p_offset is null or p_offset not between 0 and 100000 then raise exception 'invalid_page' using errcode='PT400';end if;
 return (select jsonb_build_object('items',coalesce(jsonb_agg(r),'[]')) from(
 select r.id,r.publication_id as "publicationId",p.title,r.reason,r.note,r.created_at as "createdAt"
 from public.publication_reports r join public.quiz_publications p on p.id=r.publication_id
 where r.resolved_at is null order by r.created_at,r.id limit 20 offset p_offset) r);
end;
$$;
create function public.admin_resolve_report(p_id uuid,p_reason text) returns void
language plpgsql security definer set search_path='' as $$
begin
 perform private.require_admin();
 if p_reason is null or length(btrim(p_reason)) not between 3 and 500 then raise exception 'reason_required' using errcode='PT400';end if;
 update public.publication_reports set resolved_at=now(),resolution=p_reason where id=p_id and resolved_at is null;
 if not found then raise exception 'version_conflict' using errcode='PT409';end if;
 insert into private.admin_audit(actor_id,target_id,action,metadata) values(auth.uid(),p_id::text,'report.resolve',jsonb_build_object('reason',p_reason));
end;
$$;
revoke all on function public.admin_reports(integer),public.admin_resolve_report(uuid,text) from public,anon;
grant execute on function public.admin_reports(integer),public.admin_resolve_report(uuid,text) to authenticated;
