-- Giai đoạn 3, phase 05: lõi bài giao cho giáo viên.
--
-- Assignment là bản chụp bất biến của quiz tại lúc tạo. Học sinh chưa có quyền
-- truy cập ở phase này: bảng deny-by-default và teacher chỉ dùng RPC đã kiểm tra
-- ownership. Credential/attempt/answer sẽ được thêm ở migration phase 06.

create table public.assignments (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  class_id uuid not null references public.classes (id) on delete cascade,
  -- Giữ snapshot khi quiz gốc bị xoá; liên kết chỉ là tham chiếu tiện ích cho giáo viên.
  quiz_id uuid references public.quizzes (id) on delete set null,
  title text not null,
  description text not null default '',
  quiz_snapshot jsonb not null,
  -- Mã công khai chỉ xác định bài ở bước exchange Phase 06, không phải credential học sinh.
  public_code text not null,
  opens_at timestamptz,
  due_at timestamptz,
  reveal_policy text not null default 'after_close',
  status text not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  closed_at timestamptz,
  constraint assignments_title_length check (char_length(btrim(title)) between 1 and 100),
  constraint assignments_description_length check (char_length(description) <= 1000),
  constraint assignments_public_code_shape check (public_code ~ '^[A-F0-9]{10}$'),
  constraint assignments_schedule check (opens_at is null or due_at is null or due_at > opens_at),
  constraint assignments_reveal_policy check (reveal_policy in ('immediate', 'after_close')),
  constraint assignments_status check (status in ('draft', 'published', 'closed')),
  constraint assignments_closed_at check (
    (status = 'closed' and closed_at is not null) or (status <> 'closed' and closed_at is null)
  )
);

create unique index assignments_public_code_key on public.assignments (public_code);
create index assignments_owner_created_idx on public.assignments (owner_id, created_at desc, id desc);
create index assignments_class_status_idx on public.assignments (class_id, status, created_at desc);
create index assignments_status_due_idx on public.assignments (status, due_at) where status = 'published';
create index assignments_closed_at_idx on public.assignments (closed_at) where status = 'closed';

-- Không cho đổi liên kết, mã, hoặc snapshot sau khi assignment đã được tạo. Các field
-- chỉnh được ở draft (title/description/schedule/policy) vẫn do RPC chuyên biệt kiểm soát.
create function public.forbid_assignment_identity_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.owner_id is distinct from old.owner_id
     or new.class_id is distinct from old.class_id
     -- FK on delete set null phải giữ được snapshot sau khi quiz nguồn bị xoá.
     or (new.quiz_id is distinct from old.quiz_id and not (old.quiz_id is not null and new.quiz_id is null))
     or new.quiz_snapshot is distinct from old.quiz_snapshot
     or new.public_code is distinct from old.public_code then
    raise exception 'assignment_identity_change_forbidden' using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger assignments_identity_immutable before update on public.assignments
  for each row execute function public.forbid_assignment_identity_change();
create trigger assignments_touch before update on public.assignments
  for each row execute function public.touch_updated_at();

-- Ràng buộc số assignment để danh sách/snapshot luôn có bound rõ ràng. Advisory lock
-- khiến các request đồng thời không cùng vượt 100 bài của một giáo viên.
create function public.enforce_assignment_limit()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  perform pg_advisory_xact_lock(hashtextextended('assignments:' || new.owner_id::text, 0));
  if (select count(*) from public.assignments where owner_id = new.owner_id) >= 100 then
    raise exception 'assignment_limit_exceeded' using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger assignments_limit before insert on public.assignments
  for each row execute function public.enforce_assignment_limit();

-- Bản chụp đầy đủ key chỉ dùng trong bảng teacher-only. Phase 06 sẽ tạo payload public
-- riêng từ snapshot để không đưa đáp án ra boundary học sinh.
create function private.assignment_quiz_snapshot(p_quiz_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'title', z.title,
    'questions', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'kind', q.kind,
          'prompt', q.prompt,
          'time_limit_seconds', q.time_limit_seconds,
          'accepted_answers', to_jsonb(q.accepted_answers),
          'ignore_diacritics', q.ignore_diacritics,
          'options', coalesce((
            select jsonb_agg(jsonb_build_object('label', o.label, 'is_correct', o.is_correct) order by o.position, o.id)
            from public.options o where o.question_id = q.id
          ), '[]'::jsonb)
        ) order by q.position, q.created_at, q.id
      ) from public.questions q where q.quiz_id = z.id
    ), '[]'::jsonb)
  )
  from public.quizzes z where z.id = p_quiz_id;
