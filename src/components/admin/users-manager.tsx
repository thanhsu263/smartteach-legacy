"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/button";
import { EmptyState, StatusBadge } from "@/components/ui/ui";
import { adminRequest } from "@/lib/admin/client";
import styles from "./admin.module.css";
type User = {
  userId: string;
  email: string;
  role: "admin" | "teacher";
  status: "active" | "blocked";
  version: number;
  premiumUntil: string | null;
};
export function UsersManager() {
  const [query, setQuery] = useState(""),
    [offset, setOffset] = useState(0),
    [refresh, setRefresh] = useState(0);
  const [data, setData] = useState<{
    items: User[];
    total: number;
    nextOffset: number | null;
  } | null>(null);
  const [selected, setSelected] = useState<User | null>(null),
    [action, setAction] = useState("block"),
    [role, setRole] = useState("teacher"),
    [reason, setReason] = useState("");
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const [roleFilter, setRoleFilter] = useState(""),
    [statusFilter, setStatusFilter] = useState("");
  useEffect(() => {
    let live = true;
    adminRequest<typeof data>(
      "/api/admin/users?q=" +
        encodeURIComponent(query) +
        "&offset=" +
        offset +
        "&role=" +
        roleFilter +
        "&status=" +
        statusFilter,
    )
      .then((value) => {
        if (live) {
          setData(value);
          setError("");
        }
      })
      .catch((issue) => {
        if (live) setError(issue.message);
      });
    return () => {
      live = false;
    };
  }, [query, offset, refresh, roleFilter, statusFilter]);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!selected) return;
    setBusy(true);
    setError("");
    try {
      const result = await adminRequest<{ authSyncPending: boolean }>(
        "/api/admin/users/" + selected.userId,
        {
          action,
          role,
          reason,
          expectedVersion: selected.version,
          requestId: crypto.randomUUID(),
        },
        "PATCH",
      );
      setSelected(null);
      setReason("");
      setRefresh((x) => x + 1);
      if (result.authSyncPending)
        setError(
          "Quyền DB đã cập nhật; đồng bộ phiên đăng nhập cần kiểm tra lại.",
        );
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : "Có lỗi.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <header>
        <h1>Tài khoản & phân quyền</h1>
        <p className={styles.muted}>
          Quản lý quyền và trạng thái. Không hiển thị nội dung riêng của giáo
          viên.
        </p>
      </header>
      <section className={styles.panel}>
        <label className={styles.field}>
          Tìm email
          <input
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOffset(0);
            }}
            maxLength={100}
          />
        </label>
        <div className={styles.toolbar}>
          <label className={styles.field}>
            Lọc vai trò
            <select
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value);
                setOffset(0);
              }}
            >
              <option value="">Tất cả</option>
              <option value="teacher">Giáo viên</option>
              <option value="admin">Quản trị viên</option>
            </select>
          </label>
          <label className={styles.field}>
            Lọc trạng thái
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setOffset(0);
              }}
            >
              <option value="">Tất cả</option>
              <option value="active">Hoạt động</option>
              <option value="blocked">Đã khóa</option>
            </select>
          </label>
        </div>
        {error && (
          <p role="alert" className={styles.error}>
            {error}
          </p>
        )}
        {!data ? (
          <p role="status">Đang tải tài khoản…</p>
        ) : (
          <>
            <p>{data.total} tài khoản</p>
            <div className={styles.scroll}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Email</th>
                    <th>Vai trò</th>
                    <th>Trạng thái</th>
                    <th>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((user) => (
                    <tr key={user.userId}>
                      <td>{user.email}</td>
                      <td>
                        {user.role === "admin" ? "Quản trị" : "Giáo viên"}
                      </td>
                      <td>
                        <StatusBadge tone={user.status === "active" ? "ok" : "bad"}>{user.status === "active" ? "Hoạt động" : "Đã khóa"}</StatusBadge>
                      </td>
                      <td>
                        <Button
                          onClick={() => {
                            setSelected(user);
                            setRole(user.role);
                            setAction(
                              user.status === "active" ? "block" : "unblock",
                            );
                          }}
                        >
                          Quản lý{" "}
                          <span className="visually-hidden">{user.email}</span>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!data.items.length && <EmptyState level={3} title="Không có tài khoản phù hợp" />}
            <div className={styles.actions}>
              <Button
                disabled={!offset}
                onClick={() => setOffset(Math.max(0, offset - 20))}
              >
                Trang trước
              </Button>
              <Button
                disabled={data.nextOffset === null}
                onClick={() => setOffset(data.nextOffset!)}
              >
                Trang sau
              </Button>
            </div>
          </>
        )}
      </section>
      {selected && (
        <section className={styles.panel} aria-label="Chỉnh tài khoản">
          <h2>{selected.email}</h2>
          <form className={styles.form} onSubmit={submit}>
            <label className={styles.field}>
              Thao tác
              <select
                value={action}
                onChange={(e) => setAction(e.target.value)}
              >
                <option value="block">Khóa tài khoản</option>
                <option value="unblock">Mở khóa tài khoản</option>
                <option value="set_role">Đổi vai trò</option>
              </select>
            </label>
            {action === "set_role" && (
              <label className={styles.field}>
                Vai trò
                <select value={role} onChange={(e) => setRole(e.target.value)}>
                  <option value="teacher">Giáo viên</option>
                  <option value="admin">Quản trị viên</option>
                </select>
              </label>
            )}
            <label className={styles.field}>
              Lý do
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                required
                minLength={3}
                maxLength={500}
              />
            </label>
            <div className={styles.actions}>
              <Button variant="primary" type="submit" disabled={busy}>
                {busy ? "Đang lưu…" : "Xác nhận thay đổi"}
              </Button>
              <Button type="button" onClick={() => setSelected(null)}>
                Hủy
              </Button>
            </div>
          </form>
        </section>
      )}
    </>
  );
}
