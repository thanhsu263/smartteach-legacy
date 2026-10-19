-- Giai đoạn 2, phase 1: dữ liệu quiz (quiz, câu hỏi, lựa chọn), RLS, giới hạn, hàm lưu nguyên tử,
-- chia sẻ và nhân bản bằng link.
--
-- Giáo viên chỉ đọc và sửa được quiz của mình. Học sinh (vai trò anon) không có quyền nào trên các
-- bảng này; phần chơi trực tiếp (phase 3) sẽ truy cập qua hàm riêng.
-- Giới hạn: 50 quiz mỗi giáo viên, 50 câu mỗi quiz, 6 lựa chọn mỗi câu, 10 đáp án chấp nhận mỗi câu
-- (khớp src/lib/quiz/limits.ts).

create table public.quizzes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null,
  -- Mã chia sẻ; rỗng nghĩa là không chia sẻ. Bật lại chia sẻ tạo mã mới nên link cũ hết hiệu lực.
  share_token uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint quizzes_title_length check (char_length(btrim(title)) between 1 and 100)
);

create index quizzes_owner_id_idx on public.quizzes (owner_id);
create unique index quizzes_share_token_key on public.quizzes (share_token) where share_token is not null;

-- Mọi đáp án chấp nhận phải dài 1-100 ký tự và tối đa 10 đáp án.
create function public.valid_accepted_answers(answers text[])
returns boolean
language sql
immutable
set search_path = ''
as $$
  select coalesce(
    cardinality(answers) <= 10
    and not exists (select 1 from unnest(answers) as a where a is null or char_length(btrim(a)) not between 1 and 100),
    false
  );
$$;

create table public.questions (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.quizzes (id) on delete cascade,
  position integer not null default 0,
  kind text not null,
  prompt text not null,
  time_limit_seconds integer not null default 20,
  -- Chỉ dùng cho kind = 'short_text'.
  accepted_answers text[] not null default '{}',
  ignore_diacritics boolean not null default false,
  created_at timestamptz not null default now(),
  constraint questions_kind check (kind in ('single', 'true_false', 'multi', 'short_text')),
  constraint questions_prompt_length check (char_length(btrim(prompt)) between 1 and 500),
  constraint questions_time_limit check (time_limit_seconds in (10, 20, 30, 60, 90)),
  constraint questions_accepted_answers check (public.valid_accepted_answers(accepted_answers))
);

create index questions_quiz_id_position_idx on public.questions (quiz_id, position);

create table public.options (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.questions (id) on delete cascade,
  position integer not null default 0,
  label text not null,
  is_correct boolean not null default false,
  constraint options_label_length check (char_length(btrim(label)) between 1 and 150)
);

create index options_question_id_position_idx on public.options (question_id, position);

-- Giới hạn số lượng. Khoá advisory để hai lần thêm đồng thời không cùng vượt giới hạn.

create function public.enforce_quiz_limit()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  perform pg_advisory_xact_lock(hashtextextended('quizzes:' || new.owner_id::text, 0));
  if (select count(*) from public.quizzes where owner_id = new.owner_id) >= 50 then
    raise exception 'quiz_limit_exceeded' using errcode = '23514';
  end if;
  return new;
end;
$$;

create function public.enforce_question_limit()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  perform pg_advisory_xact_lock(hashtextextended('questions:' || new.quiz_id::text, 0));
  if (select count(*) from public.questions where quiz_id = new.quiz_id) >= 50 then
    raise exception 'question_limit_exceeded' using errcode = '23514';
  end if;
  return new;
end;
$$;

create function public.enforce_option_limit()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  perform pg_advisory_xact_lock(hashtextextended('options:' || new.question_id::text, 0));
  if (select count(*) from public.options where question_id = new.question_id) >= 6 then
    raise exception 'option_limit_exceeded' using errcode = '23514';
  end if;
  return new;
end;
$$;

