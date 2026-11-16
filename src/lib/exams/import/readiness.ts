import "server-only";
import { keyring } from "@/lib/ai/crypto";
export function importReadiness(preflight: { schedulerConfigured?: boolean; lastRunAt?: string; credentialReady?: boolean; modelReady?: boolean }) {
  let encryptionReady = false;
  try { keyring(); encryptionReady = true; } catch {}
  const workerReady = (process.env.EXAM_IMPORT_WORKER_SECRET || process.env.RAG_WORKER_SECRET || "").length >= 32;
  const heartbeatFresh = Boolean(preflight.lastRunAt && Date.now() - Date.parse(preflight.lastRunAt) < 180000);
  return { ...preflight, encryptionReady, workerReady, heartbeatFresh, ready: Boolean(preflight.schedulerConfigured && preflight.credentialReady && preflight.modelReady && encryptionReady && workerReady && heartbeatFresh) };
}
