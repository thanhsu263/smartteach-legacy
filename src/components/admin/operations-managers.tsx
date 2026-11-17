"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/button";
import { adminRequest } from "@/lib/admin/client";
import s from "./admin.module.css";
type OverviewData = {
  users: number;
  quizzes: number;
  approved: number;
  pending: number;
  reports: number;
  adjustments: number;
  orders: Record<string, number>;
};
export function Overview() {
  const [data, setData] = useState<OverviewData | null>(null),
    [error, setError] = useState("");
  useEffect(() => {
    let live = true;
    adminRequest<OverviewData>("/api/admin/overview")
      .then((d) => {
        if (live) setData(d);
      })
      .catch((e) => {
        if (live) setError(e.message);
      });
    return () => {
      live = false;
    };
  }, []);
  return (
    <>
      <header>
        <h1>Tổng quan hệ thống</h1>
        <p className={s.muted}>
          Số liệu tổng hợp; không truy cập nội dung riêng của giáo viên.
        </p>
      </header>
      {error && <p role="alert">{error}</p>}
      {data ? (
        <>
          <div className={s.grid}>
            {(
              [
                ["Tài khoản", data.users],
                ["Quiz", data.quizzes],
                ["Học liệu được duyệt", data.approved],
                ["Chờ duyệt", data.pending],
                ["Báo cáo chưa xử lý", data.reports],
                ["Điều chỉnh Premium", data.adjustments],
              ] as const
            ).map(([label, n]) => (
              <div key={label} className={s.metric}>
                <span>{label}</span>
                <strong>{n}</strong>
              </div>
            ))}
          </div>
          <section className={s.panel}>
            <h2>Đơn thành viên</h2>
            {Object.entries(data.orders).map(([status, n]) => (
              <p key={status}>
                {status}: {n}
              </p>
            ))}
            {!Object.keys(data.orders).length && <p>Chưa có đơn.</p>}
            <p>payOS đang hoãn kích hoạt.</p>
          </section>
        </>
      ) : (
        !error && <p role="status">Đang tải…</p>
      )}
    </>
  );
}
export function Operations() {
  const [data, setData] = useState<Record<string, string> | null>(null),
    [error, setError] = useState("");
  useEffect(() => {
    adminRequest<Record<string, string>>("/api/admin/operations")
      .then(setData)
      .catch((e) => setError(e.message));
  }, []);
  const names: Record<string, string> = {
    payments: "Thanh toán",
    ai: "Gemini",
    rag: "Kho vector",
    scheduler: "Lịch nền",
    encryption: "Mã hóa",
    worker: "Worker",
    examImport: "Nhập đề kiểm tra",
    examFinalizer: "Chốt bài thi",
    jobs: "Hàng đợi kho vector",
    credentials: "Key Gemini",
    authSync: "Đồng bộ tài khoản",
  };
  return (
    <>
      <h1>Vận hành</h1>
      {error && <p role="alert">{error}</p>}
      <div className={s.grid}>
        {data ? (
          Object.entries(data).map(([key, value]) => (
            <div key={key} className={s.panel}>
              <h2>{names[key] ?? key}</h2>
              <p>{value}</p>
            </div>
          ))
        ) : (
          <p role="status">Đang tải…</p>
        )}
      </div>
    </>
  );
}
type Membership = {
  userId: string;
  version: number;
  premiumUntil: string | null;
  orders: {
    id: string;
    planId: string;
    amount: number;
    status: string;
    createdAt: string;
  }[];
  adjustments: {
    id: string;
    action: string;
    reason: string;
    premiumUntil: string;
  }[];
};
type User = { userId: string; email: string };
export function MembershipManager() {
  const [query, setQuery] = useState(""),
    [users, setUsers] = useState<User[]>([]),
    [value, setValue] = useState<Membership | null>(null),
    [action, setAction] = useState("month"),
    [reason, setReason] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function search(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      setUsers(
        (
          await adminRequest<{ items: User[] }>(
            "/api/admin/users?q=" + encodeURIComponent(query),
          )
        ).items,
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function select(userId: string) {
    setError("");
    try {
      setValue(
        await adminRequest<Membership>(
          "/api/admin/memberships?userId=" + userId,
        ),
      );
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!value) return;
    setBusy(true);
    setError("");
    try {
      await adminRequest("/api/admin/memberships", {
        userId: value.userId,
        action,
        reason,
        expectedVersion: value.version,
        requestId: crypto.randomUUID(),
      });
      await select(value.userId);
      setReason("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <header>
        <h1>Thành viên và đơn</h1>
        <p>
          payOS đang hoãn kích hoạt. Điều chỉnh dưới đây chỉ thay đổi quyền
          Premium.
        </p>
      </header>
      {error && (
        <p role="alert" className={s.error}>
          {error}
        </p>
      )}
      <form onSubmit={search} className={s.toolbar}>
        <label className={s.field}>
          Tìm email
          <input
            value={query}
            maxLength={100}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <Button type="submit" disabled={busy}>
          Tìm tài khoản
        </Button>
      </form>
      <section className={s.panel}>
        {users.map((u) => (
          <p key={u.userId}>
            <Button onClick={() => void select(u.userId)}>{u.email}</Button>
          </p>
        ))}
        {!users.length && <p>Tìm tài khoản để xem hạn Premium.</p>}
      </section>
      {value && (
        <>
          <form className={s.panel + " " + s.form} onSubmit={save}>
            <h2>Điều chỉnh quyền</h2>
            <p>
              Hết hạn:{" "}
              {value.premiumUntil
                ? new Date(value.premiumUntil).toLocaleString("vi-VN")
                : "Chưa có Premium"}
            </p>
            <label className={s.field}>
              Thao tác
              <select
                value={action}
                onChange={(e) => setAction(e.target.value)}
              >
                <option value="month">Cộng 1 tháng</option>
                <option value="year">Cộng 1 năm</option>
                <option value="revoke">Thu hồi Premium</option>
              </select>
            </label>
            <label className={s.field}>
              Lý do
              <textarea
                required
                minLength={3}
                maxLength={500}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </label>
            <Button type="submit" disabled={busy} variant="primary">
              Xác nhận điều chỉnh
            </Button>
          </form>
          <section className={s.panel}>
            <h2>Đơn gần đây</h2>
            {value.orders.map((o) => (
              <p key={o.id}>
                {o.planId} · {o.amount.toLocaleString("vi-VN")}đ · {o.status}
              </p>
            ))}
            {!value.orders.length && <p>Chưa có đơn.</p>}
            <h2>Điều chỉnh gần đây</h2>
            {value.adjustments.map((a) => (
              <p key={a.id}>
                {a.action} · {a.reason}
              </p>
            ))}
          </section>
        </>
      )}
    </>
  );
}
type Report = {
  id: string;
  publicationId: string;
  title: string;
  reason: string;
  note: string;
};
export function ReportsManager() {
  const [rows, setRows] = useState<Report[] | null>(null),
    [offset, setOffset] = useState(0),
    [refresh, setRefresh] = useState(0),
    [reason, setReason] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    adminRequest<{ items: Report[] }>("/api/admin/reports?offset=" + offset)
      .then((d) => setRows(d.items))
      .catch((e) => setError(e.message));
  }, [offset, refresh]);
  async function resolve(id: string) {
    setBusy(true);
    setError("");
    try {
      await adminRequest("/api/admin/reports", { id, reason }, "PATCH");
      setReason("");
      setRefresh((x) => x + 1);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className={s.panel}>
      <h2>Báo cáo học liệu</h2>
      {error && <p role="alert">{error}</p>}
      <label className={s.field}>
        Kết quả xử lý
        <textarea
          value={reason}
          maxLength={500}
          onChange={(e) => setReason(e.target.value)}
        />
      </label>
      {rows ? (
        rows.map((r) => (
          <article key={r.id}>
            <h3>{r.title}</h3>
            <p>
              {r.reason} · {r.note}
            </p>
            <Button
              disabled={busy || reason.trim().length < 3}
              onClick={() => void resolve(r.id)}
            >
              Đánh dấu đã xử lý
            </Button>
          </article>
        ))
      ) : (
        <p role="status">Đang tải…</p>
      )}
      {rows?.length === 0 && <p>Không có báo cáo chờ xử lý.</p>}
      <div className={s.actions}>
        <Button disabled={!offset} onClick={() => setOffset((x) => x - 20)}>
          Báo cáo trước
        </Button>
        <Button
          disabled={!rows || rows.length < 20}
          onClick={() => setOffset((x) => x + 20)}
        >
          Báo cáo sau
        </Button>
      </div>
    </section>
  );
}
