"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/button";
import { useAuth } from "@/components/auth-provider";
import styles from "./feedback-manager.module.css";
type Status = "new" | "in_progress" | "resolved";
const labels: Record<Status, string> = { new: "Mới", in_progress: "Đang xử lý", resolved: "Đã xử lý" };
type Item = { id: string; kind: string; body: string; status: Status; version: number; createdAt: string };
type Listing = { items: Item[]; total: number; nextOffset: number | null };
async function request<T>(url: string, body?: unknown, method = "POST"): Promise<T> {
  const r = await fetch(url, { method: body ? method : "GET", cache: "no-store", headers: body ? { "Content-Type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined });
  const result = await r.json();
  if (!r.ok) throw new Error(result.error?.message ?? "Chưa thể tải góp ý.");
  return result;
}
export function FeedbackManager({ admin = false }: { admin?: boolean }) {
  const { user, status } = useAuth();
  if (status !== "signed-in" || !user) return <p role="status">Đang xác minh tài khoản…</p>;
  return <FeedbackView key={`${user.id}:${admin}`} admin={admin} />;
}
function FeedbackView({ admin }: { admin: boolean }) {
  const [data, setData] = useState<Listing | null>(null);
  const [offset, setOffset] = useState(0);
  const [filter, setFilter] = useState("");
  const [revision, setRevision] = useState(0);
  const [kind, setKind] = useState("bug");
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const pending = useRef<{ key: string; requestId: string } | null>(null);
  useEffect(() => {
    let live = true;
    request<Listing>(`${admin ? "/api/admin/feedback" : "/api/feedback"}?offset=${offset}&status=${filter}`).then(value => { if (live) setData(value); }).catch(e => { if (live) setError(e.message); });
    return () => { live = false; };
  }, [admin, offset, filter, revision]);
  async function submit(event: FormEvent) {
    event.preventDefault(); if (busy) return;
    setBusy(true); setError(null); setNotice(null);
    const key = JSON.stringify({ kind, body: body.trim() });
    if (pending.current?.key !== key) pending.current = { key, requestId: crypto.randomUUID() };
    try { await request("/api/feedback", { requestId: pending.current.requestId, kind, body: body.trim() }); setBody(""); pending.current = null; setNotice("Đã gửi góp ý. Thầy cô có thể xem trạng thái bên dưới."); setOffset(0); setRevision(n => n + 1); }
    catch(e) { setError(e instanceof Error ? e.message : "Chưa gửi được góp ý."); } finally { setBusy(false); }
  }
  async function update(item: Item, status: Status) {
    if (busy) return; setBusy(true); setError(null);
    try { await request(`/api/admin/feedback/${item.id}`, { version: item.version, status }, "PATCH"); setRevision(n => n + 1); }
    catch(e) { setError(e instanceof Error ? e.message : "Chưa cập nhật được trạng thái."); } finally { setBusy(false); }
  }
  return <section className={styles.page}><h1>{admin ? "Góp ý của giáo viên" : "Góp ý cho SmartTeach"}</h1>
    {!admin && <form onSubmit={submit} className={styles.form}><p>Chỉ gửi thông tin cần thiết. Không nhập mật khẩu, mã học sinh, API key hoặc dữ liệu riêng của lớp.</p>
      <label className={styles.field}>Loại góp ý<select value={kind} onChange={e => setKind(e.target.value)}><option value="bug">Báo lỗi</option><option value="suggestion">Đề xuất</option></select></label>
      <label className={styles.field}>Nội dung<textarea required minLength={10} maxLength={2000} value={body} onChange={e => setBody(e.target.value)} /></label><p>{body.length}/2000 ký tự</p>
      <Button type="submit" variant="primary" disabled={busy} aria-busy={busy}>{busy ? "Đang gửi…" : "Gửi góp ý"}</Button></form>}
    {error && <p role="alert">{error}</p>}{notice && <p role="status">{notice}</p>}
    {admin && <label className={styles.field}>Lọc trạng thái<select value={filter} onChange={e => { setFilter(e.target.value); setOffset(0); }}><option value="">Tất cả</option>{Object.entries(labels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>}
    <h2>{admin ? "Danh sách góp ý" : "Góp ý đã gửi"}</h2>
    {!data ? <p role="status">Đang tải…</p> : data.items.length === 0 ? <p>Chưa có góp ý trong danh sách này.</p> : <ul className={styles.list}>{data.items.map(item => <li className={styles.item} key={item.id}><strong>{item.kind === "bug" ? "Báo lỗi" : "Đề xuất"} · {labels[item.status]}</strong><p>{item.body}</p><p>{new Date(item.createdAt).toLocaleString("vi-VN")}</p>{admin && <div className={styles.actions}>{(Object.keys(labels) as Status[]).filter(s => s !== item.status).map(s => <Button key={s} disabled={busy} onClick={() => void update(item, s)}>{labels[s]}</Button>)}</div>}</li>)}</ul>}
    <div className={styles.actions}><Button disabled={busy || offset === 0} onClick={() => setOffset(n => Math.max(0, n - 20))}>Trang trước</Button><Button disabled={busy || !data?.nextOffset} onClick={() => setOffset(data!.nextOffset!)}>Trang sau</Button><Button disabled={busy} onClick={() => { setError(null); setRevision(n => n + 1); }}>Tải lại</Button></div>
  </section>;
}
