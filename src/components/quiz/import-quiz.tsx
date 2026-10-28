"use client";

import { useRouter } from "next/navigation";
import { useId, useRef, useState } from "react";
import { Button } from "@/components/button";
import { importQuiz, validateTitle } from "@/lib/quiz/api";
import {
  buildTemplateCsv,
  hasBlockingIssue,
  IMPORT_MAX_BYTES,
  parseImportFile,
  parseImportText,
  TEMPLATE_HEADER,
  TEXT_SYNTAX_EXAMPLE,
  titleFromFileName,
  type ImportParse,
} from "@/lib/quiz/import";
import { KIND_LABELS } from "@/lib/quiz/types";
import { getBrowserSupabase } from "@/lib/supabase/client";
import styles from "./import-quiz.module.css";

type Mode = "file" | "text";

const SEVERITY_LABEL = { error: "Lỗi", warning: "Cảnh báo" } as const;

/**
 * Nhập quiz từ tệp (.csv, .xlsx) hoặc văn bản dán. Tệp chỉ được đọc ở trình duyệt, không gửi đi đâu; chỉ khi thầy cô bấm
 * "Tạo quiz" thì bộ câu hỏi đã đọc mới gửi lên (một giao dịch: lỗi thì không tạo gì). Còn lỗi chặn thì chưa cho tạo.
 */
