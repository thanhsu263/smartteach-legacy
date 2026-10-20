-- Giai đoạn 2.5, phase 6: nhập quiz từ tệp hoặc văn bản.
--
-- Việc đọc tệp diễn ra hoàn toàn ở trình duyệt của giáo viên (xem src/lib/quiz/import). Hàm này chỉ nhận bộ câu hỏi đã đọc
-- xong và tạo quiz cùng toàn bộ câu trong MỘT lời gọi (một giao dịch): lỗi ở bất kỳ câu nào thì không có quiz nào được tạo,
-- không để lại quiz dở dang.
--
-- `security invoker` như save_question: chạy dưới RLS của chính giáo viên nên chỉ tạo được quiz của mình, và dùng lại nguyên
-- các ràng buộc, trigger giới hạn (50 quiz, 50 câu mỗi quiz, 6 lựa chọn, độ dài chữ) đã có thay vì chép luật sang chỗ khác.

create function public.import_quiz(p_title text, p_questions jsonb)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_id uuid;
  v_question jsonb;
begin
  if jsonb_typeof(p_questions) is distinct from 'array' or jsonb_array_length(p_questions) = 0 then
    raise exception 'empty_import' using errcode = 'PT400';
  end if;
  -- Giới hạn 50 câu: kiểm trước để báo đúng lỗi thay vì chờ trigger ở câu thứ 51 (kết quả như nhau, lời nhắn rõ hơn).
  if jsonb_array_length(p_questions) > 50 then
    raise exception 'question_limit_exceeded' using errcode = '23514';
  end if;

  insert into public.quizzes (title) values (btrim(p_title)) returning id into v_id;

  for v_question in select * from jsonb_array_elements(p_questions) loop
    perform public.save_question(v_id, v_question);
  end loop;
  return v_id;
end;
$$;

revoke execute on function public.import_quiz(text, jsonb) from public, anon;
grant execute on function public.import_quiz(text, jsonb) to authenticated;
