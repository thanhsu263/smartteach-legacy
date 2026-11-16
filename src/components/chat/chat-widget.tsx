"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/button";
import { adminRequest } from "@/lib/admin/client";
import { chatAllowed, contextPage } from "@/lib/chat/visibility";
import type { ChatMessage } from "@/lib/chat/service";
import s from "./chat.module.css";
type Config = {
  enabled: boolean;
  available: boolean;
  retentionDays: number;
  message: string;
};
type Thread = { id: string; title: string };
function locator(c: ChatMessage["citations"][number]) {
  return c.locator.page
    ? " · trang " + c.locator.page
    : c.locator.paragraph
      ? " · đoạn " + c.locator.paragraph
      : c.locator.question
        ? " · câu " + c.locator.question
        : "";
}
export function ChatWidget() {
  const { status, user } = useAuth(),
    pathname = usePathname();
  if (status !== "signed-in" || !user || !chatAllowed(pathname)) return null;
  return <ChatSession key={user.id} pathname={pathname} />;
}
function ChatSession({ pathname }: { pathname: string }) {
  const [config, setConfig] = useState<Config | null>(null),
    [open, setOpen] = useState(false),
    [mobile, setMobile] = useState(false),
    [blocked, setBlocked] = useState(false),
    [threads, setThreads] = useState<Thread[]>([]),
    [thread, setThread] = useState(""),
    [messages, setMessages] = useState<ChatMessage[]>([]),
    [draft, setDraft] = useState(""),
    [busy, setBusy] = useState(false),
    [state, setState] = useState(""),
    [error, setError] = useState("");
  const [offset, setOffset] = useState(0);
  const [hasOlder, setHasOlder] = useState(false),
    [olderBusy, setOlderBusy] = useState(false);
  const launcher = useRef<HTMLButtonElement>(null),
    dialog = useRef<HTMLDialogElement>(null),
    panel = useRef<HTMLElement>(null),
    composer = useRef<HTMLTextAreaElement>(null),
    abort = useRef<AbortController | null>(null),
    scroll = useRef<HTMLDivElement>(null),
    inFlight = useRef(false);
  const heading = useId(),
    inputId = useId();
  const priorScroll = useRef<{ height: number; top: number } | null>(null),
    loadedOlder = useRef(false);
  useEffect(() => {
    if (!open) return;
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
        launcher.current?.focus();
      }
    };
    document.addEventListener("keydown", escape);
    return () => document.removeEventListener("keydown", escape);
  }, [open]);
  useEffect(() => {
    let live = true;
    const load = () => {
      adminRequest<Config>("/api/chat/config")
        .then((d) => {
          if (live) setConfig(d);
        })
        .catch(() => {
          if (live) {
            setConfig(null);
            setMessages([]);
            setOpen(false);
            abort.current?.abort();
          }
        });
    };
    load();
    const timer = setInterval(load, 60000);
    return () => {
      live = false;
      clearInterval(timer);
      abort.current?.abort();
    };
  }, []);
  useEffect(() => {
    const query = matchMedia("(width < 720px)");
    const change = () => setMobile(query.matches);
    change();
    query.addEventListener("change", change);
    const sync = () => {
      const hidden = Boolean(
        document.fullscreenElement ||
          document.querySelector("dialog[open]:not([data-chat-sheet])"),
      );
      setBlocked(hidden);
      if (hidden) setOpen(false);
    };
    const observer = new MutationObserver(sync);
    observer.observe(document.body, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ["open"],
    });
    document.addEventListener("fullscreenchange", sync);
    sync();
    return () => {
      query.removeEventListener("change", change);
      observer.disconnect();
      document.removeEventListener("fullscreenchange", sync);
    };
  }, []);
  useEffect(() => {
    if (!open) return;
    let live = true;
    adminRequest<{ items: Thread[] }>("/api/chat/threads?offset=" + offset)
      .then((d) => {
        if (live) setThreads(d.items);
      })
      .catch((e) => {
        if (live) setError(e.message);
      });
    return () => {
      live = false;
    };
  }, [open, thread, messages.length, offset]);
  useEffect(() => {
    const el = dialog.current;
    if (mobile && open && !blocked) {
      if (el && !el.open) el.showModal();
    } else if (el?.open) el.close();
    if (open) {
      const frame = requestAnimationFrame(() => composer.current?.focus());
      return () => cancelAnimationFrame(frame);
    }
  }, [open, mobile, blocked]);
  useEffect(() => {
    if (priorScroll.current && scroll.current) {
      scroll.current.scrollTop =
        scroll.current.scrollHeight -
        priorScroll.current.height +
        priorScroll.current.top;
      priorScroll.current = null;
      return;
    }
    scroll.current?.scrollTo({
      top: scroll.current.scrollHeight,
      behavior: "instant",
    });
  }, [messages, state]);
  useEffect(() => {
    const timer = setInterval(() => {
      if (!thread || busy || !open) return;
      // Detect deletion in another tab, account lock and expiry while the panel stays open.
      adminRequest<{ items: ChatMessage[] }>("/api/chat/threads/" + thread)
        .then((d) => {
          if (loadedOlder.current)
            setMessages((current) => {
              const visible = current.filter(
                (m) => Date.parse(m.expiresAt) > Date.now(),
              );
              return visible.length === current.length ? current : visible;
            });
          else setMessages(d.items);
        })
        .catch(() => {
          setMessages([]);
          setThread("");
          setError("Hội thoại không còn truy cập được.");
        });
    }, 30000);
    return () => clearInterval(timer);
  }, [thread, busy, open]);
  function close() {
    setOpen(false);
    launcher.current?.focus();
  }
  async function select(id: string) {
    if (busy) return;
    loadedOlder.current = false;
    setError("");
    if (!id) {
      setThread("");
      setMessages([]);
      setHasOlder(false);
      return;
    }
    try {
      const result = await adminRequest<{ items: ChatMessage[] }>(
        "/api/chat/threads/" + id,
      );
      setThread(id);
      setMessages(result.items);
      setHasOlder(result.items.length === 50);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function older() {
    if (!thread || busy || olderBusy) return;
    setOlderBusy(true);
    try {
      const result = await adminRequest<{ items: ChatMessage[] }>(
        "/api/chat/threads/" + thread + "?offset=" + messages.length,
      );
      loadedOlder.current = true;
      if (scroll.current)
        priorScroll.current = {
          height: scroll.current.scrollHeight,
          top: scroll.current.scrollTop,
        };
      setMessages((current) => [
        ...new Map(
          [...result.items, ...current].map((m) => [m.id, m]),
        ).values(),
      ]);
      setHasOlder(result.items.length === 50);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setOlderBusy(false);
    }
  }
  async function remove() {
    if (!thread || !confirm("Xóa ngay toàn bộ hội thoại này?")) return;
    try {
      abort.current?.abort();
      await adminRequest("/api/chat/threads/" + thread, {}, "DELETE");
      setThread("");
      setMessages([]);
      setThreads((t) => t.filter((x) => x.id !== thread));
      setHasOlder(false);
      loadedOlder.current = false;
      setDraft("");
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (inFlight.current || !draft.trim() || !config?.available) return;
    inFlight.current = true;
    setBusy(true);
    setError("");
    setState("Đang tìm nguồn…");
    const text = draft.trim(),
      controller = new AbortController();
    abort.current = controller;
    let id = thread;
    try {
      if (!id) {
        id = (await adminRequest<{ id: string }>("/api/chat/threads", {})).id;
        setThread(id);
      }
      const requestId = crypto.randomUUID();
      const response = await fetch("/api/chat/threads/" + id + "/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId,
          text,
          contextPage: contextPage(pathname),
        }),
        signal: controller.signal,
        cache: "no-store",
      });
      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error?.message ?? "Chưa thể gửi câu hỏi.");
      }
      if (!response.body) throw new Error("Không nhận được luồng trả lời.");
      setDraft("");
      const reader = response.body.getReader(),
        decoder = new TextDecoder();
      let buffer = "",
        done = false;
      while (true) {
        const next = await reader.read();
        if (next.done) break;
        buffer += decoder.decode(next.value, { stream: true });
        let boundary: number;
        while ((boundary = buffer.indexOf("\n\n")) >= 0) {
          const frame = buffer.slice(0, boundary);
          buffer = buffer.slice(boundary + 2);
          const event = frame
              .split("\n")
              .find((x) => x.startsWith("event: "))
              ?.slice(7),
            dataLine = frame
              .split("\n")
              .find((x) => x.startsWith("data: "))
              ?.slice(6);
          if (!dataLine) continue;
          const data = JSON.parse(dataLine);
          if (event === "state")
            setState(
              data.state === "generating"
                ? "Đang soạn câu trả lời…"
                : "Đang tìm nguồn…",
            );
          if (event === "error")
            throw new Error(data.message ?? "Chưa thể trả lời.");
          if (event === "done") done = true;
        }
      }
      if (!done)
        throw new Error(
          "Kết nối bị ngắt. Tải lại hội thoại để xem trạng thái.",
        );
    } catch (e) {
      if (!controller.signal.aborted) setError((e as Error).message);
    } finally {
      if (id && !controller.signal.aborted) {
        try {
          const result = await adminRequest<{ items: ChatMessage[] }>(
            "/api/chat/threads/" + id,
          );
          loadedOlder.current = false;
          setMessages(result.items);
          setHasOlder(result.items.length === 50);
        } catch {}
      }
      setBusy(false);
      inFlight.current = false;
      setState("");
      abort.current = null;
    }
  }
  if (!config?.enabled || blocked) return null;
  const body = (
    <>
      <header className={s.head}>
        <h2 id={heading}>Hỏi SmartTeach</h2>
        <button type="button" aria-label="Thu nhỏ trợ lý" onClick={close}>
          ×
        </button>
      </header>
      <div className={s.tools}>
        <label className="visually-hidden" htmlFor={heading + "-history"}>
          Lịch sử hội thoại
        </label>
        <select
          id={heading + "-history"}
          value={thread}
          disabled={busy}
          onChange={(e) => void select(e.target.value)}
        >
          <option value="">Cuộc trò chuyện mới</option>
          {thread && !threads.some((t) => t.id === thread) && (
            <option value={thread}>Hội thoại hiện tại</option>
          )}
          {threads.map((t) => (
            <option value={t.id} key={t.id}>
              {t.title}
            </option>
          ))}
        </select>
        <button
          type="button"
          disabled={busy || offset === 0}
          onClick={() => setOffset((x) => x - 20)}
          aria-label="Trang hội thoại trước"
        >
          ‹
        </button>
        <button
          type="button"
          disabled={busy || threads.length < 20}
          onClick={() => setOffset((x) => x + 20)}
          aria-label="Trang hội thoại sau"
        >
          ›
        </button>
        <button
          type="button"
          disabled={!thread || busy}
          onClick={() => void select("")}
        >
          Mới
        </button>
        <button type="button" disabled={!thread} onClick={() => void remove()}>
          Xóa
        </button>
      </div>
      <div ref={scroll} className={s.messages}>
        <p className={s.notice}>
          Trợ lý dùng nguồn đã duyệt; có thể trả lời sai. Nội dung hỏi và đoạn
          nguồn được gửi tới Google AI theo điều khoản Free Tier. Lịch sử tự xóa
          sau 30 ngày; thầy cô có thể xóa ngay.{" "}
          <Link href="/privacy">Quyền riêng tư</Link>
        </p>
        {!config.available && <p role="status">{config.message}</p>}
        {!messages.length && (
          <div className={s.suggestions}>
            {[
              "Hướng dẫn tạo quiz trên SmartTeach",
              "Tìm học liệu Toán lớp 6",
            ].map((text) => (
              <button
                key={text}
                disabled={!config.available}
                onClick={() => {
                  setDraft(text);
                  composer.current?.focus();
                }}
              >
                {text}
              </button>
            ))}
          </div>
        )}
        {hasOlder && (
          <Button disabled={busy || olderBusy} onClick={() => void older()}>
            {olderBusy ? "Đang tải…" : "Tin nhắn cũ hơn"}
          </Button>
        )}
        {messages.map((m) => (
          <article key={m.id} className={s.message} data-role={m.role}>
            <b>{m.role === "user" ? "Thầy cô" : "SmartTeach"}</b>
            <p>{m.body}</p>
            {m.role === "assistant" && !m.sourcesAvailable && (
              <p className={s.notice}>Một số nguồn không còn được công bố.</p>
            )}
            {m.citations.length > 0 && (
              <ul className={s.citations}>
                {m.citations.map((c) => (
                  <li key={c.id}>
                    <Link
                      href={"/help/sources/" + c.id}
                      target="_blank"
                      rel="noopener"
                    >
                      {c.title ?? "Nguồn tham khảo"}
                      {locator(c)}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </article>
        ))}
      </div>
      <p role="status" aria-live="polite" className={s.status}>
        {state}
      </p>
      {error && (
        <div className={s.status}>
          <p role="alert" className={s.error}>
            {error}
          </p>
          {thread && (
            <button type="button" onClick={() => void select(thread)}>
              Tải lại hội thoại
            </button>
          )}
        </div>
      )}
      <form className={s.composer} onSubmit={send}>
        <label htmlFor={inputId}>Câu hỏi của thầy cô</label>
        <textarea
          ref={composer}
          id={inputId}
          value={draft}
          maxLength={1400}
          disabled={busy || !config.available}
          placeholder="Hỏi về SmartTeach hoặc tìm học liệu…"
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (
              e.key === "Enter" &&
              !e.shiftKey &&
              !e.nativeEvent.isComposing
            ) {
              e.preventDefault();
              e.currentTarget.form?.requestSubmit();
            }
          }}
        />
        <div>
          <span className={s.notice}>{draft.length}/1.400</span>
          {busy ? (
            <Button onClick={() => abort.current?.abort()}>Dừng</Button>
          ) : (
            <Button
              type="submit"
              variant="primary"
              disabled={!config.available || !draft.trim()}
            >
              Gửi câu hỏi
            </Button>
          )}
        </div>
      </form>
    </>
  );
  return (
    <>
      <button
        ref={launcher}
        type="button"
        className={
          s.launcher +
          (pathname === "/" /** keep clear of hero quiz CTA */
            ? " " + s.homeLauncher
            : "")
        }
        aria-expanded={open}
        aria-controls={heading + "-panel"}
        onClick={() => setOpen((x) => !x)}
      >
        Hỏi SmartTeach
      </button>
      {mobile ? (
        <dialog
          ref={dialog}
          data-chat-sheet
          id={heading + "-panel"}
          className={s.sheet}
          aria-labelledby={heading}
          onCancel={(e) => {
            e.preventDefault();
            close();
          }}
          onClose={() => setOpen(false)}
        >
          {body}
        </dialog>
      ) : (
        open && (
          <section
            ref={panel}
            id={heading + "-panel"}
            className={s.panel}
            role="dialog"
            aria-modal="false"
            aria-labelledby={heading}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                e.stopPropagation();
                close();
              }
            }}
          >
            {body}
          </section>
        )
      )}
    </>
  );
}