$$;

-- Phase 10 có thể gọi scheduled path; hiện tại tạo bài là điểm opportunistic an toàn,
-- chỉ xoá các bài closed quá 365 ngày theo từng mẻ bounded.
create function private.purge_old_assignments(p_days integer default 365, p_owner uuid default null, p_limit integer default null)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  if p_days is null or p_days < 1 then
    raise exception 'invalid_retention' using errcode = '22023';
  end if;

  with doomed as (
    select id from public.assignments
    where status = 'closed'
      and closed_at < clock_timestamp() - make_interval(days => p_days)
      and (p_owner is null or owner_id = p_owner)
    order by closed_at, id
    limit coalesce(p_limit, 2147483647)
  )
  delete from public.assignments a using doomed d where a.id = d.id;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

create function public.create_assignment(
  p_class_id uuid,
  p_quiz_id uuid,
  p_title text,
  p_description text default '',
  p_opens_at timestamptz default null,
  p_due_at timestamptz default null,
  p_reveal_policy text default 'after_close'
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner uuid := (select auth.uid());
  v_snapshot jsonb;
  v_id uuid;
  v_code text;
  v_constraint text;
begin
  if v_owner is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('assignment-create:' || v_owner::text, 0));
  perform private.purge_old_assignments(365, v_owner);
  perform private.purge_old_assignments(365, null, 50);

  perform 1 from public.classes where id = p_class_id and owner_id = v_owner;
  if not found then
    raise exception 'class_not_found' using errcode = 'PT404';
  end if;
  perform 1 from public.quizzes where id = p_quiz_id and owner_id = v_owner;
  if not found then
    raise exception 'quiz_not_found' using errcode = 'PT404';
  end if;
  if exists (select 1 from public.quiz_problems(p_quiz_id)) then
    raise exception 'quiz_not_playable' using errcode = 'PT409';
  end if;
  if p_due_at is not null and p_due_at <= coalesce(p_opens_at, clock_timestamp()) then
    raise exception 'assignment_schedule_invalid' using errcode = 'PT400';
  end if;

  select private.assignment_quiz_snapshot(p_quiz_id) into v_snapshot;
  if v_snapshot is null or jsonb_array_length(v_snapshot -> 'questions') not between 1 and 50 then
    raise exception 'quiz_not_playable' using errcode = 'PT409';
  end if;

  for v_try in 1 .. 20 loop
    v_code := upper(substr(encode(extensions.gen_random_bytes(8), 'hex'), 1, 10));
    begin
      insert into public.assignments (
        owner_id, class_id, quiz_id, title, description, quiz_snapshot, public_code, opens_at, due_at, reveal_policy
      ) values (
        v_owner, p_class_id, p_quiz_id, btrim(p_title), coalesce(p_description, ''), v_snapshot, v_code,
        p_opens_at, p_due_at, coalesce(p_reveal_policy, 'after_close')
      ) returning id into v_id;
      return v_id;
    exception when unique_violation then
      get stacked diagnostics v_constraint = constraint_name;
      if v_constraint is distinct from 'assignments_public_code_key' then raise; end if;
    end;
  end loop;
  raise exception 'assignment_code_unavailable' using errcode = 'PT503';
end;
$$;