-- Quiz của câu hỏi và câu hỏi của lựa chọn không đổi được sau khi tạo (chặn chuyển dữ liệu sang
-- người khác và né giới hạn). Chủ quiz dùng lại hàm forbid_owner_change của migration lớp học.

create function public.forbid_quiz_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.quiz_id is distinct from old.quiz_id then
    raise exception 'quiz_change_forbidden' using errcode = '23514';
  end if;
  return new;
end;
$$;

create function public.forbid_question_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.question_id is distinct from old.question_id then
    raise exception 'question_change_forbidden' using errcode = '23514';
  end if;
  return new;
end;
$$;

create function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger quizzes_limit before insert on public.quizzes
  for each row execute function public.enforce_quiz_limit();
create trigger quizzes_owner_immutable before update on public.quizzes
  for each row execute function public.forbid_owner_change();
create trigger quizzes_touch before update on public.quizzes
  for each row execute function public.touch_updated_at();
create trigger questions_limit before insert on public.questions
  for each row execute function public.enforce_question_limit();
create trigger questions_quiz_immutable before update on public.questions
  for each row execute function public.forbid_quiz_change();
create trigger options_limit before insert on public.options
  for each row execute function public.enforce_option_limit();
create trigger options_question_immutable before update on public.options
  for each row execute function public.forbid_question_change();

revoke execute on function
  public.enforce_quiz_limit(),
  public.enforce_question_limit(),
  public.enforce_option_limit(),
  public.forbid_quiz_change(),
  public.forbid_question_change(),
  public.touch_updated_at()
  from public, anon, authenticated;

-- Quyền truy cập: chỉ người đã đăng nhập, và chỉ qua các chính sách bên dưới.
revoke all on public.quizzes, public.questions, public.options from anon, authenticated;
grant select, insert, update, delete on public.quizzes, public.questions, public.options to authenticated;

alter table public.quizzes enable row level security;
alter table public.questions enable row level security;
alter table public.options enable row level security;

create policy quizzes_select_own on public.quizzes for select to authenticated
  using (owner_id = (select auth.uid()));
create policy quizzes_insert_own on public.quizzes for insert to authenticated
  with check (owner_id = (select auth.uid()));
create policy quizzes_update_own on public.quizzes for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));
create policy quizzes_delete_own on public.quizzes for delete to authenticated
  using (owner_id = (select auth.uid()));

create policy questions_select_own on public.questions for select to authenticated
  using (exists (select 1 from public.quizzes z where z.id = questions.quiz_id and z.owner_id = (select auth.uid())));
create policy questions_insert_own on public.questions for insert to authenticated
  with check (exists (select 1 from public.quizzes z where z.id = questions.quiz_id and z.owner_id = (select auth.uid())));
create policy questions_update_own on public.questions for update to authenticated
  using (exists (select 1 from public.quizzes z where z.id = questions.quiz_id and z.owner_id = (select auth.uid())))
  with check (exists (select 1 from public.quizzes z where z.id = questions.quiz_id and z.owner_id = (select auth.uid())));
create policy questions_delete_own on public.questions for delete to authenticated
  using (exists (select 1 from public.quizzes z where z.id = questions.quiz_id and z.owner_id = (select auth.uid())));

create policy options_select_own on public.options for select to authenticated
  using (exists (
    select 1 from public.questions q join public.quizzes z on z.id = q.quiz_id
    where q.id = options.question_id and z.owner_id = (select auth.uid())
  ));
create policy options_insert_own on public.options for insert to authenticated
  with check (exists (
    select 1 from public.questions q join public.quizzes z on z.id = q.quiz_id
    where q.id = options.question_id and z.owner_id = (select auth.uid())
  ));
create policy options_update_own on public.options for update to authenticated
  using (exists (
    select 1 from public.questions q join public.quizzes z on z.id = q.quiz_id
    where q.id = options.question_id and z.owner_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.questions q join public.quizzes z on z.id = q.quiz_id
    where q.id = options.question_id and z.owner_id = (select auth.uid())
  ));
