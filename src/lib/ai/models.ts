// Verified 2026-11-16 against https://aistudio.google.com/docs/pricing .
// Free availability still requires operator verification of the project's billing tier.
export const CHAT_MODELS = [
  { id: "gemini-3.5-flash-lite", label: "Gemini 3.5 Flash-Lite" },
  { id: "gemini-2.5-flash-lite", label: "Gemini 2.5 Flash-Lite (cũ)" },
] as const;
export const EMBEDDING_MODEL = "gemini-embedding-001";
export const EMBEDDING_DIMENSIONS = 768;
// Gemini rejects server deadlines below 10 seconds. Two 12s attempts plus
// bounded backoff still leave room inside the worker's 30s route budget.
export const PROVIDER_TIMEOUT_MS = 12_000;
