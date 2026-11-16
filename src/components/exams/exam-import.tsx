"use client";
import { useRef, useState } from "react";
import { Button } from "@/components/button";
import { ExamEditor } from "./exam-editor";
import { AiExamImport } from "./ai-import";
import type { ExamParse, SourceText } from "@/lib/exams/import/types";
import { textToExam } from "@/lib/exams/import/text";
import styles from "./exams.module.css";
export function ExamImport() {
  const [preview, setPreview] = useState<(ExamParse & { runId: number }) | null>(null);
  const [busy, setBusy] = useState(false), [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(""); const generation = useRef(0);
  async function read(file: File | undefined) {
    if (!file) return; const gen = ++generation.current; setBusy(true); setError(null); setPreview(null); setProgress("Đang đọc tệp…");
    try {
      if (file.size > 2 * 1024 * 1024) throw new Error("Tệp tối đa 2 MiB.");
      const format = file.name.split(".").pop()?.toLowerCase() ?? "";
      if (!["docx", "pdf", "xlsx", "csv"].includes(format)) throw new Error("Chỉ nhận .docx, .pdf có chữ, .xlsx và .csv UTF-8.");
      let cursor = 0, hash = "", parsed: ExamParse | null = null; const sections: SourceText[] = [];
      do {
        const response = await fetch(`/api/exams/parse?cursor=${cursor}`, { method: "POST", headers: { "Content-Type": "application/octet-stream", "X-Exam-Format": format }, body: file });
        const result = await response.json(); if (generation.current !== gen) return;
        if (!response.ok) throw new Error(result.error?.message ?? "Không đọc được tệp.");
        if (result.preview) { parsed = result.preview; break; }
        if (hash && hash !== result.hash) throw new Error("Tệp đã thay đổi giữa các lần đọc."); hash = result.hash;
        if (!Number.isInteger(result.cursor) || result.cursor <= cursor || result.cursor > 30) throw new Error("Trạng thái đọc PDF chưa hợp lệ.");
        cursor = result.cursor; sections.push(...result.sections); setProgress(`Đã đọc ${cursor}/${result.totalPages} trang`);
        if (sections.reduce((n, s) => n + s.text.length, 0) > 100000) throw new Error("Nội dung vượt 100.000 ký tự.");
        if (result.done) { parsed = textToExam(sections); break; }
      } while (cursor < 30);
      if (!parsed) throw new Error("Chưa đọc đủ trang. Thầy cô thử lại.");
      parsed.form.title = file.name.replace(/\.[^.]+$/, "").replace(/[_-]/g, " ").slice(0, 100) || "Đề đã nhập";
      setPreview({ ...parsed, runId: gen });
    } catch(e) { if (generation.current === gen) setError(e instanceof Error ? e.message : "Chưa đọc được tệp."); }
    finally { if (generation.current === gen) { setBusy(false); setProgress(""); } }
  }
  const count = preview?.form.document.sections.reduce((n, s) => n + s.questions.length, 0) ?? 0;
  return <><section className={styles.page}><h1>Nhập đề theo mẫu</h1><p>1. Chọn tệp → 2. Kiểm tra và sửa câu hỏi → 3. Xác nhận lưu vào tài khoản.</p><p>Tối đa 2 MiB, PDF có chữ tối đa30 trang. Bản đầu không đọc ảnh, công thức hoặc giữ bố cục nguồn. Luồng theo mẫu không gọi AI.</p>
    <div className={styles.actions}>{["csv", "xlsx", "docx", "pdf"].map(format => <a key={format} download href={`/templates/exams/mau-de.${format}`}>Mẫu {format.toUpperCase()}</a>)}<a href="/templates/exams/huong-dan.txt" download>Hướng dẫn cấu trúc</a></div>
    <label className={styles.field}>Chọn tệp đề<input type="file" accept=".csv,.xlsx,.docx,.pdf" onChange={e => void read(e.target.files?.[0])} /></label>
    {busy && <><p role="status">{progress}</p><Button onClick={() => { generation.current++; setBusy(false); setProgress(""); }}>Hủy đọc</Button></>}{error && <p role="alert">{error}</p>}
    {preview && <section><h2>Đã nhận {count} câu hỏi</h2><p>Kiểm tra nội dung, đáp án và điểm trước khi xác nhận. Tệp gốc không vào kho RAG.</p>{preview.issues.length > 0 && <ul className={styles.issues}>{preview.issues.map((issue, i) => <li key={i}>{JSON.stringify(issue.locator)}: {issue.message}</li>)}</ul>}{preview.issues.some(i => i.severity === "error" && !i.fixable) && <p role="alert">Tệp có phần không đọc đúng mẫu. Thầy cô sửa tệp rồi chọn lại; chưa thể xác nhận nhập thiếu nội dung.</p>}</section>}
  </section>{preview && !preview.issues.some(i => i.severity === "error" && !i.fixable) && <ExamEditor key={preview.runId} initial={{ ...preview.form, id: "new", revision: 0, updatedAt: "" }} restored={null} saveLabel="Xác nhận nhập đề" />}<AiExamImport /></>;
}