create policy options_delete_own on public.options for delete to authenticated
  using (exists (
    select 1 from public.questions q join public.quizzes z on z.id = q.quiz_id
    where q.id = options.question_id and z.owner_id = (select auth.uid())
  ));

-- ---------------------------------------------------------------------------------------------
-- Hàm cho giao diện soạn quiz. Phần lớn chạy với quyền người gọi (security invoker) nên RLS vẫn
-- áp dụng. Chỉ hai hàm chia sẻ ở cuối dùng security definer vì phải đọc quiz của người khác.
-- ---------------------------------------------------------------------------------------------

-- Lỗi chặn việc chơi, theo vị trí câu (bắt đầu từ 1; 0 là lỗi của cả quiz).
create function public.quiz_problems(p_quiz_id uuid)
returns table (question_position integer, code text)
language plpgsql
stable
security invoker
set search_path = ''
as $$
begin
  perform 1 from public.quizzes where id = p_quiz_id;
  if not found then
    raise exception 'quiz_not_found' using errcode = 'PT404';
  end if;

  return query
  with q as (
    select qu.id, qu.kind, qu.accepted_answers,
           (row_number() over (order by qu.position, qu.created_at))::integer as pos
    from public.questions qu
    where qu.quiz_id = p_quiz_id
  ),
  o as (
    select q.id as question_id,
           count(*) as total,
           count(*) filter (where op.is_correct) as correct,
           count(distinct lower(btrim(op.label))) as distinct_labels,
           coalesce(bool_or(op.label = 'Đúng'), false) as has_true,
           coalesce(bool_or(op.label = 'Sai'), false) as has_false
    from q join public.options op on op.question_id = q.id
    group by q.id
  ),
  found_problems as (
    select 0 as pos, 'no_questions'::text as code
      where not exists (select 1 from q)
    union all
    select q.pos, 'too_few_options' from q left join o on o.question_id = q.id
      where q.kind in ('single', 'multi') and coalesce(o.total, 0) < 2
    union all
    select q.pos, 'correct_count' from q left join o on o.question_id = q.id
      where q.kind = 'single' and coalesce(o.correct, 0) <> 1
    union all
    select q.pos, 'no_correct' from q left join o on o.question_id = q.id
      where q.kind = 'multi' and coalesce(o.correct, 0) = 0
    union all
    select q.pos, 'bad_true_false' from q left join o on o.question_id = q.id
      where q.kind = 'true_false'
        and not (coalesce(o.total, 0) = 2 and coalesce(o.correct, 0) = 1 and coalesce(o.has_true, false) and coalesce(o.has_false, false))
    union all
    select q.pos, 'no_answers' from q
      where q.kind = 'short_text' and cardinality(q.accepted_answers) = 0
    union all
    select q.pos, 'duplicate_options' from q join o on o.question_id = q.id
      where q.kind in ('single', 'multi') and o.total <> o.distinct_labels
  )
  select fp.pos, fp.code from found_problems fp order by fp.pos, fp.code;
end;
$$;

-- Tạo hoặc sửa một câu hỏi cùng toàn bộ lựa chọn trong một giao dịch.
-- p_question: { id?, kind, prompt, time_limit_seconds?, accepted_answers?, ignore_diacritics?,
--               options?: [{ label, is_correct? }] }
create function public.save_question(p_quiz_id uuid, p_question jsonb)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_id uuid;
  v_kind text := p_question ->> 'kind';
  v_answers text[];
  v_option jsonb;
  v_index integer := 0;
  v_position integer;
