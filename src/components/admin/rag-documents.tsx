"use client";
import { useEffect, useRef, useState } from "react";
import { Upload } from "tus-js-client";
import { Button } from "@/components/button";
import { adminRequest } from "@/lib/admin/client";
import { getBrowserSupabase } from "@/lib/supabase/client";
import { GRADES, SUBJECTS } from "@/lib/catalog";
import { FileDrop } from "@/components/ui/file-drop";
import { ChoiceChips, EmptyState, ProgressMeter, StatusBadge, TableFrame, type StatusTone } from "@/components/ui/ui";
import s from "./admin.module.css";
type Document = {
  id: string;
  title: string;
  subject: string | null;
  grades: string[];
  generation: number;
  activeVersion: string | null;
  versionId: string;
  format: string;
  bytes: number;
  status: string;
  chunkCount: number;
  jobStatus: string | null;
  cursor: number;
  errorCode: string | null;
};
type Data = {
  items: Document[];
  capacity: { documents: number; bytes: number; chunks: number };
  preflight: {
    schedulerConfigured: boolean;
    credentialReady: boolean;
    encryptionReady: boolean;
    workerReady: boolean;
    heartbeatFresh:boolean;
    lastRunAt: string | null;
  };
};
const errors: Record<string, string> = {
  no_text: "Không tìm thấy chữ. Bản đầu chưa hỗ trợ OCR.",
  pdf_page_limit: "PDF vượt 200 trang.",
  docx_expansion_limit: "DOCX vượt giới hạn giải nén.",
  text_limit: "Tài liệu vượt một triệu ký tự.",
  waiting_quota: "Đang chờ hạn mức AI.",
  processing_failed: "Không đọc được tài liệu hoặc nguồn đã thay đổi.",
  file_size_invalid: "Kích thước tệp không khớp.",
  capacity_exceeded:
    "Kho đã vượt giới hạn chunk hoặc dung lượng. Gỡ nguồn cũ trước khi nạp lại.",
  source_changed: "Nguồn đã thay đổi hoặc được gỡ.",
  storage_cleanup_failed: "Đang chờ dọn tệp.",
};
// Nhãn trạng thái: ưu tiên lượt xử lý (job), sau đó trạng thái phiên bản.
const statusLabels: Record<string, [string, StatusTone]> = {
  queued: ["Đang chờ", "info"],
  running: ["Đang xử lý", "info"],
  waiting_quota: ["Chờ hạn mức AI", "warn"],
  succeeded: ["Đã nạp", "ok"],
  cancelled: ["Đã hủy", "neutral"],
  reserved: ["Chờ tải tệp", "neutral"],
  extracting: ["Đang đọc tệp", "info"],
  embedding: ["Đang lập chỉ mục", "info"],
  ready: ["Đã nạp", "ok"],
  failed: ["Lỗi", "bad"],
  deleted: ["Đã gỡ", "neutral"],
};
const capacityTone = (used: number, max: number) => (used >= max ? "bad" : used / max >= 0.8 ? "warn" : undefined);
export function RagDocuments() {
  const [data, setData] = useState<Data | null>(null),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [file, setFile] = useState<File | null>(null),
    [title, setTitle] = useState(""),
    [subject, setSubject] = useState(""),
    [grades, setGrades] = useState<string[]>([]),
    [progress, setProgress] = useState(0),
    [replacement, setReplacement] = useState<string | null>(null);
  const uploadRef = useRef<Upload | null>(null),
    fileRef = useRef<HTMLInputElement>(null);
  async function load() {
    try {
      setData(await adminRequest<Data>("/api/admin/rag/documents"));
    } catch (e) {
      setError((e as Error).message);
    }
  }
  useEffect(() => {
    let live = true;
    adminRequest<Data>("/api/admin/rag/documents")
      .then((d) => {
        if (live) setData(d);
      })
      .catch((e) => {
        if (live) setError(e.message);
      });
    const timer = setInterval(() => void load(), 6000);
    return () => {
      live = false;
      clearInterval(timer);
      void uploadRef.current?.abort();
    };
  }, []);
  async function upload(e: React.FormEvent) {
    e.preventDefault();
    if (!file || busy) return;
    setError("");
    setMessage("");
    setBusy(true);
    setProgress(0);
    try {
      const format = file.name.toLowerCase().endsWith(".pdf")
        ? "pdf"
        : file.name.toLowerCase().endsWith(".docx")
          ? "docx"
          : null;
      if (!format || file.size > 10 * 1024 * 1024 || file.size === 0)
        throw new Error("Chỉ nhận PDF/DOCX có chữ, tối đa 10 MiB.");
      const mime =
        format === "pdf"
          ? "application/pdf"
          : "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
      const result = await adminRequest<{
        id: string;
        versionId: string;
        path: string;
        token: string;
        supabaseUrl: string;
      }>("/api/admin/rag/documents", {
        title,
        format,
        bytes: file.size,
        subject: subject || null,
        grades,
        sourceId: replacement,
      });
      if (file.size > 6 * 1024 * 1024) {
        await new Promise<void>((resolve, reject) => {
          const upload = new Upload(file, {
            endpoint: result.supabaseUrl + "/storage/v1/upload/resumable",
            headers: { "x-signature": result.token },
            chunkSize: 6 * 1024 * 1024,
            uploadDataDuringCreation: true,
            removeFingerprintOnSuccess: true,
            storeFingerprintForResuming: false,
            retryDelays: [0, 1000, 3000],
            metadata: {
              bucketName: "rag-documents",
              objectName: result.path,
              contentType: mime,
              cacheControl: "0",
            },
            onProgress: (sent, total) =>
              setProgress(Math.round((sent / total) * 100)),
            onError: () => reject(new Error("Tải tệp thất bại. Hãy thử lại.")),
            onSuccess: () => resolve(),
          });
          uploadRef.current = upload;
          upload.start();
        });
      } else {
        const client = getBrowserSupabase();
        if (!client) throw new Error("Chưa có kết nối kho tệp.");
        const uploaded = await client.storage
          .from("rag-documents")
          .uploadToSignedUrl(result.path, result.token, file, {
            contentType: mime,
            upsert: false,
          });
        if (uploaded.error) throw new Error("Tải tệp thất bại. Hãy thử lại.");
        setProgress(100);
      }
      await adminRequest(
        "/api/admin/rag/documents/" + result.id + "/complete-upload",
        { versionId: result.versionId },
      );
      setMessage(
        "Đã đưa vào hàng đợi. Bạn có thể đóng trang; lịch nền sẽ tiếp tục xử lý.",
      );
      setReplacement(null);
      setFile(null);
      if (fileRef.current) fileRef.current.value = "";
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
      uploadRef.current = null;
    }
  }
  async function reindex(d: Document) {
    setBusy(true);
    setError("");
    try {
      await adminRequest("/api/admin/rag/documents/" + d.id + "/reindex", {
        expectedVersion: d.generation,
      });
      setMessage("Đã tạo lượt nạp lại từ tệp hiện có.");
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function remove(d: Document) {
    if (!confirm("Gỡ tài liệu và chặn nguồn này ngay?")) return;
    setError("");
    try {
      await adminRequest(
        "/api/admin/rag/documents/" + d.id,
        { expectedVersion: d.generation },
        "DELETE",
      );
      await load();
    } catch (e) {
      setError((e as Error).message);
    }
  }
  const ready = Boolean(
    data?.preflight?.encryptionReady &&
      data.preflight.workerReady &&
      data.preflight.schedulerConfigured &&
      data.preflight.credentialReady &&
      data.preflight.heartbeatFresh,
  );
  return (
    <>
      <header>
        <h1>Tài liệu RAG</h1>
        <p className={s.muted}>
          PDF/DOCX có chữ · tối đa 10 MiB và 200 trang PDF · chưa hỗ trợ OCR.
        </p>
      </header>
      {error && (
        <p role="alert" className={s.error}>
          {error}
        </p>
      )}
      {message && <p role="status">{message}</p>}
      {data && !ready && (
        <p role="status">
          Chưa sẵn sàng nạp tài liệu. Cấu hình AI/API, khóa mã hóa và lịch nền;
          kiểm heartbeat tại Vận hành trước khi tải tệp.
        </p>
      )}
      {data && (
        <section className={s.panel} aria-labelledby="rag-capacity">
          <h2 id="rag-capacity">Hạn mức kho</h2>
          <div className={s.grid}>
            <ProgressMeter label="Tài liệu" value={data.capacity.documents} max={50} valueText={`${data.capacity.documents}/50`} tone={capacityTone(data.capacity.documents, 50)} />
            <ProgressMeter label="Dung lượng" value={data.capacity.bytes} max={512 * 1048576} valueText={`${(data.capacity.bytes / 1048576).toFixed(1)}/512 MiB`} tone={capacityTone(data.capacity.bytes, 512 * 1048576)} />
            <ProgressMeter label="Chunk" value={data.capacity.chunks} max={20000} valueText={`${data.capacity.chunks.toLocaleString("vi-VN")}/20.000`} tone={capacityTone(data.capacity.chunks, 20000)} />
          </div>
        </section>
      )}
      <form className={s.panel + " " + s.form} onSubmit={upload}>
        <h2>{replacement ? "Thay phiên bản tài liệu" : "Thêm tài liệu"}</h2>
        <label className={s.field}>
          Tên nguồn
          <input
            required
            value={title}
            maxLength={200}
            onChange={(e) => setTitle(e.target.value)}
          />
        </label>
        <label className={s.field}>
          Môn học
          <select value={subject} onChange={(e) => setSubject(e.target.value)}>
            <option value="">Hướng dẫn chung</option>
            {SUBJECTS.map((x) => (
              <option key={x.id} value={x.id}>
                {x.label}
              </option>
            ))}
          </select>
        </label>
        <ChoiceChips
          legend="Khối lớp"
          options={GRADES.map((x) => ({ value: x.id, label: x.label }))}
          value={grades}
          onChange={setGrades}
        />
        <FileDrop
          ref={fileRef}
          label="Tệp PDF hoặc DOCX"
          hint="Kéo thả hoặc bấm để chọn · tối đa 10 MiB"
          required
          accept=".pdf,.docx"
          disabled={busy}
          selectedNames={file ? [file.name] : []}
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
        <p>
          Chỉ tải tài liệu bạn được phép chia sẻ với giáo viên và gửi tới Google
          AI. Không đưa dữ liệu học sinh hoặc nội dung riêng vào kho.
        </p>
        {busy && <ProgressMeter label="Đang tải tệp" value={progress} max={100} valueText={`${progress}%`} />}
        <div className={s.actions}>
          <Button
            type="submit"
            variant="primary"
            disabled={busy || !file || !ready}
          >
            Tải và nạp tài liệu
          </Button>
          {replacement && (
            <Button onClick={() => setReplacement(null)}>
              Hủy thay phiên bản
            </Button>
          )}
        </div>
      </form>
      <section className={s.panel}>
        <h2>Kho tài liệu</h2>
        {data ? (
          <TableFrame>
            <table>
              <thead>
                <tr>
                  <th>Tài liệu</th>
                  <th>Trạng thái</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((d) => (
                  <tr key={d.id}>
                    <td>
                      {d.title}
                      <p className={s.muted}>
                        {d.format.toUpperCase()} · {d.chunkCount} chunk
                      </p>
                    </td>
                    <td>
                      {(() => {
                        const key = d.jobStatus ?? d.status;
                        const [label, tone] = statusLabels[key] ?? [key, "neutral"];
                        return <StatusBadge tone={tone}>{label}</StatusBadge>;
                      })()}
                      {d.activeVersion && d.status !== "ready" && (
                        <p>Bản trước vẫn hoạt động</p>
                      )}
                      {d.errorCode && (
                        <p>
                          {errors[d.errorCode] ??
                            "Có lỗi xử lý. Hãy nạp lại tệp."}
                        </p>
                      )}
                    </td>
                    <td>
                      <div className={s.actions}>
                        <Button
                          disabled={
                            busy ||
                            ["reserved", "extracting", "embedding"].includes(
                              d.status,
                            )
                          }
                          onClick={() => {
                            setReplacement(d.id);
                            setTitle(d.title);
                            setSubject(d.subject ?? "");
                            setGrades(d.grades);
                            fileRef.current?.focus();
                          }}
                        >
                          Thay / nạp lại
                        </Button>
                        <Button
                          disabled={
                            busy ||
                            ["reserved", "extracting", "embedding"].includes(
                              d.status,
                            )
                          }
                          onClick={() => void reindex(d)}
                        >
                          Lập chỉ mục lại
                        </Button>
                        <Button disabled={busy} onClick={() => void remove(d)}>
                          Gỡ nguồn
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!data.items.length && (
              <EmptyState
                level={3}
                title="Chưa có tài liệu hướng dẫn"
                description="Chatbot sẽ không tự bịa hướng dẫn khi thiếu nguồn."
              />
            )}
          </TableFrame>
        ) : (
          <p role="status">Đang tải…</p>
        )}
      </section>
    </>
  );
}
