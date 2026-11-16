export type DraftRecord<T = unknown> = {
  key: string; schemaVersion: 1; owner: string; entity: "quiz" | "exam"; entityId: string;
  target: string | null; baseline: string; payload: T; revision: number; writerId: string; savedAt: string;
};
const DB = "smartteach-local-drafts";
const STORE = "drafts";
export const DRAFT_CHANNEL = "smartteach-draft-changes";
function announce(value: unknown) {
  if (typeof BroadcastChannel === "undefined") return;
  try { const channel = new BroadcastChannel(DRAFT_CHANNEL); channel.postMessage(value); channel.close(); } catch { /* Focus rereads are the fallback; this is not a lock. */ }
}
const paused = new Set<string>();
export const draftKey = (owner: string, entity: DraftRecord["entity"], id: string) => `v1:${owner}:${entity}:${id}`;
export const pauseDrafts = (owner: string) => paused.add(owner);
export const resumeDrafts = (owner: string) => paused.delete(owner);
export class DraftConflict extends Error { constructor() { super("Bản nháp đã đổi ở tab khác. Hãy tải lại và chọn bản muốn giữ."); } }
const size = (value: unknown) => new TextEncoder().encode(JSON.stringify(value)).length;

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") { reject(new Error("Trình duyệt không cho phép lưu nháp.")); return; }
    const request = indexedDB.open(DB, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE, { keyPath: "key" });
    request.onerror = () => reject(new Error("Không mở được kho nháp trên trình duyệt."));
    request.onblocked = () => reject(new Error("Một tab khác đang khóa kho nháp. Thầy cô đóng tab cũ rồi thử lại."));
    request.onsuccess = () => { const db = request.result; db.onversionchange = () => db.close(); resolve(db); };
  });
}
function transact<T>(db: IDBDatabase, mode: IDBTransactionMode, operation: (store: IDBObjectStore, finish: (value: T) => void, fail: (error: Error) => void) => void): Promise<T> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    let result: T;
    let issue: Error | null = null;
    tx.oncomplete = () => { db.close(); resolve(result); };
    tx.onabort = tx.onerror = () => { db.close(); reject(issue ?? new Error("Không lưu được nháp. Trình duyệt có thể đã hết dung lượng.")); };
    try { operation(tx.objectStore(STORE), value => { result = value; }, error => { issue = error; tx.abort(); }); }
    catch (error) { issue = error instanceof Error ? error : new Error("Kho nháp chưa sẵn sàng."); tx.abort(); }
  });
}
export async function readDraft<T>(key: string): Promise<DraftRecord<T> | null> {
  return transact(await open(), "readonly", (store, finish, fail) => {
    const request = store.get(key);
    request.onsuccess = () => {
      const row = request.result as DraftRecord<T> | undefined;
      if (row && (row.schemaVersion !== 1 || row.key !== key || !Number.isSafeInteger(row.revision))) { fail(new Error("Bản nháp có định dạng chưa hỗ trợ.")); return; }
      finish(row ?? null);
    };
  });
}
export async function writeDraft<T>(input: Omit<DraftRecord<T>, "revision" | "savedAt" | "schemaVersion">, expected: number | null): Promise<DraftRecord<T>> {
  const db = await open();
  const result = await transact<DraftRecord<T>>(db, "readwrite", (store, finish, fail) => {
    const request = store.getAll();
    request.onsuccess = () => {
      if (paused.has(input.owner)) { fail(new Error("Phiên đã kết thúc; nháp được giữ tới khi đăng nhập lại.")); return; }
      const rows = request.result as DraftRecord[];
      const old = rows.find(row => row.key === input.key);
      if ((old?.revision ?? null) !== expected) { fail(new DraftConflict()); return; }
      // A monotonic store-wide revision survives deletion, preventing ABA between tabs.
      const nextRevision = rows.reduce((n, r) => Math.max(n, r.revision ?? 0), 0) + 1;
      const row: DraftRecord<T> = { ...input, schemaVersion: 1, revision: nextRevision, savedAt: new Date().toISOString() };
      if (input.key !== draftKey(input.owner, input.entity, input.entityId) || size(row) > (input.entity === "quiz" ? 128 : 256) * 1024 || rows.filter(r => r.key !== input.key).reduce((n, r) => n + size(r), size(row)) > 2 * 1024 * 1024) {
        fail(new Error("Kho nháp đã chạm giới hạn. Nội dung vẫn đang ở form; thầy cô lưu vào tài khoản nhé.")); return;
      }
      store.put({ key: "__revision", revision: nextRevision });
      store.put(row); finish(row);
    };
  });
  announce({ key: result.key, revision: result.revision, writerId: result.writerId });
  return result;
}
export async function removeDraft(key: string, revision?: number): Promise<void> {
  await transact<void>(await open(), "readwrite", (store, finish, fail) => {
    const request = store.get(key);
    request.onsuccess = () => {
      if (request.result && revision !== undefined && request.result.revision !== revision) { fail(new DraftConflict()); return; }
      store.delete(key); finish(undefined);
    };
  });
  announce({ key, revision: null });
}
export async function ownerDrafts(owner: string, clear = false): Promise<number> {
  const count = await transact<number>(await open(), clear ? "readwrite" : "readonly", (store, finish) => {
    const request = store.getAll();
    request.onsuccess = () => {
      const rows = (request.result as DraftRecord[]).filter(row => row.owner === owner);
      if (clear) for (const row of rows) store.delete(row.key);
      finish(rows.length);
    };
  });
  if (clear) announce({ owner, cleared: true });
  return count;
}