begin
  perform 1 from public.quizzes where id = p_quiz_id;
  if not found then
    raise exception 'quiz_not_found' using errcode = 'PT404';
  end if;

  if jsonb_typeof(p_question -> 'accepted_answers') = 'array' then
    select coalesce(array_agg(value), '{}'::text[]) into v_answers
    from jsonb_array_elements_text(p_question -> 'accepted_answers');
  else
    v_answers := '{}'::text[];
  end if;

  if nullif(p_question ->> 'id', '') is not null then
    v_id := (p_question ->> 'id')::uuid;
    update public.questions
    set kind = v_kind,
        prompt = p_question ->> 'prompt',
        time_limit_seconds = coalesce((p_question ->> 'time_limit_seconds')::integer, 20),
        accepted_answers = v_answers,
        ignore_diacritics = coalesce((p_question ->> 'ignore_diacritics')::boolean, false)
    where id = v_id and quiz_id = p_quiz_id;
    if not found then
      raise exception 'question_not_found' using errcode = 'PT404';
    end if;
    delete from public.options where question_id = v_id;
  else
    select coalesce(max(position) + 1, 0) into v_position from public.questions where quiz_id = p_quiz_id;
    insert into public.questions (quiz_id, position, kind, prompt, time_limit_seconds, accepted_answers, ignore_diacritics)
    values (
      p_quiz_id,
      v_position,
      v_kind,
      p_question ->> 'prompt',
      coalesce((p_question ->> 'time_limit_seconds')::integer, 20),
      v_answers,
      coalesce((p_question ->> 'ignore_diacritics')::boolean, false)
    )
    returning id into v_id;
  end if;

  if v_kind is distinct from 'short_text' and jsonb_typeof(p_question -> 'options') = 'array' then
    for v_option in select * from jsonb_array_elements(p_question -> 'options') loop
      insert into public.options (question_id, position, label, is_correct)
      values (v_id, v_index, v_option ->> 'label', coalesce((v_option ->> 'is_correct')::boolean, false));
      v_index := v_index + 1;
    end loop;
  end if;

  update public.quizzes set updated_at = now() where id = p_quiz_id;
  return v_id;
end;
$$;

-- Đổi thứ tự câu hỏi; danh sách id phải khớp đúng tập câu hiện có của quiz.
create function public.reorder_questions(p_quiz_id uuid, p_ids uuid[])
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  perform 1 from public.quizzes where id = p_quiz_id;
  if not found then
    raise exception 'quiz_not_found' using errcode = 'PT404';
  end if;

  if (select array_agg(id order by id) from public.questions where quiz_id = p_quiz_id)
     is distinct from (select array_agg(i order by i) from unnest(p_ids) as i) then
    raise exception 'reorder_mismatch' using errcode = '23514';
  end if;

  update public.questions q
  set position = o.ordinal - 1
  from unnest(p_ids) with ordinality as o(id, ordinal)
  where q.id = o.id and q.quiz_id = p_quiz_id;

  update public.quizzes set updated_at = now() where id = p_quiz_id;
end;
$$;

