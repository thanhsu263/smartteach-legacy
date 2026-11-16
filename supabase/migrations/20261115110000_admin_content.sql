create table public.game_catalog (
  id text primary key check (id ~ '^[a-z0-9][a-z0-9-]{0,99}$'),
  payload jsonb not null,
  published boolean not null default true,
  version integer not null default 1
);
alter table public.game_catalog enable row level security;
revoke all on public.game_catalog from public,anon,authenticated;
grant select on public.game_catalog to anon,authenticated;
create policy catalog_published on public.game_catalog for select using(published);
insert into public.game_catalog(id,payload) values('gargamel-bat-xi-trum','{"title":"Gargamel bắt Xì Trum","description":"Làng Xì Trum phiên bản lớp học: Gargamel rượt đuổi đàn Xì Trum, mỗi Xì Trum là một bạn trong lớp. Gọi tên ngẫu nhiên, công bằng, có thể không gọi lại người đã gọi.","subjects":[],"grades":[],"embedUrl":"https://www.quyentran.online/","credits":"Xì Trum và Gargamel © Peyo / IMPS. Nhạc: Smurfs Epic Run © Ubisoft. Dự án học tập và giải trí nội bộ, phi thương mại, Trường Đại học Sài Gòn.","featured":true}');

create table public.site_settings (
  id boolean primary key default true check(id),
  data jsonb not null,
  version integer not null default 1
);
alter table public.site_settings enable row level security;
revoke all on public.site_settings from public,anon,authenticated;
grant select on public.site_settings to anon,authenticated;
create policy settings_read on public.site_settings for select using(true);
insert into public.site_settings(data) values('{"contactEmail":"thanhsu.tb.cl.tg.vn@gmail.com","announcement":"","faq":[],"chatbotEnabled":false,"librarySubmissionsEnabled":true}');

create function public.admin_catalog() returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 perform private.require_admin();
 return (select coalesce(jsonb_agg(jsonb_build_object('id',id,'payload',payload,'published',published,'version',version) order by id),'[]') from public.game_catalog);
end;
$$;
create function public.admin_save_game(p_id text,p_payload jsonb,p_published boolean,p_expected_version integer) returns void
language plpgsql security definer set search_path='' as $$
declare v_version integer;
begin
 perform private.require_admin();
 if p_id is null or p_payload is null or p_published is null or p_expected_version is null
 or p_id !~ '^[a-z0-9][a-z0-9-]{0,99}$' or jsonb_typeof(p_payload)<>'object'
 or length(p_payload::text)>8000 or length(btrim(coalesce(p_payload->>'title',''))) not between 1 and 100
 or length(coalesce(p_payload->>'description',''))>1000
 or coalesce(p_payload->>'embedUrl','') !~ '^https://(www\.)?quyentran\.online(/|$)'
 or jsonb_typeof(p_payload->'subjects') is distinct from 'array' or jsonb_typeof(p_payload->'grades') is distinct from 'array'
 or exists(select 1 from jsonb_object_keys(p_payload) k where k not in ('title','description','subjects','grades','embedUrl','credits','featured'))
 then raise exception 'invalid_game' using errcode='PT400'; end if;
 perform pg_advisory_xact_lock(hashtextextended('catalog:'||p_id,0));
 select version into v_version from public.game_catalog where id=p_id for update;
 if coalesce(v_version,0)<>p_expected_version then raise exception 'version_conflict' using errcode='PT409'; end if;
 insert into public.game_catalog(id,payload,published) values(p_id,p_payload,p_published)
 on conflict(id) do update set payload=excluded.payload,published=excluded.published,version=public.game_catalog.version+1;
 insert into private.admin_audit(actor_id,target_id,action) values((select auth.uid()),p_id,'catalog.save');
end;
$$;
create function public.admin_save_settings(p_data jsonb,p_expected_version integer) returns void
language plpgsql security definer set search_path='' as $$
begin
 perform private.require_admin();
 if p_data is null or jsonb_typeof(p_data)<>'object' or length(p_data::text)>14000 or p_expected_version is null
 or exists(select 1 from jsonb_object_keys(p_data) k where k not in ('contactEmail','announcement','faq','chatbotEnabled','librarySubmissionsEnabled'))
 or length(coalesce(p_data->>'contactEmail',''))>200 or length(coalesce(p_data->>'announcement',''))>1000
 or jsonb_typeof(p_data->'faq') is distinct from 'array' or jsonb_array_length(p_data->'faq')>20
 or jsonb_typeof(p_data->'chatbotEnabled') is distinct from 'boolean'
 or jsonb_typeof(p_data->'librarySubmissionsEnabled') is distinct from 'boolean'
 then raise exception 'invalid_settings' using errcode='PT400'; end if;
 update public.site_settings set data=p_data,version=version+1 where id and version=p_expected_version;
 if not found then raise exception 'version_conflict' using errcode='PT409'; end if;
 insert into private.admin_audit(actor_id,target_id,action) values((select auth.uid()),'site','settings.update');
