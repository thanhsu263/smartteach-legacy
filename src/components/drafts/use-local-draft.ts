"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { draftKey, readDraft, writeDraft, removeDraft, DRAFT_CHANNEL } from "@/lib/drafts/storage";
import type { DraftRecord } from "@/lib/drafts/storage";

export function useLocalDraft<T>({ entity, entityId, target, baseline, payload, dirty, initialRevision }: {
  entity: DraftRecord["entity"]; entityId: string; target: string | null; baseline: string;
  payload: T; dirty: boolean; initialRevision: number | null;
}) {
  const { user, status } = useAuth();
  const [message, setMessage] = useState<string | null>(null);
  const revision = useRef(initialRevision);
  const writer = useRef<string | null>(null);
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  const stopped = useRef(false);
  const latest = useRef({ payload, dirty, owner: user?.id, status, target, baseline });
  useEffect(() => { latest.current = { payload, dirty, owner: user?.id, status, target, baseline }; }, [payload, dirty, user?.id, status, target, baseline]);
  const persist = useCallback(() => {
    queue.current = queue.current.catch(() => {}).then(async () => {
      const state = latest.current;
      if (stopped.current || !state.dirty || !state.owner || state.status !== "signed-in") return;
      writer.current ??= crypto.randomUUID();
      try {
        const row = await writeDraft({ key: draftKey(state.owner, entity, entityId), owner: state.owner, entity, entityId, target: state.target, baseline: state.baseline, payload: state.payload, writerId: writer.current }, revision.current);
        revision.current = row.revision;
        setMessage("Đã lưu nháp trên trình duyệt này.");
      } catch (error) { stopped.current = true; setMessage(error instanceof Error ? error.message : "Không lưu được nháp."); }
    });
    return queue.current;
  }, [entity, entityId]);
  useEffect(() => { if (!dirty) return; const id = setTimeout(() => void persist(), 400); return () => clearTimeout(id); }, [payload, dirty, persist]);
  useEffect(() => {
    const flush = () => { void persist(); };
    const unload = (event: BeforeUnloadEvent) => { if (latest.current.dirty) { event.preventDefault(); } };
    window.addEventListener("pagehide", flush); window.addEventListener("blur", flush);
    document.addEventListener("visibilitychange", flush); window.addEventListener("beforeunload", unload);
    return () => { window.removeEventListener("pagehide", flush); window.removeEventListener("blur", flush); document.removeEventListener("visibilitychange", flush); window.removeEventListener("beforeunload", unload); };
  }, [persist]);
  useEffect(() => {
    if (!user?.id || status !== "signed-in") return;
    const key = draftKey(user.id, entity, entityId);
    const changed = () => { stopped.current = true; setMessage("Nháp đã thay đổi hoặc bị dọn ở tab khác. Tải lại để đối chiếu; nội dung đang gõ vẫn được giữ trong form."); };
    const focus = () => { void readDraft(key).then(row => { if ((row?.revision ?? null) !== revision.current && row?.writerId !== writer.current) changed(); }).catch(() => {}); };
    let channel: BroadcastChannel | null = null;
    try {
      if (typeof BroadcastChannel !== "undefined") { channel = new BroadcastChannel(DRAFT_CHANNEL); channel.onmessage = event => {
        if ((event.data?.key === key && event.data.writerId !== writer.current && event.data.revision !== revision.current) || (event.data?.owner === user.id && event.data.cleared)) changed();
      }; }
    } catch {}
    window.addEventListener("focus", focus);
    return () => { window.removeEventListener("focus", focus); channel?.close(); };
  }, [user?.id, status, entity, entityId]);
  const clearSaved = useCallback(async (savedPayload: T) => {
    // Serialize with writes, and retain edits entered while save was in flight.
    await persist();
    await queue.current;
    if (JSON.stringify(latest.current.payload) !== JSON.stringify(savedPayload) || !latest.current.owner) return;
    const key = draftKey(latest.current.owner, entity, entityId);
    try {
      const row = await readDraft(key);
      if (row && revision.current !== null) await removeDraft(key, revision.current);
      revision.current = null; setMessage("Đã lưu vào tài khoản.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Không dọn được nháp cũ."); }
  }, [entity, entityId, persist]);
  const discard = useCallback(async () => {
    await persist();
    if (!latest.current.owner) return false;
    try {
      const key = draftKey(latest.current.owner, entity, entityId);
      if (revision.current !== null) await removeDraft(key, revision.current);
      stopped.current = true;
      return true;
    } catch (error) { setMessage(error instanceof Error ? error.message : "Không bỏ được nháp."); return false; }
  }, [entity, entityId, persist]);
  return { message, clearSaved, discard };
}
