-- Phase 08: kho học liệu được kiểm duyệt. Snapshot giữ nguyên quiz tại thời điểm gửi;
-- chỉ các RPC public đã lọc đáp án mới được cấp cho anon.

create table public.quiz_publications (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  quiz_id uuid references public.quizzes(id) on delete set null,
  quiz_snapshot jsonb not null,
  title text not null,
  description text not null default '',
  subject text not null check (subject in ('toan','ngu-van','tieng-anh','khoa-hoc-tu-nhien','lich-su-dia-li','tin-hoc')),
  grades text[] not null check (cardinality(grades) between 1 and 13 and grades <@ array['1','2','3','4','5','6','7','8','9','10','11','12','dai-hoc']::text[]),
  status text not null default 'draft' check (status in ('draft','pending','approved','rejected','hidden')),
  review_reason text,
  submitted_at timestamptz,
  reviewed_at timestamptz,
  published_at timestamptz,
  hidden_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint quiz_publications_title_length check (char_length(btrim(title)) between 1 and 100),
  constraint quiz_publications_description_length check (char_length(description) <= 1000),
  constraint quiz_publications_snapshot_questions check (jsonb_typeof(quiz_snapshot -> 'questions') = 'array' and jsonb_array_length(quiz_snapshot -> 'questions') between 1 and 50)
);
create index quiz_publications_browse_idx on public.quiz_publications (published_at desc, id desc) where status = 'approved';
create index quiz_publications_subject_idx on public.quiz_publications (subject, published_at desc) where status = 'approved';
create index quiz_publications_grades_idx on public.quiz_publications using gin (grades) where status = 'approved';

create table public.publication_reports (
  id uuid primary key default gen_random_uuid(),
  publication_id uuid not null references public.quiz_publications(id) on delete cascade,
  reporter_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  reason text not null check (reason in ('copyright','inaccurate','inappropriate','other')),
  note text not null default '' check (char_length(note) <= 500),
  created_at timestamptz not null default now(),
  unique (publication_id, reporter_id)
);

alter table public.quiz_publications enable row level security;
alter table public.publication_reports enable row level security;
revoke all on public.quiz_publications, public.publication_reports from anon, authenticated;

