create table public.exams (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
 request_id uuid not null, title text not null check(length(btrim(title)) between 1 and 100), description text not null default '' check(length(description)<=1000),
 document jsonb not null, revision integer not null default 1, created_at timestamptz not null default clock_timestamp(), updated_at timestamptz not null default clock_timestamp(), unique(owner_id,request_id)
);
create index exams_owner_updated on public.exams(owner_id,updated_at desc);
alter table public.exams enable row level security;
revoke all on public.exams from public,anon,authenticated;

create function private.validate_exam_document(p_doc jsonb,p_complete boolean default false)
returns void language plpgsql set search_path='' as $$
declare s jsonb; q jsonb; o jsonb; a jsonb; n integer:=0; pts numeric:=0; ids text[]:='{}';
begin
 if p_doc is null or jsonb_typeof(p_doc)<>'object' or p_doc->>'schemaVersion' is distinct from '1' or octet_length(p_doc::text)>262144
 or jsonb_typeof(p_doc->'durationMinutes') is distinct from 'number' or (p_doc->>'durationMinutes')::numeric not between 1 and 180 or (p_doc->>'durationMinutes')::numeric<>trunc((p_doc->>'durationMinutes')::numeric)
 or jsonb_typeof(p_doc->'sections') is distinct from 'array' then raise exception 'exam_invalid' using errcode='PT400'; end if;
 if jsonb_array_length(p_doc->'sections')>10 then raise exception 'exam_invalid' using errcode='PT400'; end if;
 for s in select value from jsonb_array_elements(p_doc->'sections') loop
  if jsonb_typeof(s)<>'object' or jsonb_typeof(s->'id') is distinct from 'string' or s->>'id'=any(ids) or jsonb_typeof(s->'title') is distinct from 'string' or length(s->>'title')>100 or jsonb_typeof(s->'questions') is distinct from 'array' then raise exception 'exam_invalid' using errcode='PT400'; end if;
  ids:=array_append(ids,s->>'id');
  if p_complete and (btrim(s->>'title')='' or jsonb_array_length(s->'questions')=0) then raise exception 'exam_incomplete' using errcode='PT400'; end if;
  for q in select value from jsonb_array_elements(s->'questions') loop
   n:=n+1;
   if jsonb_typeof(q)<>'object' or jsonb_typeof(q->'id') is distinct from 'string' or q->>'id'=any(ids) or coalesce(q->>'kind','') not in ('single','multi','true_false','short_text')
   or jsonb_typeof(q->'prompt') is distinct from 'string' or length(q->>'prompt')>500 or jsonb_typeof(q->'ignore_diacritics') is distinct from 'boolean'
   or jsonb_typeof(q->'options') is distinct from 'array' or jsonb_typeof(q->'accepted_answers') is distinct from 'array' then raise exception 'exam_invalid' using errcode='PT400'; end if;
   ids:=array_append(ids,q->>'id');
   if jsonb_array_length(q->'options')>6 or jsonb_array_length(q->'accepted_answers')>10 then raise exception 'exam_invalid' using errcode='PT400'; end if;
   for o in select value from jsonb_array_elements(q->'options') loop
    if jsonb_typeof(o)<>'object' or jsonb_typeof(o->'label') is distinct from 'string' or length(o->>'label')>150 or jsonb_typeof(o->'is_correct') is distinct from 'boolean' then raise exception 'exam_invalid' using errcode='PT400'; end if;
   end loop;
   for a in select value from jsonb_array_elements(q->'accepted_answers') loop
    if jsonb_typeof(a)<>'string' or length(a#>>'{}')>100 then raise exception 'exam_invalid' using errcode='PT400'; end if;
   end loop;
   if q->'pointUnits' is null then raise exception 'exam_invalid' using errcode='PT400'; end if;
   if q->'pointUnits'<>'null'::jsonb then
    if jsonb_typeof(q->'pointUnits')<>'number' or (q->>'pointUnits')::numeric not between 1 and 10000 or (q->>'pointUnits')::numeric<>trunc((q->>'pointUnits')::numeric) then raise exception 'exam_invalid' using errcode='PT400'; end if;
    pts:=pts+(q->>'pointUnits')::numeric;
   end if;
   if p_complete then
    if btrim(q->>'prompt')='' or q->'pointUnits'='null'::jsonb then raise exception 'exam_incomplete' using errcode='PT400'; end if;
    if q->>'kind'='short_text' then
     if jsonb_array_length(q->'accepted_answers')=0 or exists(select 1 from jsonb_array_elements_text(q->'accepted_answers') x where btrim(x)='') then raise exception 'exam_incomplete' using errcode='PT400'; end if;
    else
     if jsonb_array_length(q->'options')<2 or exists(select 1 from jsonb_array_elements(q->'options') x where btrim(x->>'label')='')
     or (select count(distinct lower(btrim(x->>'label'))) from jsonb_array_elements(q->'options') x)<>jsonb_array_length(q->'options')
     or (select count(*) from jsonb_array_elements(q->'options') x where (x->>'is_correct')::boolean)=0 then raise exception 'exam_incomplete' using errcode='PT400'; end if;
     if q->>'kind'<>'multi' and (select count(*) from jsonb_array_elements(q->'options') x where (x->>'is_correct')::boolean)<>1 then raise exception 'exam_incomplete' using errcode='PT400'; end if;
     if q->>'kind'='true_false' and (jsonb_array_length(q->'options')<>2 or not exists(select 1 from jsonb_array_elements(q->'options') x where x->>'label'='Đúng') or not exists(select 1 from jsonb_array_elements(q->'options') x where x->>'label'='Sai')) then raise exception 'exam_incomplete' using errcode='PT400'; end if;
    end if;
   end if;
  end loop;
 end loop;
 if n>50 or pts>500000 or (p_complete and n=0) then raise exception 'exam_incomplete' using errcode='PT400'; end if;
end $$;
revoke all on function private.validate_exam_document(jsonb,boolean) from public,anon,authenticated;
create function public.exam_detail(p_exam uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare r public.exams;
begin perform private.require_active_user(); select * into r from public.exams where id=p_exam and owner_id=auth.uid(); if not found then raise exception 'exam_not_found' using errcode='PT404'; end if;
 return jsonb_build_object('id',r.id,'title',r.title,'description',r.description,'document',r.document,'revision',r.revision,'updatedAt',r.updated_at);
end $$;
create function public.exam_list(p_offset integer default 0) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare items jsonb; total integer;
begin perform private.require_active_user(); if p_offset is null or p_offset<0 or p_offset>100000 then raise exception 'exam_invalid' using errcode='PT400'; end if;
 select count(*) into total from public.exams where owner_id=auth.uid();
 select coalesce(jsonb_agg(r),'[]'::jsonb) into items from(select id,title,revision,updated_at as "updatedAt",(select coalesce(sum(jsonb_array_length(s->'questions')),0) from jsonb_array_elements(document->'sections')s) as "questionCount" from public.exams where owner_id=auth.uid() order by updated_at desc,id desc limit 20 offset p_offset)r;
 return jsonb_build_object('items',items,'total',total,'nextOffset',case when p_offset+20<total then p_offset+20 else null end);
end $$;
create function public.save_exam(p_exam uuid,p_revision integer,p_request uuid,p_title text,p_description text,p_document jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare r public.exams;
begin
 perform private.require_active_user(); if auth.uid() is null then raise exception 'sign_in_required' using errcode='42501'; end if;
 if p_title is null or length(btrim(p_title)) not between 1 and 100 or p_description is null or length(p_description)>1000 or p_request is null then raise exception 'exam_invalid' using errcode='PT400'; end if;
 perform private.validate_exam_document(p_document,false);
 perform pg_advisory_xact_lock(hashtextextended('exams:'||auth.uid()::text,0));
 if p_exam is null then
  select * into r from public.exams where owner_id=auth.uid() and request_id=p_request;
  if found then
   if r.title is distinct from btrim(p_title) or r.description is distinct from p_description or r.document is distinct from p_document then raise exception 'request_conflict' using errcode='PT409'; end if;
   return public.exam_detail(r.id);
  end if;
  if (select count(*) from public.exams where owner_id=auth.uid())>=50 then raise exception 'exam_capacity' using errcode='PT413'; end if;
  insert into public.exams(owner_id,request_id,title,description,document) values(auth.uid(),p_request,btrim(p_title),p_description,p_document) returning * into r;
 else
  select * into r from public.exams where id=p_exam and owner_id=auth.uid() for update;
  if not found then raise exception 'exam_not_found' using errcode='PT404'; end if;
  if p_revision is null or p_revision<>r.revision then raise exception 'version_conflict' using errcode='PT409'; end if;
  update public.exams set title=btrim(p_title),description=p_description,document=p_document,revision=revision+1,updated_at=clock_timestamp() where id=r.id returning * into r;
 end if;
 return public.exam_detail(r.id);
end $$;
create function public.delete_exam(p_exam uuid,p_revision integer) returns void language plpgsql security definer set search_path='' as $$
declare r public.exams;
begin perform private.require_active_user(); select * into r from public.exams where id=p_exam and owner_id=auth.uid() for update; if not found then raise exception 'exam_not_found' using errcode='PT404'; end if;
 if p_revision is null or p_revision<>r.revision then raise exception 'version_conflict' using errcode='PT409'; end if; delete from public.exams where id=r.id;
end $$;
revoke all on function public.exam_detail(uuid),public.exam_list(integer),public.save_exam(uuid,integer,uuid,text,text,jsonb),public.delete_exam(uuid,integer) from public,anon;
grant execute on function public.exam_detail(uuid),public.exam_list(integer),public.save_exam(uuid,integer,uuid,text,text,jsonb),public.delete_exam(uuid,integer) to authenticated;