end;
$$;

alter table public.quiz_publications add column version integer not null default 1;
create table private.publication_events(id bigint generated always as identity primary key,publication_id uuid not null,version integer not null,status text not null,processed boolean not null default false,created_at timestamptz not null default now());
revoke all on private.publication_events from public,anon,authenticated;
create function private.publication_changed() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if tg_when='BEFORE' then new.version:=old.version+1;return new;end if;
 insert into private.publication_events(publication_id,version,status) values(new.id,new.version,new.status);
 return new;
end;
$$;
revoke all on function private.publication_changed() from public,anon,authenticated;
create trigger publication_version before update on public.quiz_publications for each row execute function private.publication_changed();
create trigger publication_event after insert or update on public.quiz_publications for each row execute function private.publication_changed();
create function public.admin_library(p_offset integer default 0,p_status text default '',p_query text default '') returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
 perform private.require_admin();
 if p_offset is null or p_offset<0 or length(p_query)>100 then raise exception 'invalid_page' using errcode='PT400';end if;
 return (select jsonb_build_object('items',coalesce(jsonb_agg(row),'[]')) from (
   select id,title,description,subject,grades,status,version,review_reason as "reviewReason",
   (select coalesce(jsonb_agg(jsonb_build_object('prompt',q->>'prompt','kind',q->>'kind','options',
    (select coalesce(jsonb_agg(jsonb_build_object('label',o->>'label')),'[]') from jsonb_array_elements(coalesce(q->'options','[]')) o))),'[]')
    from jsonb_array_elements(quiz_snapshot->'questions') q) as questions
   from public.quiz_publications where status<>'draft' and (p_status='' or status=p_status)
   and title ilike '%'||p_query||'%' order by created_at desc,id limit 20 offset p_offset
 ) row);
end;
$$;
create function public.admin_moderate_publication(p_id uuid,p_status text,p_reason text,p_expected_version integer) returns void
language plpgsql security definer set search_path='' as $$
begin
 perform private.require_admin();
 if p_status is null or p_status not in ('approved','rejected','hidden') or p_reason is null or length(p_reason)>500 or (p_status='rejected' and length(btrim(p_reason))<3) then raise exception 'invalid_moderation' using errcode='PT400';end if;
 update public.quiz_publications set status=p_status,review_reason=p_reason,reviewed_at=now(),
 published_at=case when p_status='approved' then now() else published_at end,
 hidden_at=case when p_status='hidden' then now() else hidden_at end,updated_at=now()
 where id=p_id and status<>'draft' and version=p_expected_version;
 if not found then raise exception 'version_conflict' using errcode='PT409';end if;
 insert into private.admin_audit(actor_id,target_id,action,metadata) values((select auth.uid()),p_id::text,'publication.'||p_status,jsonb_build_object('reason',p_reason));
end;
$$;
-- Existing submit/resubmit functions keep their signatures and behavior, plus the server-side switch.
do $switch$
declare r record; v_body text;
begin
 for r in select p.oid,p.prosrc from pg_proc p join pg_namespace n on n.oid=p.pronamespace
 where n.nspname='public' and p.proname in ('submit_quiz_publication','resubmit_quiz_publication') loop
  v_body:=regexp_replace(r.prosrc,'\mbegin\M','begin IF NOT coalesce((select (data->>''librarySubmissionsEnabled'')::boolean from public.site_settings where id),true) THEN RAISE EXCEPTION ''submissions_disabled'' USING ERRCODE=''PT403''; END IF;','i');
  execute replace(pg_get_functiondef(r.oid),r.prosrc,v_body);
 end loop;
end;
$switch$;
revoke all on function public.admin_catalog(),public.admin_save_game(text,jsonb,boolean,integer),public.admin_save_settings(jsonb,integer),public.admin_library(integer,text,text),public.admin_moderate_publication(uuid,text,text,integer) from public,anon;
grant execute on function public.admin_catalog(),public.admin_save_game(text,jsonb,boolean,integer),public.admin_save_settings(jsonb,integer),public.admin_library(integer,text,text),public.admin_moderate_publication(uuid,text,text,integer) to authenticated;
