import "server-only";
import { PayOS, type Webhook } from "@payos/node";
import { createClient } from "@supabase/supabase-js";
import type { PaymentGateway } from "./service";

export function getPaymentGateway(): PaymentGateway | null {
  const clientId = process.env.PAYOS_CLIENT_ID;
  const apiKey = process.env.PAYOS_API_KEY;
  const checksumKey = process.env.PAYOS_CHECKSUM_KEY;
  if (!clientId || !apiKey || !checksumKey) return null;
  const client = new PayOS({ clientId, apiKey, checksumKey, timeout: 10_000, maxRetries: 0, logLevel: "off" });
  return {
    create: data => client.paymentRequests.create(data),
    get: code => client.paymentRequests.get(code),
    verify: body => client.webhooks.verify(body as Webhook),
  };
}

export function getBillingAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return url && key ? createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } }) : null;
}

export function getBillingOrigin(): string | null {
  try {
    const url = new URL(process.env.APP_BASE_URL ?? "");
    if (url.username || url.password || url.search || url.hash || url.pathname !== "/") return null;
    if (url.protocol !== "https:" && !(url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname))) return null;
    return url.origin;
  } catch { return null; }
}