create function public.update_assignment_draft(
  p_assignment uuid,
  p_title text,
  p_description text default '',
  p_opens_at timestamptz default null,
  p_due_at timestamptz default null,
  p_reveal_policy text default 'after_close'
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then raise exception 'not_authenticated' using errcode = '42501'; end if;
  if p_due_at is not null and p_due_at <= coalesce(p_opens_at, clock_timestamp()) then
    raise exception 'assignment_schedule_invalid' using errcode = 'PT400';
  end if;
  update public.assignments
  set title = btrim(p_title), description = coalesce(p_description, ''), opens_at = p_opens_at,
      due_at = p_due_at, reveal_policy = coalesce(p_reveal_policy, 'after_close')
  where id = p_assignment and owner_id = (select auth.uid()) and status = 'draft';
  if not found then
    if exists (select 1 from public.assignments where id = p_assignment and owner_id = (select auth.uid())) then
      raise exception 'assignment_not_editable' using errcode = 'PT409';
    end if;
    raise exception 'assignment_not_found' using errcode = 'PT404';
  end if;
end;
$$;

create function public.publish_assignment(p_assignment uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then raise exception 'not_authenticated' using errcode = '42501'; end if;
  update public.assignments set status = 'published'
  where id = p_assignment and owner_id = (select auth.uid()) and status = 'draft';
  if not found then
    if exists (select 1 from public.assignments where id = p_assignment and owner_id = (select auth.uid())) then
      raise exception 'assignment_not_publishable' using errcode = 'PT409';
    end if;
    raise exception 'assignment_not_found' using errcode = 'PT404';
  end if;
end;
$$;

create function public.close_assignment(p_assignment uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then raise exception 'not_authenticated' using errcode = '42501'; end if;
  update public.assignments set status = 'closed', closed_at = clock_timestamp()
  where id = p_assignment and owner_id = (select auth.uid()) and status = 'published';
  if not found then
    if exists (select 1 from public.assignments where id = p_assignment and owner_id = (select auth.uid())) then
      raise exception 'assignment_not_closable' using errcode = 'PT409';
    end if;
    raise exception 'assignment_not_found' using errcode = 'PT404';
  end if;
end;
$$;

create function public.delete_assignment(p_assignment uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then raise exception 'not_authenticated' using errcode = '42501'; end if;
  delete from public.assignments where id = p_assignment and owner_id = (select auth.uid());
  if not found then raise exception 'assignment_not_found' using errcode = 'PT404'; end if;
end;
$$;

create function public.assignment_list(p_status text default null, p_limit integer default 50, p_offset integer default 0)
returns table (
  id uuid, class_id uuid, class_name text, quiz_id uuid, title text, public_code text, status text,
  opens_at timestamptz, due_at timestamptz, reveal_policy text, created_at timestamptz, updated_at timestamptz, closed_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select a.id, a.class_id, c.name, a.quiz_id, a.title, a.public_code, a.status,
         a.opens_at, a.due_at, a.reveal_policy, a.created_at, a.updated_at, a.closed_at
  from public.assignments a join public.classes c on c.id = a.class_id
  where a.owner_id = (select auth.uid())
    and (p_status is null or a.status = p_status)
  order by a.created_at desc, a.id desc
  limit least(greatest(coalesce(p_limit, 50), 1), 100)
  offset greatest(coalesce(p_offset, 0), 0);
$$;

create function public.assignment_detail(p_assignment uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', a.id, 'class_id', a.class_id, 'class_name', c.name, 'quiz_id', a.quiz_id,
    'title', a.title, 'description', a.description, 'public_code', a.public_code,
    'snapshot', a.quiz_snapshot, 'status', a.status, 'opens_at', a.opens_at, 'due_at', a.due_at,
    'reveal_policy', a.reveal_policy, 'created_at', a.created_at, 'updated_at', a.updated_at, 'closed_at', a.closed_at
  )
  from public.assignments a join public.classes c on c.id = a.class_id
  where a.id = p_assignment and a.owner_id = (select auth.uid());
$$;

revoke all on public.assignments from anon, authenticated;
alter table public.assignments enable row level security;

revoke execute on function
  public.forbid_assignment_identity_change(),
  public.enforce_assignment_limit(),
  private.assignment_quiz_snapshot(uuid),
  private.purge_old_assignments(integer, uuid, integer)
  from public, anon, authenticated;

revoke execute on function
  public.create_assignment(uuid, uuid, text, text, timestamptz, timestamptz, text),
  public.update_assignment_draft(uuid, text, text, timestamptz, timestamptz, text),
  public.publish_assignment(uuid),
  public.close_assignment(uuid),
  public.delete_assignment(uuid),
  public.assignment_list(text, integer, integer),
  public.assignment_detail(uuid)
  from public, anon;
grant execute on function
  public.create_assignment(uuid, uuid, text, text, timestamptz, timestamptz, text),
  public.update_assignment_draft(uuid, text, text, timestamptz, timestamptz, text),
  public.publish_assignment(uuid),
  public.close_assignment(uuid),
  public.delete_assignment(uuid),
  public.assignment_list(text, integer, integer),
  public.assignment_detail(uuid)
  to authenticated;
