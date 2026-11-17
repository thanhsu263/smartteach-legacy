"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/button";
import { EmptyState, StatusBadge, type StatusTone } from "@/components/ui/ui";
import { adminRequest } from "@/lib/admin/client";
import type { Game } from "@/lib/catalog";
import { GRADES, SUBJECTS } from "@/lib/catalog";
import type { SiteSettings } from "@/lib/site/settings";
import s from "./admin.module.css";
const libraryStatus: Record<string, [string, StatusTone]> = {
  pending: ["Chờ duyệt", "warn"],
  approved: ["Đã duyệt", "ok"],
  rejected: ["Từ chối", "bad"],
  hidden: ["Đã ẩn", "neutral"],
};
type CatalogRow = {
  id: string;
  payload: Omit<Game, "id">;
  published: boolean;
  version: number;
};
export function GamesManager() {
  const [rows, setRows] = useState<CatalogRow[] | null>(null),
    [refresh, setRefresh] = useState(0),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const [edit, setEdit] = useState<CatalogRow | null>(null);
  useEffect(() => {
    let live = true;
    adminRequest<{ items: CatalogRow[] }>("/api/admin/games")
      .then((d) => {
        if (live) setRows(d.items);
      })
      .catch((e) => {
        if (live) setError(e.message);
      });
    return () => {
      live = false;
    };
  }, [refresh]);
  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!edit) return;
    setBusy(true);
    setError("");
    try {
      await adminRequest(
        edit.version ? "/api/admin/games/" + edit.id : "/api/admin/games",
        { ...edit, expectedVersion: edit.version },
        edit.version ? "PATCH" : "POST",
      );
      setEdit(null);
      setRefresh((x) => x + 1);
    } catch (issue) {
      setError((issue as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function payload(key: string, value: unknown) {
    setEdit((row) =>
      row ? { ...row, payload: { ...row.payload, [key]: value } } : row,
    );
  }
  return (
    <>
      <header>
        <h1>Danh mục game</h1>
        <p className={s.muted}>Quản lý trò chơi và trạng thái hiển thị.</p>
      </header>
      {error && (
        <p role="alert" className={s.error}>
          {error}
        </p>
      )}
      <section className={s.panel}>
        <Button
          variant="primary"
          onClick={() =>
            setEdit({
              id: "",
              payload: {
                title: "",
                description: "",
                subjects: [],
                grades: [],
                embedUrl: "https://www.quyentran.online/",
                credits: "",
                featured: false,
              },
              version: 0,
              published: true,
            })
          }
        >
          Thêm game
        </Button>
        {rows ? (
          <div className={s.scroll}>
            <table className={s.table}>
              <thead>
                <tr>
                  <th>Tên</th>
                  <th>Hiển thị</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td>{row.payload.title}</td>
                    <td><StatusBadge tone={row.published ? "ok" : "neutral"}>{row.published ? "Công khai" : "Đã ẩn"}</StatusBadge></td>
                    <td>
                      <Button onClick={() => setEdit(row)}>
                        Sửa{" "}
                        <span className="visually-hidden">
                          {row.payload.title}
                        </span>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p role="status">Đang tải…</p>
        )}
      </section>
      {edit && (
        <form className={s.panel + " " + s.form} onSubmit={save}>
          <h2>{edit.version ? "Chỉnh game" : "Game mới"}</h2>
          <label className={s.field}>
            Đường dẫn ngắn
            <input
              value={edit.id}
              disabled={edit.version > 0}
              required
              pattern="[a-z0-9][a-z0-9-]*"
              maxLength={100}
              onChange={(e) => setEdit({ ...edit, id: e.target.value })}
            />
          </label>
          <label className={s.field}>
            Tên game
            <input
              value={edit.payload.title}
              required
              maxLength={100}
              onChange={(e) => payload("title", e.target.value)}
            />
          </label>
          <label className={s.field}>
            Mô tả
            <textarea
              value={edit.payload.description}
              maxLength={1000}
              onChange={(e) => payload("description", e.target.value)}
            />
          </label>
          <label className={s.field}>
            Địa chỉ trò chơi
            <input
              type="url"
              value={edit.payload.embedUrl}
              required
              onChange={(e) => payload("embedUrl", e.target.value)}
            />
          </label>
          <p className={s.muted}>Nguồn nhúng hiện hỗ trợ: quyentran.online.</p>
          <label className={s.field}>
            Môn học
            <select
              multiple
              value={[...edit.payload.subjects]}
              onChange={(e) =>
                payload(
                  "subjects",
                  Array.from(e.target.selectedOptions, (x) => x.value),
                )
              }
            >
              {SUBJECTS.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.label}
                </option>
              ))}
            </select>
          </label>
          <label className={s.field}>
            Khối lớp
            <select
              multiple
              value={[...edit.payload.grades]}
              onChange={(e) =>
                payload(
                  "grades",
                  Array.from(e.target.selectedOptions, (x) => x.value),
                )
              }
            >
              {GRADES.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.label}
                </option>
              ))}
            </select>
          </label>
          <label className={s.field}>
            Ghi nguồn
            <textarea
              value={edit.payload.credits ?? ""}
              maxLength={1000}
              onChange={(e) => payload("credits", e.target.value)}
            />
          </label>
          <label>
            <input
              type="checkbox"
              checked={edit.published}
              onChange={(e) =>
                setEdit({ ...edit, published: e.target.checked })
              }
            />{" "}
            Công khai
          </label>
          <div className={s.actions}>
            <Button type="submit" variant="primary" disabled={busy}>
              Lưu game
            </Button>
            <Button onClick={() => setEdit(null)}>Hủy</Button>
          </div>
        </form>
      )}
    </>
  );
}
type Publication = {
  id: string;
  title: string;
  description: string;
  status: string;
  version: number;
  questions: { prompt: string; options: { label: string }[] }[];
};
export function LibraryManager() {
  const [items, setItems] = useState<Publication[] | null>(null),
    [status, setStatus] = useState(""),
    [offset, setOffset] = useState(0),
    [selected, setSelected] = useState<Publication | null>(null),
    [reason, setReason] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [refresh, setRefresh] = useState(0);
  useEffect(() => {
    let live = true;
    adminRequest<{ items: Publication[] }>(
      "/api/admin/library?status=" + status + "&offset=" + offset,
    )
      .then((d) => {
        if (live) setItems(d.items);
      })
      .catch((e) => {
        if (live) setError(e.message);
      });
    return () => {
      live = false;
    };
  }, [status, offset, refresh]);
  async function moderate(next: string) {
    if (!selected) return;
    setBusy(true);
    setError("");
    try {
      await adminRequest("/api/admin/library/" + selected.id + "/moderate", {
        status: next,
        reason,
        expectedVersion: selected.version,
      });
      setSelected(null);
      setReason("");
      setRefresh((x) => x + 1);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <header>
        <h1>Duyệt học liệu</h1>
        <p className={s.muted}>
          Chỉ xem bản gửi duyệt; không truy cập quiz riêng của giáo viên.
        </p>
      </header>
      {error && (
        <p role="alert" className={s.error}>
          {error}
        </p>
      )}
      <section className={s.panel}>
        <label className={s.field}>
          Trạng thái
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setOffset(0);
            }}
          >
            <option value="">Tất cả bản gửi</option>
            {["pending", "approved", "rejected", "hidden"].map((x) => (
              <option key={x} value={x}>{libraryStatus[x][0]}</option>
            ))}
          </select>
        </label>
        {items ? (
          <>
            <div className={s.scroll}>
              <table className={s.table}>
                <thead>
                  <tr>
                    <th>Học liệu</th>
                    <th>Trạng thái</th>
                    <th>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id}>
                      <td>{item.title}</td>
                      <td><StatusBadge tone={libraryStatus[item.status]?.[1]}>{libraryStatus[item.status]?.[0] ?? item.status}</StatusBadge></td>
                      <td>
                        <Button onClick={() => setSelected(item)}>
                          Xem bản gửi
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!items.length && <EmptyState level={3} title="Không có bản gửi" />}
            <div className={s.actions}>
              <Button disabled={!offset} onClick={() => setOffset(offset - 20)}>
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
      {selected && (
        <section className={s.panel}>
          <h2>{selected.title}</h2>
          <p>{selected.description}</p>
          <ol>
            {selected.questions.map((q, i) => (
              <li key={i}>
                <p>{q.prompt}</p>
                <ul>
                  {q.options.map((o, j) => (
                    <li key={j}>{o.label}</li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>
          <label className={s.field}>
            Lý do / nhận xét
            <textarea
              value={reason}
              maxLength={500}
              onChange={(e) => setReason(e.target.value)}
            />
          </label>
          <div className={s.actions}>
            <Button
              disabled={busy}
              variant="primary"
              onClick={() => void moderate("approved")}
            >
              Duyệt
            </Button>
            <Button
              disabled={busy || reason.trim().length < 3}
              onClick={() => void moderate("rejected")}
            >
              Từ chối
            </Button>
            <Button disabled={busy} onClick={() => void moderate("hidden")}>
              Ẩn
            </Button>
            <Button onClick={() => setSelected(null)}>Đóng</Button>
          </div>
        </section>
      )}
    </>
  );
}
export function SettingsManager() {
  const [value, setValue] = useState<{
      data: SiteSettings;
      version: number;
    } | null>(null),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    adminRequest<typeof value>("/api/admin/settings")
      .then(setValue)
      .catch((e) => setError(e.message));
  }, []);
  function update(key: string, data: unknown) {
    setValue((v) => (v ? { ...v, data: { ...v.data, [key]: data } } : v));
  }
  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!value) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await adminRequest(
        "/api/admin/settings",
        { data: value.data, expectedVersion: value.version },
        "PATCH",
      );
      setValue((v) => (v ? { ...v, version: v.version + 1 } : v));
      setMessage("Đã cập nhật cấu hình.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <header>
        <h1>Cấu hình website</h1>
      </header>
      {error && (
        <p role="alert" className={s.error}>
          {error}
        </p>
      )}
      {message && (
        <p role="status" className={s.success}>
          {message}
        </p>
      )}
      {value ? (
        <form className={s.panel + " " + s.form} onSubmit={save}>
          <label className={s.field}>
            Email liên hệ
            <input
              type="email"
              required
              value={value.data.contactEmail}
              onChange={(e) => update("contactEmail", e.target.value)}
            />
          </label>
          <label className={s.field}>
            Thông báo
            <textarea
              value={value.data.announcement}
              maxLength={1000}
              onChange={(e) => update("announcement", e.target.value)}
            />
          </label>
          <label>
            <input
              type="checkbox"
              checked={value.data.chatbotEnabled}
              onChange={(e) => update("chatbotEnabled", e.target.checked)}
            />{" "}
            Bật chatbot (cần cấu hình AI và kho nguồn sẵn sàng)
          </label>
          <label>
            <input
              type="checkbox"
              checked={value.data.librarySubmissionsEnabled}
              onChange={(e) =>
                update("librarySubmissionsEnabled", e.target.checked)
              }
            />{" "}
            Nhận học liệu gửi duyệt
          </label>
          <h2>Câu hỏi thường gặp</h2>
          {value.data.faq.map((faq, i) => (
            <div key={i} className={s.form}>
              <label className={s.field}>
                Câu hỏi {i + 1}
                <input
                  required
                  value={faq.question}
                  maxLength={200}
                  onChange={(e) =>
                    update(
                      "faq",
                      value.data.faq.map((x, j) =>
                        j === i ? { ...x, question: e.target.value } : x,
                      ),
                    )
                  }
                />
              </label>
              <label className={s.field}>
                Trả lời
                <textarea
                  value={faq.answer}
                  required
                  maxLength={2000}
                  onChange={(e) =>
                    update(
                      "faq",
                      value.data.faq.map((x, j) =>
                        j === i ? { ...x, answer: e.target.value } : x,
                      ),
                    )
                  }
                />
              </label>
              <Button
                onClick={() =>
                  update(
                    "faq",
                    value.data.faq.filter((_, j) => j !== i),
                  )
                }
              >
                Xóa câu hỏi {i + 1}
              </Button>
            </div>
          ))}
          <Button
            disabled={value.data.faq.length >= 20}
            onClick={() =>
              update("faq", [...value.data.faq, { question: "", answer: "" }])
            }
          >
            Thêm câu hỏi
          </Button>
          <Button type="submit" variant="primary" disabled={busy}>
            Lưu cấu hình
          </Button>
        </form>
      ) : (
        <p role="status">Đang tải…</p>
      )}
    </>
  );
}