export function ImportQuiz() {
  const router = useRouter();
  const baseId = useId();
  // Số thứ tự lần đọc tệp gần nhất: kết quả của lần đọc cũ (chậm hơn, ví dụ .xlsx) không được ghi đè lần mới.
  const readSeq = useRef(0);
  // Tên quiz do thầy cô tự gõ thì không bị tên tệp mới ghi đè.
  const titleEdited = useRef(false);
  const [mode, setMode] = useState<Mode>("file");
  const [title, setTitle] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [parse, setParse] = useState<ImportParse | null>(null);
  const [reading, setReading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const blocking = parse ? hasBlockingIssue(parse) : true;
  const errorCount = parse?.issues.filter((issue) => issue.severity === "error").length ?? 0;
  const warningCount = parse?.issues.filter((issue) => issue.severity === "warning").length ?? 0;
  const titleProblem = validateTitle(title);

  function switchMode(next: Mode) {
    readSeq.current += 1; // bỏ kết quả của lần đọc tệp đang dở
    setReading(false);
    setMode(next);
    setParse(null);
    setError(null);
  }

  async function onFile(file: File | undefined) {
    const seq = (readSeq.current += 1);
    setParse(null);
    setError(null);
    if (!file) {
      setReading(false);
      setFileName(null);
      return;
    }
    setFileName(file.name);
    setReading(true);
    const result = await parseImportFile(file);
    if (seq !== readSeq.current) return;
    setReading(false);
    setParse(result);
    if (!titleEdited.current) setTitle(titleFromFileName(file.name).slice(0, 100));
  }

  function onReadText() {
    setError(null);
    setParse(parseImportText(text));
  }

  function downloadTemplate() {
    const url = URL.createObjectURL(new Blob([buildTemplateCsv()], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "mau-quiz.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  async function create() {
    const supabase = getBrowserSupabase();
    if (!supabase || busy || !parse || blocking) return;
    if (titleProblem) {
      setError(titleProblem);
      return;
    }
    setBusy(true);
    setError(null);
    const result = await importQuiz(
      supabase,
      title,
      parse.questions.map((item) => item.question),
    );
    if (!result.ok) {
      setBusy(false);
      setError(result.message);
      return;
    }
    router.push(`/my-quizzes/${result.id}`);
  }

  return (
    <div className={styles.root}>
      <div role="tablist" aria-label="Cách nhập" className={styles.tabs}>
        {(["file", "text"] as const).map((value) => (
          <button
            key={value}
            type="button"
            role="tab"
            id={`${baseId}-tab-${value}`}
            aria-selected={mode === value}
            aria-controls={`${baseId}-panel`}
            tabIndex={mode === value ? 0 : -1}
            className={styles.tab}
            onClick={() => switchMode(value)}
            onKeyDown={(event) => {
              if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
                event.preventDefault();
                switchMode(value === "file" ? "text" : "file");
                requestAnimationFrame(() => document.getElementById(`${baseId}-tab-${value === "file" ? "text" : "file"}`)?.focus());
              }
            }}
          >
            {value === "file" ? "Tải tệp" : "Dán văn bản"}
          </button>
        ))}
      </div>

      <section id={`${baseId}-panel`} role="tabpanel" aria-labelledby={`${baseId}-tab-${mode}`} className={styles.panel}>
        {mode === "file" ? (
          <div className={styles.stack}>
            <div className={styles.field}>
              <label htmlFor={`${baseId}-file`}>Chọn tệp Excel (.xlsx) hoặc CSV (.csv)</label>
              <input
                id={`${baseId}-file`}
                type="file"
                accept=".csv,.xlsx"
                onChange={(event) => {
                  const input = event.target;
                  const file = input.files?.[0];
                  // Đặt lại để chọn lại đúng tệp cũ (sau khi đã sửa lỗi trong tệp) vẫn kích hoạt đọc lại.
                  input.value = "";
                  void onFile(file);
                }}
              />
              {fileName ? <p className={styles.hint}>Đang dùng tệp: {fileName}</p> : null}
              <p className={styles.hint}>Tệp chỉ được đọc trên máy của thầy cô, không tải lên đâu cả. Tối đa {Math.round(IMPORT_MAX_BYTES / 1_000_000)} MB.</p>
            </div>
            <div className={styles.actions}>
              <Button variant="secondary" onClick={downloadTemplate}>
                Tải tệp mẫu (CSV)
              </Button>
            </div>
            <details className={styles.details}>
              <summary>Cách điền tệp</summary>
              <p>
                Hàng đầu là tên cột: <strong>{TEMPLATE_HEADER.join(", ")}</strong>. Mỗi hàng sau là một câu. Đáp án đúng ghi bằng chữ cái (A, hoặc A, C
                cho nhiều đáp án); câu đúng/sai ghi Đúng hoặc Sai; câu điền từ ghi các đáp án chấp nhận ngăn bằng dấu | . Để trống cột Loại câu thì tự
                nhận ra. Dùng Excel (.xlsx) hoặc lưu CSV dạng UTF-8 để giữ chữ có dấu.
              </p>
            </details>
          </div>
        ) : (
          <div className={styles.stack}>
            <div className={styles.field}>
              <label htmlFor={`${baseId}-text`}>Dán nội dung câu hỏi</label>
              <textarea
                id={`${baseId}-text`}
                rows={10}
                value={text}
                spellCheck={false}
                onChange={(event) => {
                  setText(event.target.value);
                  setParse(null);
                }}
              />
            </div>
            <div className={styles.actions}>
              <Button variant="primary" onClick={onReadText} disabled={text.trim() === ""}>
                Xem trước
              </Button>
            </div>
            <details className={styles.details}>
              <summary>Xem cú pháp dán</summary>
              <p>
                Các câu cách nhau bằng dòng trống. Lựa chọn viết dạng <code>A. nội dung</code>; đáp án đúng đánh dấu <code>*</code> hoặc ghi dòng{" "}
                <code>Đáp án: B</code>. Câu điền từ không có lựa chọn, ghi <code>Đáp án: a | b</code>. Thời gian ghi <code>[30s]</code> cuối dòng câu hỏi.
              </p>
              <pre className={styles.example} tabIndex={0} aria-label="Ví dụ cú pháp dán">
                {TEXT_SYNTAX_EXAMPLE}
              </pre>
            </details>
          </div>
        )}
      </section>

      {reading ? (
        <p role="status" aria-busy="true" className={styles.hint}>
          Đang đọc tệp…
        </p>
      ) : null}

      {parse ? (
        <section className={styles.result} aria-label="Kết quả đọc">
          <p role="status" className={`${styles.summary} animate-fade-up`}>
            {parse.questions.length} câu đọc được · {errorCount} lỗi · {warningCount} cảnh báo.{" "}
            {blocking ? "Cần sửa lỗi trong tệp hoặc văn bản rồi chọn lại." : "Có thể tạo quiz."}
          </p>

          {parse.issues.length > 0 ? (
            <ul className={styles.issues} aria-label="Lỗi và cảnh báo">
              {parse.issues.map((issue, index) => (
                <li key={index} data-severity={issue.severity}>
                  <strong>{SEVERITY_LABEL[issue.severity]}</strong>
                  {issue.line > 0 ? ` (dòng ${issue.line})` : ""}: {issue.message}
                </li>
              ))}
            </ul>
          ) : null}

          {parse.questions.length > 0 ? (
            <ol className={styles.preview} aria-label="Xem trước các câu hỏi">
              {parse.questions.map(({ question, line }, index) => (
                <li key={index} className={styles.item}>
                  <p className={styles.meta}>
                    Câu {index + 1} · {KIND_LABELS[question.kind]} · {question.time_limit_seconds} giây · dòng {line}
                  </p>
                  <p className={styles.prompt}>{question.prompt}</p>
                  {question.kind === "short_text" ? (
                    <p className={styles.answers}>
                      Đáp án chấp nhận: {question.accepted_answers.join(" / ")}
                      {question.ignore_diacritics ? " (không phân biệt dấu)" : ""}
                    </p>
                  ) : (
                    <ul className={styles.options}>
                      {question.options.map((option, optionIndex) => (
                        <li key={optionIndex}>
                          {option.label}
                          {option.is_correct ? <strong> (đáp án đúng)</strong> : null}
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ol>
          ) : null}

          <div className={styles.create}>
            <div className={styles.field}>
              <label htmlFor={`${baseId}-title`}>Tên quiz</label>
              <input
                id={`${baseId}-title`}
                type="text"
                value={title}
                maxLength={100}
                placeholder="Ví dụ: Ôn tập chương 1"
                onChange={(event) => {
                  titleEdited.current = event.target.value.trim() !== "";
                  setTitle(event.target.value);
                }}
              />
            </div>
            <Button variant="primary" onClick={() => void create()} disabled={busy || blocking || titleProblem !== null}>
              {busy ? "Đang tạo…" : `Tạo quiz (${parse.questions.length} câu)`}
            </Button>
            {titleProblem && !blocking ? <p className={styles.hint}>{titleProblem}</p> : null}
          </div>
        </section>
      ) : null}

      {error ? (
        <p role="alert" className={`${styles.error} animate-fade-up`}>
          {error}
        </p>
      ) : null}
    </div>
  );
}
