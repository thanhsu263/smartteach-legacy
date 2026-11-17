"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/button";
import { EmptyState } from "@/components/ui/ui";
import { adminRequest } from "@/lib/admin/client";
import s from "./admin.module.css";
type Config = {
  settings: {
    model: string | null;
    outputTokens: number;
    userDailyCap: number;
    rpm: number;
    tpm: number;
    rpd: number;
    version: number;
  };
  credentials: {
    id: string;
    label: string;
    projectRef: string;
    last4: string;
    enabled: boolean;
    state: string;
    version: number;
    errorCode: string | null;
  }[];
  models: { id: string; label: string }[];
  embeddingModel: string;
  encryptionReady: boolean;
};
export function AiSettings() {
  const [editing, setEditing] = useState<{
    id: string;
    version: number;
  } | null>(null);
  const [data, setData] = useState<Config | null>(null),
    [refresh, setRefresh] = useState(0),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [label, setLabel] = useState(""),
    [project, setProject] = useState(""),
    [key, setKey] = useState(""),
    [verified, setVerified] = useState(false);
  useEffect(() => {
    adminRequest<Config>("/api/admin/ai/settings")
      .then(setData)
      .catch((e) => setError(e.message));
  }, [refresh]);
  async function perform(url: string, body: unknown, method = "POST") {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await adminRequest(url, body, method);
      setRefresh((x) => x + 1);
      setMessage("Đã thực hiện.");
      return true;
    } catch (e) {
      setError((e as Error).message);
      return false;
    } finally {
      setBusy(false);
    }
  }
  async function saveKey(e: React.FormEvent) {
    e.preventDefault();
    const input = key;
    setKey("");
    const ok = await perform("/api/admin/ai/credentials", {
      label,
      projectRef: project,
      key: input,
      freeVerified: verified,
      id: editing?.id,
      expectedVersion: editing?.version ?? 0,
    });
    if (ok) setEditing(null);
  }
  return (
    <>
      <header>
        <h1>AI và API</h1>
        <p className={s.muted}>
          Quota dùng chung theo project/model. Key cùng project không tăng hạn
          mức.
        </p>
      </header>
      {error && (
        <p className={s.error} role="alert">
          {error}
        </p>
      )}
      {message && <p role="status">{message}</p>}
      {data ? (
        <>
          <form
            className={s.panel + " " + s.form}
            onSubmit={(e) => {
              e.preventDefault();
              const { version, ...settings } = data.settings;
              void perform(
                "/api/admin/ai/settings",
                { data: settings, expectedVersion: version },
                "PATCH",
              );
            }}
          >
            <h2>Model và giới hạn ứng dụng</h2>
            <label className={s.field}>
              Model trả lời
              <select
                value={data.settings.model ?? ""}
                onChange={(e) =>
                  setData({
                    ...data,
                    settings: {
                      ...data.settings,
                      model: e.target.value || null,
                    },
                  })
                }
              >
                <option value="">Chưa chọn — chatbot chưa sẵn sàng</option>
                {data.models.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ))}
              </select>
            </label>
            <p>Embedding: {data.embeddingModel} · 768 chiều</p>
            {(
              [
                ["outputTokens", "Token đầu ra", 100, 1500],
                ["userDailyCap", "Lượt chat/người/ngày", 1, 100],
                ["rpm", "Request/project/model/phút", 1, 100],
                ["tpm", "Token dự trù/project/model/phút", 2000, 1000000],
                ["rpd", "Request/project/model/ngày", 1, 10000],
              ] as const
            ).map(([name, title, min, max]) => (
              <label key={name} className={s.field}>
                {title}
                <input
                  required
                  type="number"
                  min={min}
                  max={max}
                  value={data.settings[name]}
                  onChange={(e) =>
                    setData({
                      ...data,
                      settings: {
                        ...data.settings,
                        [name]: Number(e.target.value),
                      },
                    })
                  }
                />
              </label>
            ))}
            <p className={s.muted}>
              Các cap ứng dụng phải thấp hơn quota hiện hành trong AI Studio;
              đây không phải số lượt Google còn lại.
            </p>
            <Button variant="primary" type="submit" disabled={busy}>
              Lưu cấu hình AI
            </Button>
          </form>
          <section className={s.panel}>
            <h2>Khóa API</h2>
            {!data.encryptionReady && (
              <p role="status">
                Chưa cấu hình khóa mã hóa trên máy chủ; không thể lưu key.
              </p>
            )}
            {data.credentials.map((c) => (
              <article key={c.id}>
                <h3>{c.label}</h3>
                <p>
                  {c.projectRef} · ••••{c.last4} · {c.state} ·{" "}
                  {c.enabled ? "Đang bật" : "Đã tắt"}
                </p>
                <div className={s.actions}>
                  <Button
                    disabled={busy || !c.enabled}
                    onClick={() =>
                      void perform(
                        "/api/admin/ai/credentials/" + c.id + "/test",
                        {},
                      )
                    }
                  >
                    Kiểm kết nối
                  </Button>
                  <Button
                    disabled={busy}
                    onClick={() => {
                      setEditing({ id: c.id, version: c.version });
                      setLabel(c.label);
                      setProject(c.projectRef);
                      setKey("");
                      setVerified(false);
                    }}
                  >
                    Thay key
                  </Button>
                  <Button
                    disabled={busy}
                    onClick={() =>
                      void perform(
                        "/api/admin/ai/credentials/" + c.id,
                        {
                          operation: c.enabled ? "disable" : "enable",
                          expectedVersion: c.version,
                        },
                        "PATCH",
                      )
                    }
                  >
                    {c.enabled ? "Tắt" : "Bật"}
                  </Button>
                  <Button
                    disabled={busy}
                    onClick={() => {
                      if (confirm("Xóa khóa API này khỏi cấu hình?"))
                        void perform(
                          "/api/admin/ai/credentials/" + c.id,
                          { expectedVersion: c.version },
                          "DELETE",
                        );
                    }}
                  >
                    Xóa key
                  </Button>
                </div>
              </article>
            ))}
            {!data.credentials.length && <EmptyState level={3} title="Chưa có key" />}
          </section>
          <form onSubmit={saveKey} className={s.panel + " " + s.form}>
            <h2>{editing ? "Thay khóa API" : "Thêm khóa API"}</h2>
            {editing && (
              <Button onClick={() => setEditing(null)}>Hủy thay key</Button>
            )}
            <label className={s.field}>
              Tên gợi nhớ
              <input
                required
                maxLength={80}
                value={label}
                onChange={(e) => setLabel(e.target.value)}
              />
            </label>
            <label className={s.field}>
              Google Cloud project ID
              <input
                required
                pattern="[a-z0-9][a-z0-9-]{2,99}"
                value={project}
                onChange={(e) => setProject(e.target.value)}
              />
            </label>
            <label className={s.field}>
              API key (chỉ nhập một lần)
              <input
                type="password"
                autoComplete="off"
                required
                minLength={20}
                maxLength={256}
                value={key}
                onChange={(e) => setKey(e.target.value)}
              />
            </label>
            <label>
              <input
                required
                type="checkbox"
                checked={verified}
                onChange={(e) => setVerified(e.target.checked)}
              />{" "}
              Tôi đã kiểm tra project đang dùng Free Tier và không bật billing
              trong AI Studio.
            </label>
            <p>
              Google có thể dùng dữ liệu Free Tier để cải thiện sản phẩm. Chỉ
              đưa tài liệu được phép chia sẻ; không dùng dữ liệu học sinh hoặc
              nội dung riêng.
            </p>
            <Button
              type="submit"
              variant="primary"
              disabled={busy || !data.encryptionReady}
            >
              Lưu key đã mã hóa
            </Button>
          </form>
        </>
      ) : (
        <p role="status">Đang tải…</p>
      )}
    </>
  );
}
