-- Giai đoạn 3, phase 07: số liệu từng câu và chi tiết lượt làm cho giáo viên.
-- Hai RPC chỉ đọc qua ownership của assignment; học sinh/anon không nhận được
-- câu trả lời hay thống kê của bạn khác.

create function public.assignment_question_analytics(p_assignment uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare v_owner uuid := (select auth.uid()); v_students integer;
begin
  if v_owner is null then raise exception 'not_authenticated' using errcode='42501'; end if;
  if not exists (select 1 from public.assignments where id=p_assignment and owner_id=v_owner) then
    raise exception 'assignment_not_found' using errcode='PT404';
  end if;
  select count(*) into v_students
  from public.students s join public.assignments a on a.class_id=s.class_id
  where a.id=p_assignment and a.owner_id=v_owner;

  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'position', q.ordinality - 1,
      'answered', coalesce(stats.answered, 0),
      'correct', coalesce(stats.correct, 0),
      'unanswered', greatest(v_students - coalesce(stats.answered, 0), 0)
    ) order by q.ordinality)
    from public.assignments a
    cross join lateral jsonb_array_elements(a.quiz_snapshot -> 'questions') with ordinality as q(value, ordinality)
    left join lateral (
      select count(*)::integer as answered, (count(*) filter (where aa.is_correct))::integer as correct
      from public.assignment_answers aa
      join public.assignment_attempts at on at.id=aa.attempt_id
      where at.assignment_id=a.id and at.status <> 'invalidated' and aa.position=q.ordinality - 1
    ) stats on true
    where a.id=p_assignment and a.owner_id=v_owner
  ), '[]'::jsonb);
end;
$$;

create function public.assignment_attempt_detail(p_assignment uuid, p_student uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare v_owner uuid := (select auth.uid());
begin
  if v_owner is null then raise exception 'not_authenticated' using errcode='42501'; end if;
  if not exists (
    select 1 from public.assignments a join public.students s on s.class_id=a.class_id
    where a.id=p_assignment and a.owner_id=v_owner and s.id=p_student
  ) then raise exception 'assignment_or_student_not_found' using errcode='PT404'; end if;

  return coalesce((
    select jsonb_build_object(
      'student_id', s.id, 'name', s.name, 'status', at.status,
      'started_at', at.started_at, 'submitted_at', at.submitted_at,
      'score', at.score, 'correct', at.correct_count, 'total', at.question_total,
      'answers', coalesce((select jsonb_agg(jsonb_build_object(
        'position', aa.position, 'answer', aa.answer, 'is_correct', aa.is_correct
      ) order by aa.position) from public.assignment_answers aa where aa.attempt_id=at.id), '[]'::jsonb)
    )
    from public.students s
    left join lateral (
      select * from public.assignment_attempts x
      where x.assignment_id=p_assignment and x.student_id=s.id and x.status <> 'invalidated'
      order by x.started_at desc, x.id desc limit 1
    ) at on true
    where s.id=p_student
  ), jsonb_build_object('student_id', p_student, 'answers', '[]'::jsonb));
end;
$$;

revoke execute on function public.assignment_question_analytics(uuid), public.assignment_attempt_detail(uuid, uuid) from public, anon;
grant execute on function public.assignment_question_analytics(uuid), public.assignment_attempt_detail(uuid, uuid) to authenticated;
