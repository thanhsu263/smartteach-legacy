-- Lớp, học sinh và game yêu thích của giáo viên (phase 4).
-- Mỗi giáo viên chỉ đọc và sửa được dữ liệu của chính mình; việc này do cơ sở dữ liệu
-- bảo đảm bằng row level security, không dựa vào giao diện.
-- Học sinh chỉ lưu tên: không lưu thông tin nào khác của trẻ em.

-- Giới hạn bảo vệ gói miễn phí: 20 lớp mỗi giáo viên, 100 học sinh mỗi lớp,
-- tên tối đa 100 ký tự. Số liệu 20 và 100 nằm ở hai hàm trigger bên dưới.

create table public.classes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  constraint classes_name_length check (char_length(btrim(name)) between 1 and 100)
);

create index classes_owner_id_idx on public.classes (owner_id);

create table public.students (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes (id) on delete cascade,
  name text not null,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  constraint students_name_length check (char_length(btrim(name)) between 1 and 100)
);

create index students_class_id_position_idx on public.students (class_id, position);

-- game_id là id trong danh mục game của ứng dụng (src/data/games.ts), không có khoá ngoại.
create table public.favorites (
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  game_id text not null,
  created_at timestamptz not null default now(),
  primary key (owner_id, game_id),
  constraint favorites_game_id_length check (char_length(game_id) between 1 and 100)
);

-- Giới hạn số lượng. Khoá advisory theo chủ sở hữu (hoặc theo lớp) để hai lần thêm đồng thời
-- không cùng vượt giới hạn.

create function public.enforce_class_limit()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  perform pg_advisory_xact_lock(hashtextextended('classes:' || new.owner_id::text, 0));
  if (select count(*) from public.classes where owner_id = new.owner_id) >= 20 then
    raise exception 'class_limit_exceeded' using errcode = '23514';
  end if;
  return new;
end;
$$;

create function public.enforce_student_limit()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  perform pg_advisory_xact_lock(hashtextextended('students:' || new.class_id::text, 0));
  if (select count(*) from public.students where class_id = new.class_id) >= 100 then
    raise exception 'student_limit_exceeded' using errcode = '23514';
  end if;
  return new;
end;
$$;

-- Chủ lớp và lớp của học sinh không đổi được sau khi tạo, nên không thể "chuyển" dữ liệu
-- sang người khác hay né giới hạn bằng cách chuyển học sinh giữa các lớp.

create function public.forbid_owner_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.owner_id is distinct from old.owner_id then
    raise exception 'owner_change_forbidden' using errcode = '23514';
  end if;
  return new;
end;
$$;

create function public.forbid_class_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.class_id is distinct from old.class_id then
    raise exception 'class_change_forbidden' using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger classes_limit before insert on public.classes
  for each row execute function public.enforce_class_limit();
create trigger classes_owner_immutable before update on public.classes
  for each row execute function public.forbid_owner_change();
create trigger students_limit before insert on public.students
  for each row execute function public.enforce_student_limit();
create trigger students_class_immutable before update on public.students
  for each row execute function public.forbid_class_change();

-- Hàm trigger không cần gọi được qua API.
revoke execute on function
  public.enforce_class_limit(),
  public.enforce_student_limit(),
  public.forbid_owner_change(),
  public.forbid_class_change()
  from public, anon, authenticated;

-- Quyền truy cập: chỉ người đã đăng nhập, và chỉ qua các chính sách bên dưới.
revoke all on public.classes, public.students, public.favorites from anon, authenticated;
grant select, insert, update, delete on public.classes, public.students, public.favorites to authenticated;

alter table public.classes enable row level security;
alter table public.students enable row level security;
alter table public.favorites enable row level security;

create policy classes_select_own on public.classes for select to authenticated
  using (owner_id = (select auth.uid()));
create policy classes_insert_own on public.classes for insert to authenticated
  with check (owner_id = (select auth.uid()));
create policy classes_update_own on public.classes for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));
create policy classes_delete_own on public.classes for delete to authenticated
  using (owner_id = (select auth.uid()));

create policy students_select_own on public.students for select to authenticated
  using (exists (
    select 1 from public.classes c
    where c.id = students.class_id and c.owner_id = (select auth.uid())
  ));
create policy students_insert_own on public.students for insert to authenticated
  with check (exists (
    select 1 from public.classes c
    where c.id = students.class_id and c.owner_id = (select auth.uid())
  ));
create policy students_update_own on public.students for update to authenticated
  using (exists (
    select 1 from public.classes c
    where c.id = students.class_id and c.owner_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.classes c
    where c.id = students.class_id and c.owner_id = (select auth.uid())
  ));
create policy students_delete_own on public.students for delete to authenticated
  using (exists (
    select 1 from public.classes c
    where c.id = students.class_id and c.owner_id = (select auth.uid())
  ));

create policy favorites_select_own on public.favorites for select to authenticated
  using (owner_id = (select auth.uid()));
create policy favorites_insert_own on public.favorites for insert to authenticated
  with check (owner_id = (select auth.uid()));
create policy favorites_update_own on public.favorites for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));
create policy favorites_delete_own on public.favorites for delete to authenticated
  using (owner_id = (select auth.uid()));
