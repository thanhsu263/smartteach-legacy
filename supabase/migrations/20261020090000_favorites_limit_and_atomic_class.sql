-- Bổ sung sau review phase 4.
-- 1) Giới hạn số game yêu thích và dạng id hợp lệ: trước đây một tài khoản ghi được hàng nghìn
--    dòng rác vào gói miễn phí.
-- 2) Hàm tạo lớp cùng học sinh trong một giao dịch: không còn lớp rỗng nửa vời khi mất mạng
--    giữa hai bước.

-- Dạng id game giống quy ước id trong danh mục (src/lib/catalog.test.ts kiểm tra cùng biểu thức).
alter table public.favorites
  add constraint favorites_game_id_format check (game_id ~ '^[a-z0-9]+(-[a-z0-9]+)*$');

-- Tối đa 100 game yêu thích mỗi giáo viên (số 100 cũng nằm ở src/lib/classes/limits.ts).
create function public.enforce_favorite_limit()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  perform pg_advisory_xact_lock(hashtextextended('favorites:' || new.owner_id::text, 0));
  if (select count(*) from public.favorites where owner_id = new.owner_id) >= 100 then
    raise exception 'favorite_limit_exceeded' using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger favorites_limit before insert on public.favorites
  for each row execute function public.enforce_favorite_limit();

revoke execute on function public.enforce_favorite_limit() from public, anon, authenticated;

-- Tạo lớp và học sinh cùng lúc. Chạy với quyền của người gọi nên RLS, ràng buộc và các giới hạn
-- (20 lớp, 100 học sinh) vẫn áp dụng; lỗi ở bước nào thì cả giao dịch bị hoàn tác.
create function public.create_class_with_students(class_name text, student_names text[] default '{}')
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  new_id uuid;
begin
  insert into public.classes (name) values (class_name) returning id into new_id;

  insert into public.students (class_id, name, position)
  select new_id, item.student_name, (item.ordinal - 1)::integer
  from unnest(coalesce(student_names, '{}'::text[])) with ordinality as item(student_name, ordinal);

  return new_id;
end;
$$;

revoke execute on function public.create_class_with_students(text, text[]) from public, anon;
grant execute on function public.create_class_with_students(text, text[]) to authenticated;
