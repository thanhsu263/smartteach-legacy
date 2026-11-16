"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { adminRequest } from "@/lib/admin/client";
import type { RetrievedChunk } from "@/lib/chat/answer";
import s from "./chat.module.css";
export function SourceViewer({ id }: { id: string }) {
  const [data, setData] = useState<RetrievedChunk | null>(null),
    [error, setError] = useState("");
  useEffect(() => {
    let live = true;
    adminRequest<RetrievedChunk>("/api/chat/sources/" + id)
      .then((d) => {
        if (live) setData(d);
      })
      .catch((e) => {
        if (live) setError(e.message);
      });
    return () => {
      live = false;
    };
  }, [id]);
  return (
    <div className={s.viewer}>
      <Link href="/dashboard">← Về không gian dạy học</Link>
      {error ? (
        <>
          <h1>Nguồn không còn truy cập được</h1>
          <p role="alert">{error}</p>
        </>
      ) : data ? (
        <>
          <h1>{data.title}</h1>
          <p>
            {data.locator.page
              ? "Trang " + data.locator.page
              : data.locator.paragraph
                ? "Đoạn " + data.locator.paragraph
                : "Câu " + data.locator.question}
          </p>
          <blockquote>{data.body}</blockquote>
          {data.kind === "library" && data.publicationId && (
            <Link href={"/library/" + data.publicationId}>
              Mở học liệu đã duyệt
            </Link>
          )}
        </>
      ) : (
        <p role="status">Đang kiểm tra nguồn…</p>
      )}
    </div>
  );
}
