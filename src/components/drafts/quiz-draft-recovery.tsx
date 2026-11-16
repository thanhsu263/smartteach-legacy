"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/button";
import { useAuth } from "@/components/auth-provider";
import { draftKey, readDraft, removeDraft, type DraftRecord } from "@/lib/drafts/storage";
import { isQuestionDraft } from "@/lib/drafts/question-draft";
import type { Question, QuestionInput } from "@/lib/quiz/types";
export function QuizDraftRecovery({ quizId, questions, onRestore }: { quizId: string; questions: Question[]; onRestore: (row: DraftRecord<QuestionInput>) => boolean }) {
  const { user, status } = useAuth();
  const [record, setRecord] = useState<DraftRecord<QuestionInput> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!user || status !== "signed-in") return;
    let live = true;
    readDraft<QuestionInput>(draftKey(user.id, "quiz", quizId)).then(row => {
      if (!live) return;
      if (row && !isQuestionDraft(row.payload)) setError("Nháp có định dạng chưa hỗ trợ; không tự đưa vào form.");
      else setRecord(row);
    }).catch(() => { if (live) setError("Không đọc được nháp trên trình duyệt. Thầy cô vẫn có thể soạn và lưu vào tài khoản."); });
    return () => { live = false; };
  }, [user, status, quizId]);
  if (status !== "signed-in") return null;
  if (!record) return error ? <p role="alert">{error}</p> : null;
  const original = questions.find(q => q.id === record.target);
  const missing = record.target !== null && !original;
  const changed = original && JSON.stringify(original) !== record.baseline;
  return <section aria-label="Khôi phục bản nháp"><p>Nháp chưa lưu vào tài khoản: {new Date(record.savedAt).toLocaleString("vi-VN")}.</p>
    {missing && <p role="alert">Câu gốc đã bị xóa. Không thể tự khôi phục nháp vào câu khác.</p>}
    {changed && <p role="alert">Câu trên tài khoản đã thay đổi. Khôi phục chỉ đưa nháp vào form để thầy cô đối chiếu, chưa ghi đè dữ liệu đã lưu.</p>}
    {error && <p role="alert">{error}</p>}
    <Button disabled={busy || missing} onClick={() => { if (onRestore(record)) setRecord(null); }}>Khôi phục nháp</Button>
    <Button disabled={busy} onClick={async () => { setBusy(true); try { await removeDraft(record.key, record.revision); setRecord(null); } catch { setError("Nháp đã thay đổi hoặc chưa thể xóa. Thầy cô tải lại để đối chiếu."); } finally { setBusy(false); } }}>Bỏ nháp</Button>
  </section>;
}