-- Xoá một câu và dồn các câu còn lại về vị trí liền nhau.
create function public.delete_question(p_question_id uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_quiz uuid;
begin
  delete from public.questions where id = p_question_id returning quiz_id into v_quiz;
  if not found then
    raise exception 'question_not_found' using errcode = 'PT404';
  end if;

  update public.questions q
  set position = r.rn - 1
  from (
    select id, (row_number() over (order by position, created_at))::integer as rn
    from public.questions where quiz_id = v_quiz
  ) r
  where q.id = r.id;

  update public.quizzes set updated_at = now() where id = v_quiz;
end;
$$;

-- Bật chia sẻ (luôn cấp mã mới) hoặc tắt (trả null).
create function public.set_quiz_sharing(p_quiz_id uuid, p_enabled boolean)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_token uuid := case when p_enabled then gen_random_uuid() else null end;
begin
  update public.quizzes set share_token = v_token where id = p_quiz_id;
  if not found then
    raise exception 'quiz_not_found' using errcode = 'PT404';
  end if;
  return v_token;
end;
$$;

-- ---------------------------------------------------------------------------------------------
-- Chia sẻ và nhân bản: cần đọc quiz của người khác nên dùng security definer, kiểm tra chặt:
-- chỉ người đã đăng nhập, chỉ theo mã chia sẻ hoặc quiz của chính mình, search_path rỗng.
-- Hàm sao chép nằm ở schema private (không được API mở ra).
-- ---------------------------------------------------------------------------------------------

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create function private.copy_quiz(p_source uuid, p_owner uuid, p_title text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_new uuid;
begin
  insert into public.quizzes (owner_id, title) values (p_owner, p_title) returning id into v_new;

  create temporary table pg_temp.copy_map (old_id uuid, new_id uuid) on commit drop;
  insert into pg_temp.copy_map (old_id, new_id)
  select id, gen_random_uuid() from public.questions where quiz_id = p_source;

  insert into public.questions (id, quiz_id, position, kind, prompt, time_limit_seconds, accepted_answers, ignore_diacritics)
  select m.new_id, v_new, q.position, q.kind, q.prompt, q.time_limit_seconds, q.accepted_answers, q.ignore_diacritics
  from public.questions q join pg_temp.copy_map m on m.old_id = q.id
  order by q.position;

  insert into public.options (question_id, position, label, is_correct)
  select m.new_id, o.position, o.label, o.is_correct
  from public.options o join pg_temp.copy_map m on m.old_id = o.question_id
  order by o.position;

  drop table pg_temp.copy_map;
  return v_new;
end;
$$;

create function public.duplicate_quiz(p_quiz_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_title text;
begin
  select title into v_title from public.quizzes where id = p_quiz_id and owner_id = (select auth.uid());
  if not found then
    raise exception 'quiz_not_found' using errcode = 'PT404';
  end if;
  return private.copy_quiz(p_quiz_id, (select auth.uid()), left(v_title, 90) || ' (bản sao)');
end;
$$;

create function public.get_shared_quiz(p_token uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_quiz public.quizzes;
begin
  if (select auth.uid()) is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  select * into v_quiz from public.quizzes where share_token = p_token and p_token is not null;
  if not found then
    raise exception 'shared_quiz_not_found' using errcode = 'PT404';
  end if;

  return jsonb_build_object(
    'title', v_quiz.title,
    'questions', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'kind', q.kind,
          'prompt', q.prompt,
          'time_limit_seconds', q.time_limit_seconds,
          'accepted_answers', to_jsonb(q.accepted_answers),
          'ignore_diacritics', q.ignore_diacritics,
          'options', coalesce((
            select jsonb_agg(jsonb_build_object('label', o.label, 'is_correct', o.is_correct) order by o.position)
            from public.options o where o.question_id = q.id
          ), '[]'::jsonb)
        )
        order by q.position
      )
      from public.questions q where q.quiz_id = v_quiz.id
    ), '[]'::jsonb)
  );
end;
$$;

create function public.clone_shared_quiz(p_token uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_quiz public.quizzes;
begin
  if (select auth.uid()) is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  select * into v_quiz from public.quizzes where share_token = p_token and p_token is not null;
  if not found then
    raise exception 'shared_quiz_not_found' using errcode = 'PT404';
  end if;
  return private.copy_quiz(v_quiz.id, (select auth.uid()), left(v_quiz.title, 90) || ' (bản sao)');
end;
$$;

-- Chỉ người đã đăng nhập gọi được các hàm này.
revoke execute on function
  public.quiz_problems(uuid),
  public.save_question(uuid, jsonb),
  public.reorder_questions(uuid, uuid[]),
  public.delete_question(uuid),
  public.set_quiz_sharing(uuid, boolean),
  public.duplicate_quiz(uuid),
  public.get_shared_quiz(uuid),
  public.clone_shared_quiz(uuid)
  from public, anon;
grant execute on function
  public.quiz_problems(uuid),
  public.save_question(uuid, jsonb),
  public.reorder_questions(uuid, uuid[]),
  public.delete_question(uuid),
  public.set_quiz_sharing(uuid, boolean),
  public.duplicate_quiz(uuid),
  public.get_shared_quiz(uuid),
  public.clone_shared_quiz(uuid)
  to authenticated;
revoke execute on function private.copy_quiz(uuid, uuid, text) from public, anon, authenticated;
