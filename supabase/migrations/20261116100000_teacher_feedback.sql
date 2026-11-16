create table public.teacher_feedback (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
 request_id uuid not null, kind text not null check (kind in ('bug','suggestion')),
 body text not null check (char_length(body) between 10 and 2000), context_path text,
 status text not null default 'new' check(status in ('new','in_progress','resolved')),
 version integer not null default 1, created_at timestamptz not null default clock_timestamp(), updated_at timestamptz not null default clock_timestamp(),
 unique(owner_id,request_id), check(context_path is null or (context_path ~ '^/[a-z0-9/_-]*$' and length(context_path)<=120))
);
create index teacher_feedback_owner_created on public.teacher_feedback(owner_id,created_at desc);
create index teacher_feedback_status_created on public.teacher_feedback(status,created_at desc);
alter table public.teacher_feedback enable row level security;
revoke all on public.teacher_feedback from public,anon,authenticated;

create function public.submit_teacher_feedback(p_request uuid,p_kind text,p_body text,p_path text default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_owner uuid := auth.uid(); v_old public.teacher_feedback; v_id uuid; v_body text := btrim(p_body);
begin
 perform private.require_active_user();
 if v_owner is null then raise exception 'sign_in_required' using errcode='42501'; end if;
 if p_request is null or p_kind is null or p_kind not in ('bug','suggestion') or v_body is null or length(v_body) not between 10 and 2000
 or v_body ~ '[\x00-\x08\x0B\x0C\x0E-\x1F]' or (p_path is not null and (p_path !~ '^/[a-z0-9/_-]*$' or length(p_path)>120)) then
 raise exception 'feedback_invalid' using errcode='PT400'; end if;
 perform pg_advisory_xact_lock(hashtextextended('feedback:'||v_owner::text,0));
 select * into v_old from public.teacher_feedback where owner_id=v_owner and request_id=p_request;
 if found then
   if v_old.kind is distinct from p_kind or v_old.body is distinct from v_body or v_old.context_path is distinct from p_path then raise exception 'request_conflict' using errcode='PT409'; end if;
   return jsonb_build_object('id',v_old.id);
 end if;
 if (select count(*) from public.teacher_feedback where owner_id=v_owner and created_at>clock_timestamp()-interval '10 minutes')>=5
 or (select count(*) from public.teacher_feedback where owner_id=v_owner and (created_at at time zone 'Asia/Ho_Chi_Minh')::date=(clock_timestamp() at time zone 'Asia/Ho_Chi_Minh')::date)>=20 then raise exception 'feedback_rate_limit' using errcode='PT429'; end if;
 insert into public.teacher_feedback(owner_id,request_id,kind,body,context_path) values(v_owner,p_request,p_kind,v_body,p_path) returning id into v_id;
 return jsonb_build_object('id',v_id);
end $$;
create function public.teacher_feedback_list(p_offset integer default 0,p_status text default '',p_admin boolean default false)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare v_items jsonb; v_total integer;
begin
 perform private.require_active_user();
 if p_admin then perform private.require_admin(); end if;
 if p_offset is null or p_offset<0 or p_offset>100000 or p_status is null or p_status not in ('','new','in_progress','resolved') then raise exception 'feedback_invalid' using errcode='PT400'; end if;
 select count(*) into v_total from public.teacher_feedback where (p_admin or owner_id=auth.uid()) and (p_status='' or status=p_status);
 select coalesce(jsonb_agg(r),'[]'::jsonb) into v_items from (
 select id,kind,body,status,version,created_at as "createdAt",updated_at as "updatedAt",context_path as "contextPath"
 from public.teacher_feedback where (p_admin or owner_id=auth.uid()) and (p_status='' or status=p_status) order by created_at desc,id desc limit 20 offset p_offset)r;
 return jsonb_build_object('items',v_items,'total',v_total,'nextOffset',case when p_offset+20<v_total then p_offset+20 else null end);
end $$;
create function public.admin_feedback_status(p_id uuid,p_status text,p_version integer)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_old public.teacher_feedback;
begin
 perform private.require_admin();
 if p_status is null or p_status not in ('new','in_progress','resolved') or p_version is null then raise exception 'feedback_invalid' using errcode='PT400'; end if;
 select * into v_old from public.teacher_feedback where id=p_id for update;
 if not found then raise exception 'feedback_not_found' using errcode='PT404'; end if;
 if v_old.version<>p_version then raise exception 'version_conflict' using errcode='PT409'; end if;
 if v_old.status=p_status then return jsonb_build_object('version',v_old.version); end if;
 update public.teacher_feedback set status=p_status,version=version+1,updated_at=clock_timestamp() where id=p_id;
 insert into private.admin_audit(actor_id,target_id,action,metadata) values(auth.uid(),p_id::text,'feedback.status',jsonb_build_object('from',v_old.status,'to',p_status));
 return jsonb_build_object('version',v_old.version+1);
end $$;
revoke all on function public.submit_teacher_feedback(uuid,text,text,text),public.teacher_feedback_list(integer,text,boolean),public.admin_feedback_status(uuid,text,integer) from public,anon;
grant execute on function public.submit_teacher_feedback(uuid,text,text,text),public.teacher_feedback_list(integer,text,boolean),public.admin_feedback_status(uuid,text,integer) to authenticated;
