"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/button";
import { adminRequest } from "@/lib/admin/client";
import styles from "./admin.module.css";
type Event = {
  id: number;
  actorId: string;
  targetId: string;
  action: string;
  createdAt: string;
  metadata: { reason?: string };
};
export function AuditList() {
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<Event[] | null>(null),
    [offset, setOffset] = useState(0),
    [error, setError] = useState("");
  useEffect(() => {
    let live = true;
    adminRequest<{ items: Event[] }>(
      "/api/admin/audit?offset=" + offset + "&q=" + encodeURIComponent(query),
    )
      .then((data) => {
        if (live) setItems(data.items);
      })
      .catch((issue) => {
        if (live) setError(issue.message);
      });
    return () => {
      live = false;
    };
  }, [offset, query]);
  return (
    <>
      <header>
        <h1>Nhật ký quản trị</h1>
        <p className={styles.muted}>
          Metadata thao tác; không chứa nội dung hội thoại, học sinh hoặc khóa
          API.
        </p>
      </header>
      <section className={styles.panel}>
        <label className={styles.field}>
          Lọc thao tác hoặc ID tài khoản/đối tượng
          <input
            type="search"
            value={query}
            maxLength={100}
            onChange={(e) => {
              setQuery(e.target.value);
              setOffset(0);
            }}
          />
        </label>
        {error && <p role="alert">{error}</p>}
        {items ? (
          <>
            <div className={styles.scroll}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Thời điểm</th>
                    <th>Thao tác</th>
                    <th>Người thực hiện</th>
                    <th>Đối tượng</th>
                    <th>Lý do</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id}>
                      <td>
                        {new Date(item.createdAt).toLocaleString("vi-VN")}
                      </td>
                      <td>{item.action}</td>
                      <td className={styles.code}>
                        {item.actorId ?? "Hệ thống"}
                      </td>
                      <td className={styles.code}>{item.targetId}</td>
                      <td>{item.metadata.reason ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!items.length && <p>Chưa có thao tác.</p>}
            <div className={styles.actions}>
              <Button
                disabled={!offset}
                onClick={() => setOffset(Math.max(0, offset - 20))}
              >
                Trang trước
              </Button>
              <Button
                disabled={items.length < 20}
                onClick={() => setOffset(offset + 20)}
              >
                Trang sau
              </Button>
            </div>
          </>
        ) : (
          <p role="status">Đang tải…</p>
        )}
      </section>
    </>
  );
}