create function private.publication_quiz_snapshot(p_quiz_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_snapshot jsonb;
begin
  if not exists (select 1 from public.quizzes where id = p_quiz_id and owner_id = (select auth.uid())) then
    raise exception 'quiz_not_found' using errcode = 'PT404';
  end if;
  if exists (select 1 from public.quiz_problems(p_quiz_id)) then
    raise exception 'publication_quiz_invalid' using errcode = '23514';
  end if;
  select jsonb_build_object('questions', coalesce(jsonb_agg(jsonb_build_object(
    'kind', q.kind, 'prompt', q.prompt, 'time_limit_seconds', q.time_limit_seconds,
    'accepted_answers', q.accepted_answers, 'ignore_diacritics', q.ignore_diacritics,
    'options', coalesce((select jsonb_agg(jsonb_build_object('label', o.label, 'is_correct', o.is_correct) order by o.position) from public.options o where o.question_id=q.id), '[]'::jsonb)
  ) order by q.position), '[]'::jsonb)) into v_snapshot
  from public.questions q where q.quiz_id=p_quiz_id;
  return v_snapshot;
end; $$;

create function public.submit_quiz_publication(p_quiz_id uuid, p_title text, p_description text, p_subject text, p_grades text[])
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_owner uuid := (select auth.uid()); v_snapshot jsonb; v_id uuid;
begin
  if v_owner is null then raise exception 'not_authenticated' using errcode='42501'; end if;
  if p_subject not in ('toan','ngu-van','tieng-anh','khoa-hoc-tu-nhien','lich-su-dia-li','tin-hoc') or cardinality(p_grades) < 1 then raise exception 'publication_invalid' using errcode='23514'; end if;
  select private.publication_quiz_snapshot(p_quiz_id) into v_snapshot;
  insert into public.quiz_publications (owner_id, quiz_id, quiz_snapshot, title, description, subject, grades, status, submitted_at)
  values (v_owner, p_quiz_id, v_snapshot, btrim(p_title), p_description, p_subject, p_grades, 'pending', now()) returning id into v_id;
  return v_id;
end; $$;

create function public.withdraw_quiz_publication(p_publication uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.quiz_publications set status='draft', submitted_at=null, review_reason=null, updated_at=now()
  where id=p_publication and owner_id=(select auth.uid()) and status in ('draft','pending','rejected');
  if not found then raise exception 'publication_not_editable' using errcode='PT404'; end if;
end; $$;

create function public.update_quiz_publication(p_publication uuid, p_title text, p_description text, p_subject text, p_grades text[])
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.quiz_publications set title=btrim(p_title), description=p_description, subject=p_subject, grades=p_grades, status='draft', review_reason=null, updated_at=now()
  where id=p_publication and owner_id=(select auth.uid()) and status in ('draft','rejected');
  if not found then raise exception 'publication_not_editable' using errcode='PT404'; end if;
end; $$;

create function public.resubmit_quiz_publication(p_publication uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.quiz_publications set status='pending', submitted_at=now(), reviewed_at=null, review_reason=null, updated_at=now()
  where id=p_publication and owner_id=(select auth.uid()) and status in ('draft','rejected');
  if not found then raise exception 'publication_not_editable' using errcode='PT404'; end if;
end; $$;

create function public.own_quiz_publications(p_quiz_id uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if (select auth.uid()) is null then raise exception 'not_authenticated' using errcode='42501'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object('id',id,'status',status,'title',title,'description',description,'subject',subject,'grades',grades,'review_reason',review_reason,'submitted_at',submitted_at) order by created_at desc) from public.quiz_publications where quiz_id=p_quiz_id and owner_id=(select auth.uid())),'[]'::jsonb);
end; $$;

create function public.library_browse(p_query text default '', p_subject text default null, p_grade text default null, p_limit integer default 24, p_offset integer default 0)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_rows jsonb; v_total integer;
begin
  if char_length(btrim(p_query)) > 80 or p_limit not between 1 and 24 or p_offset < 0 then raise exception 'library_query_invalid' using errcode='22023'; end if;
  select count(*) into v_total from public.quiz_publications p where p.status='approved' and (p_subject is null or p.subject=p_subject) and (p_grade is null or p_grade=any(p.grades)) and (p_query='' or lower(p.title || ' ' || p.description) like '%' || lower(p_query) || '%');
  select coalesce(jsonb_agg(jsonb_build_object('id',p.id,'title',p.title,'description',p.description,'subject',p.subject,'grades',p.grades,'question_count',jsonb_array_length(p.quiz_snapshot->'questions'),'published_at',p.published_at) order by p.published_at desc,p.id desc),'[]'::jsonb) into v_rows from (select * from public.quiz_publications p where p.status='approved' and (p_subject is null or p.subject=p_subject) and (p_grade is null or p_grade=any(p.grades)) and (p_query='' or lower(p.title || ' ' || p.description) like '%' || lower(p_query) || '%') order by p.published_at desc,p.id desc limit p_limit offset p_offset) p;
  return jsonb_build_object('items',v_rows,'total',v_total,'has_more',v_total > p_offset + p_limit);
end; $$;

create function public.library_preview(p_publication uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  return (select jsonb_build_object('id',p.id,'title',p.title,'description',p.description,'subject',p.subject,'grades',p.grades,'questions',coalesce((select jsonb_agg(jsonb_build_object('kind',q.value->>'kind','prompt',q.value->>'prompt','time_limit_seconds',(q.value->>'time_limit_seconds')::integer,'options',coalesce((select jsonb_agg(jsonb_build_object('label',o.value->>'label') order by o.ordinality) from jsonb_array_elements(q.value->'options') with ordinality o(value,ordinality)),'[]'::jsonb)) order by q.ordinality) from jsonb_array_elements(p.quiz_snapshot->'questions') with ordinality q(value,ordinality)),'[]'::jsonb)) from public.quiz_publications p where p.id=p_publication and p.status='approved');
end; $$;

create function public.report_publication(p_publication uuid, p_reason text, p_note text default '')
returns void language plpgsql security definer set search_path = '' as $$
begin
  if (select auth.uid()) is null then raise exception 'not_authenticated' using errcode='42501'; end if;
  if not exists(select 1 from public.quiz_publications where id=p_publication and status='approved') then return; end if;
  insert into public.publication_reports(publication_id,reporter_id,reason,note) values(p_publication,(select auth.uid()),p_reason,left(p_note,500)) on conflict(publication_id,reporter_id) do nothing;
end; $$;

create function private.copy_publication_snapshot(p_snapshot jsonb, p_owner uuid, p_title text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_quiz uuid; v_question jsonb; v_option jsonb; v_question_id uuid; v_position integer := 0; v_option_position integer;
begin
  insert into public.quizzes(owner_id,title) values(p_owner,p_title) returning id into v_quiz;
  for v_question in select value from jsonb_array_elements(p_snapshot->'questions') loop
    insert into public.questions(quiz_id,position,kind,prompt,time_limit_seconds,accepted_answers,ignore_diacritics)
    values(v_quiz,v_position,v_question->>'kind',v_question->>'prompt',(v_question->>'time_limit_seconds')::integer,coalesce(array(select jsonb_array_elements_text(v_question->'accepted_answers')),'{}'::text[]),coalesce((v_question->>'ignore_diacritics')::boolean,false)) returning id into v_question_id;
    v_option_position := 0;
    for v_option in select value from jsonb_array_elements(v_question->'options') loop
      insert into public.options(question_id,position,label,is_correct) values(v_question_id,v_option_position,v_option->>'label',coalesce((v_option->>'is_correct')::boolean,false));
      v_option_position := v_option_position + 1;
    end loop;
    v_position := v_position + 1;
  end loop;
  return v_quiz;
end; $$;

create function public.clone_library_publication(p_publication uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_owner uuid := (select auth.uid()); v_snapshot jsonb; v_title text;
begin
  if v_owner is null then raise exception 'not_authenticated' using errcode='42501'; end if;
  select quiz_snapshot,title into v_snapshot,v_title from public.quiz_publications where id=p_publication and status='approved';
  if not found then raise exception 'publication_not_found' using errcode='PT404'; end if;
  return private.copy_publication_snapshot(v_snapshot,v_owner,left(v_title,90) || ' (bản sao)');
end; $$;

create function public.moderate_quiz_publication(p_publication uuid, p_status text, p_reason text default null)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if (select auth.role()) <> 'service_role' then raise exception 'not_authorized' using errcode='42501'; end if;
  if p_status not in ('approved','rejected','hidden') then raise exception 'moderation_status_invalid' using errcode='23514'; end if;
  update public.quiz_publications set status=p_status, review_reason=left(p_reason,500), reviewed_at=now(), published_at=case when p_status='approved' then now() else published_at end, hidden_at=case when p_status='hidden' then now() else hidden_at end, updated_at=now() where id=p_publication;
  if not found then raise exception 'publication_not_found' using errcode='PT404'; end if;
end; $$;

revoke all on function private.publication_quiz_snapshot(uuid) from public, anon, authenticated;
revoke all on function private.copy_publication_snapshot(jsonb,uuid,text) from public, anon, authenticated;
revoke all on function public.moderate_quiz_publication(uuid,text,text) from public, anon, authenticated;
revoke all on function public.submit_quiz_publication(uuid,text,text,text,text[]), public.withdraw_quiz_publication(uuid), public.update_quiz_publication(uuid,text,text,text,text[]), public.resubmit_quiz_publication(uuid), public.own_quiz_publications(uuid), public.report_publication(uuid,text,text), public.clone_library_publication(uuid) from public, anon;
revoke all on function public.library_browse(text,text,text,integer,integer), public.library_preview(uuid) from public;
grant execute on function public.submit_quiz_publication(uuid,text,text,text,text[]), public.withdraw_quiz_publication(uuid), public.update_quiz_publication(uuid,text,text,text,text[]), public.resubmit_quiz_publication(uuid), public.own_quiz_publications(uuid), public.report_publication(uuid,text,text), public.clone_library_publication(uuid) to authenticated;
grant execute on function public.library_browse(text,text,text,integer,integer), public.library_preview(uuid) to anon, authenticated;
