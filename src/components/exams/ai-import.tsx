"use client";
import { useEffect, useRef, useState } from "react";
import { Button, ButtonLink } from "@/components/button";
import { FileDrop } from "@/components/ui/file-drop";
import { adminRequest } from "@/lib/admin/client";
import { getBrowserSupabase } from "@/lib/supabase/client";
import { useAuth } from "@/components/auth-provider";
import type { AiPreview } from "@/lib/exams/import/ai-extraction";
import { draftKey, readDraft, removeDraft, type DraftRecord } from "@/lib/drafts/storage";
import type { ExamForm } from "@/lib/exams/types";
import { examIssues } from "@/lib/exams/validation";
import { ExamEditor } from "./exam-editor";
import styles from "./exams.module.css";
type Job = { id: string; title: string; status: string; format: string; expiresAt: string; errorCode: string | null; examId: string | null; preview: AiPreview | null };
type Data = { items: Job[]; membership: { active: boolean }; preflight: { ready: boolean; schedulerConfigured: boolean; encryptionReady: boolean; workerReady: boolean; credentialReady: boolean; modelReady: boolean; heartbeatFresh: boolean } };
const labels: Record<string, string> = { reserved: "Chưa tải đủ tệp", queued: "Đang chờ xử lý", extracting: "Đang đọc chữ", generating: "Đang nhận dạng câu hỏi", waiting_quota: "Đang chờ hạn mức hoặc dịch vụ AI", needs_review: "Cần thầy cô kiểm tra", applied: "Đã lưu thành đề", failed: "Chưa xử lý được", cancelled: "Đã hủy", expired: "Đã hết hạn lưu tệp" };
const errors: Record<string, string> = { provider_unavailable: "Nhà cung cấp từ chối cấu hình hoặc key/model chưa sẵn sàng. Quản trị viên kiểm kết nối và cấu hình; sau đó thầy cô tạo lượt nhập mới.", invalid_extract: "Chưa xác minh được đầy đủ nội dung và nguồn đáp án. Thầy cô dùng mẫu chuẩn hoặc tách tệp nhỏ hơn.", input_too_long: "Nội dung quá dài cho một lượt AI (tối đa 12.000 ký tự). Tách tệp rồi nhập lại.", unsupported_file: "Tệp có phần không đọc được hoặc ngoài phạm vi chữ. Thầy cô dùng tệp mẫu hoặc lưu lại định dạng có chữ.", source_changed: "Tệp chưa tải đủ hoặc đã thay đổi. Thầy cô chọn lại tệp.", owner_unavailable: "Tài khoản không còn quyền gọi AI. Đề đã lưu vẫn được giữ.", attempt_budget_exhausted: "Đã hết số lần thử cho tệp này. Chọn tệp mới sau khi kiểm tra cấu hình AI.", waiting_quota: "Hệ thống sẽ thử lại trong hạn lưu tệp; không cần giữ tab này mở." };
export function AiExamImport() {
  const { user, status } = useAuth();
  if (!user || status !== "signed-in") return null;
  return <OwnerAiExamImport key={user.id} />;
}
function OwnerAiExamImport() {
  const [data, setData] = useState<Data | null>(null), [error, setError] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null), [consent, setConsent] = useState(false), [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState<string | null>(null), [reviewed, setReviewed] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const pendingRef = useRef<{ hash: string; requestId: string } | null>(null);
  useEffect(() => {
    let live = true;
    const load = () => adminRequest<Data>("/api/exam-imports").then(value => { if (live) setData(value); }).catch(e => { if(live) setError(e.message); });
    void load(); const timer = setInterval(() => { if (!document.hidden) void load(); }, 5000);
    return () => { live = false; clearInterval(timer); };
  }, [refresh]);
  async function upload() {
    if (!file || !consent || busy || !data?.preflight.ready || !data.membership.active) return;
    setBusy(true); setError(null);
    try {
      const format = file.name.split(".").pop()?.toLowerCase();
      if (!format || !["docx", "pdf", "xlsx", "csv"].includes(format) || file.size > 2097152 || !file.size) throw new Error("Chọn tệp DOCX/PDF có chữ/XLSX/CSV tối đa 2 MiB.");
      const hash = [...new Uint8Array(await crypto.subtle.digest("SHA-256", await file.arrayBuffer()))].map(n => n.toString(16).padStart(2, "0")).join("");
      if (pendingRef.current?.hash !== hash) pendingRef.current = { hash, requestId: crypto.randomUUID() };
      const result = await adminRequest<Job & { path?: string; token?: string }>("/api/exam-imports", { requestId: pendingRef.current.requestId, title: file.name.replace(/\.[^.]+$/, "").slice(0, 100) || "Đề đã nhập", format, bytes: file.size, consent: true });
      if (result.path && result.token) {
        const db = getBrowserSupabase(); if (!db) throw new Error("Phiên đăng nhập không còn sẵn sàng.");
        const uploaded = await db.storage.from("exam-imports").uploadToSignedUrl(result.path, result.token, file, { contentType: file.type || "application/octet-stream", upsert: false });
        // A lost upload response may leave the object present; the completion endpoint verifies size/hash.
        const completed = await adminRequest<Job>(`/api/exam-imports/${result.id}/complete-upload`, {});
        if (uploaded.error && completed.status === "reserved") throw new Error("Tệp chưa được tải đủ. Thầy cô thử lại.");
      }
      setRefresh(n => n + 1); setFile(null); pendingRef.current = null;
    } catch(e) { setError(e instanceof Error ? e.message : "Chưa nhận được tệp."); } finally { setBusy(false); }
  }
  async function control(job: Job, action: "cancel" | "retry") {
    if (busy) return;
    if (action === "cancel" && !window.confirm("Hủy và xóa tệp nhập này? Đề đã lưu không bị xóa.")) return;
    setBusy(true); setError(null);
    try { await adminRequest(`/api/exam-imports/${job.id}${action === "retry" ? "/retry" : ""}`, {}, action === "retry" ? "POST" : "DELETE"); setRefresh(n => n + 1); }
    catch(e) { setError(e instanceof Error ? e.message : "Chưa cập nhật được tệp."); } finally { setBusy(false); }
  }
  const active = data?.items.some(j => ["reserved", "queued", "extracting", "generating", "waiting_quota", "needs_review"].includes(j.status));
  const job = data?.items.find(j => j.id === selected && j.status === "needs_review");
  return <><section className={styles.page}><h2>AI nhập đề bố cục tự do · Premium</h2><p>Tệp được gửi tới nhà cung cấp Gemini để trích xuất, không đưa vào kho RAG. Chỉ nhận chữ, không OCR/ảnh/công thức. Nguồn và kết quả nhập không còn xem được sau 24 giờ hoặc khi xác nhận/hủy. Hệ thống dọn tệp gốc khi dịch vụ xử lý hoạt động; đề đã lưu không bị dọn.</p><p>Tối đa3 tệp/ngày,1 tệp đang xử lý; tối đa2 lượt gọi model mỗi tệp kể cả thử lại. AI không tự giải bài để đoán đáp án.</p>
    {error && <p role="alert">{error}</p>}{!data ? <p role="status">Đang kiểm tra dịch vụ…</p> : !data.membership.active ? <p>Cần Premium để dùng AI. Thầy cô vẫn có thể nhập miễn phí theo mẫu ở trên. <ButtonLink href="/membership">Xem gói thành viên</ButtonLink></p> : !data.preflight.ready ? <p role="status">AI nhập đề chưa sẵn sàng. Quản trị viên cần kiểm tra model/key, mã hóa và lịch worker riêng có heartbeat gần đây.</p> : <>
      <FileDrop label="Tệp cho AI" hint="PDF, DOCX, XLSX hoặc CSV có chữ" selectedNames={file ? [file.name] : []} accept=".pdf,.docx,.xlsx,.csv" disabled={busy || active} onChange={e => { setFile(e.target.files?.[0] ?? null); }} />
      <label><input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} /> Tôi có quyền sử dụng tài liệu và đồng ý gửi nội dung tới Gemini để trích xuất.</label><Button disabled={busy || !file || !consent || active} onClick={() => void upload()}>{busy ? "Đang gửi…" : "Bắt đầu nhập bằng AI"}</Button>
    </>}
    {data && <ul className={styles.list}>{data.items.map(j => <li key={j.id} className={styles.item}><strong>{j.title} · {labels[j.status] ?? j.status}</strong><p>Giữ tệp tới {new Date(j.expiresAt).toLocaleString("vi-VN")}</p>{j.errorCode && <p>{errors[j.errorCode] ?? "Chưa hoàn tất xử lý. Kiểm tra lại tệp và cấu hình trước khi thử lại."}</p>}<div className={styles.actions}>{j.status === "needs_review" && <Button onClick={() => { setSelected(j.id); setReviewed(false); }}>Kiểm tra và sửa bản nhập</Button>}{j.examId && <ButtonLink href={`/my-exams/${j.examId}`}>Mở đề đã lưu</ButtonLink>}{j.status === "waiting_quota" && <Button disabled={busy || !data.membership.active} onClick={() => void control(j, "retry")}>Thử lại trong hạn mức</Button>}{!["expired", "cancelled", "applied"].includes(j.status) && <Button disabled={busy} onClick={() => void control(j, "cancel")}>Hủy và xóa tệp</Button>}</div></li>)}</ul>}
    {job?.preview && <section><h2>Đối chiếu nguồn</h2><ul>{job.preview.warnings.map((w, i) => <li key={i}>{w}</li>)}</ul>{job.preview.provenance.map((p, i) => <details key={p.questionId}><summary>Nguồn câu {i + 1}: {JSON.stringify(p.locator)}</summary><p>{p.excerpt}</p><p>Khóa đáp án trong nguồn: {p.answerExcerpt ?? "Chưa có; thầy cô bổ sung."}</p></details>)}<label><input type="checkbox" checked={reviewed} onChange={e => setReviewed(e.target.checked)} /> Tôi đã đối chiếu toàn bộ nội dung và đáp án với tệp gốc; phần thiếu được giữ là nháp cần sửa.</label></section>}
  </section>{job?.preview && <AiReviewEditor key={job.id} job={job} reviewed={reviewed} />}</>;
}
function AiReviewEditor({ job, reviewed }: { job: Job; reviewed: boolean }) {
  const { user } = useAuth();
  const [record, setRecord] = useState<DraftRecord<ExamForm> | null>(null), [restored, setRestored] = useState<DraftRecord<ExamForm> | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!user) return; let live = true;
    readDraft<ExamForm>(draftKey(user.id, "exam", `ai-${job.id}`)).then(row => { if(live && row && !examIssues({ ...row.payload, title: row.payload.title || "Nháp" }).length) setRecord(row); }).catch(() => { if(live) setError("Không đọc được nháp chỉnh sửa trên trình duyệt."); });
    return () => { live = false; };
  }, [job.id, user]);
  if (!job.preview) return null;
  return <>{error && <p role="alert">{error}</p>}{record && <section className={styles.notice}><p>Có nháp chỉnh sửa bản nhập lúc {new Date(record.savedAt).toLocaleString("vi-VN")}.</p><Button onClick={() => { if(window.confirm("Khôi phục nháp sẽ thay nội dung đang sửa trong form; tiếp tục?")) { setRestored(record); setRecord(null); } }}>Khôi phục chỉnh sửa</Button><Button onClick={async () => { try { await removeDraft(record.key, record.revision); setRecord(null); } catch { setError("Nháp đã đổi ở tab khác; tải lại để đối chiếu."); } }}>Bỏ nháp chỉnh sửa</Button></section>}
    <ExamEditor key={`${job.id}:${restored?.revision ?? "source"}`} initial={{ ...job.preview.form, id: "new", revision: 0, updatedAt: "" }} restored={restored} saveLabel="Lưu bản nhập đã đối chiếu" canCommit={reviewed} localDraftId={`ai-${job.id}`} onCommit={form => adminRequest(`/api/exam-imports/${job.id}/apply`, { form, reviewed })} />
  </>;
}
