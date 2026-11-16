import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { CreatePaymentLinkRequest, CreatePaymentLinkResponse, PaymentLink, WebhookData } from "@payos/node";
import { getPremiumPlan, type PremiumPlanId } from "./plans";
import type { MembershipOrder } from "./types";

export type PaymentGateway = {
  create(data: CreatePaymentLinkRequest): Promise<CreatePaymentLinkResponse>;
  get(code: number): Promise<PaymentLink>;
  verify(body: unknown): Promise<WebhookData>;
};

export class BillingError extends Error {
  constructor(public status: number, public code: string, message: string) { super(message); }
}

export function assertOrder(order: MembershipOrder) {
  const plan = getPremiumPlan(order.plan_id);
  if (!plan || order.amount !== plan.amount || !Number.isSafeInteger(order.order_code) || order.order_code < 1) {
    throw new BillingError(502, "order_invalid", "Thông tin đơn thanh toán chưa hợp lệ.");
  }
}

export function safeCheckoutUrl(value: string) {
  try {
    const url = new URL(value);
    if (url.protocol === "https:" && url.hostname === "pay.payos.vn" && !url.username && !url.password) return url.href;
  } catch { /* Invalid provider URL. */ }
  throw new BillingError(502, "checkout_invalid", "Chưa thể mở trang thanh toán. Vui lòng thử lại.");
}

export async function reconcileOrder(admin: SupabaseClient, gateway: PaymentGateway, order: MembershipOrder, expectedLink?: string) {
  assertOrder(order);
  const payment = await gateway.get(order.order_code);
  if (payment.orderCode !== order.order_code || payment.amount !== order.amount || !payment.id
      || (order.payment_link_id && payment.id !== order.payment_link_id) || (expectedLink && payment.id !== expectedLink)) {
    throw new BillingError(409, "payment_mismatch", "Thông tin thanh toán chưa khớp với đơn.");
  }
  if (payment.status === "PAID") {
    if (!Number.isSafeInteger(payment.amountPaid) || payment.amountPaid < order.amount || !Number.isSafeInteger(payment.amountRemaining) || payment.amountRemaining > 0) {
      throw new BillingError(409, "payment_incomplete", "Thanh toán chưa đủ số tiền của gói.");
    }
    const { error } = await admin.rpc("settle_membership_payment", {
      p_order_code: order.order_code, p_payment_link_id: payment.id, p_amount: payment.amount,
    });
    if (error) throw new BillingError(503, "activation_unavailable", "Đã nhận thông tin thanh toán. Quyền Premium đang được cập nhật, vui lòng kiểm tra lại.");
  } else if (payment.status === "CANCELLED" || payment.status === "EXPIRED") {
    const { error } = await admin.rpc("set_membership_order_state", { p_order: order.id, p_status: payment.status.toLowerCase() });
    if (error) throw new BillingError(503, "order_unavailable", "Chưa thể cập nhật trạng thái đơn.");
  }
  return payment;
}

export async function createCheckout(userClient: SupabaseClient, admin: SupabaseClient, gateway: PaymentGateway, plan: PremiumPlanId, origin: string) {
  const { data, error } = await userClient.rpc("prepare_membership_checkout", { p_plan: plan });
  if (error || !data) throw new BillingError(error?.code === "PT429" ? 429 : 503, "order_unavailable", error?.code === "PT429" ? "Có nhiều yêu cầu thanh toán. Vui lòng thử lại sau." : "Chưa thể tạo đơn thanh toán. Vui lòng thử lại.");
  const order = data as MembershipOrder;
  assertOrder(order);
  if (order.plan_id !== plan) throw new BillingError(502, "order_invalid", "Thông tin gói thanh toán chưa khớp.");
  if (order.checkout_url) {
    const payment = await reconcileOrder(admin, gateway, order);
    if (payment.status !== "PENDING" && payment.status !== "UNDERPAID" && payment.status !== "PROCESSING") {
      return { id: order.id, checkoutUrl: null };
    }
    return { id: order.id, checkoutUrl: safeCheckoutUrl(order.checkout_url) };
  }
  let checkout: CreatePaymentLinkResponse;
  try {
    checkout = await gateway.create({
      orderCode: order.order_code, amount: order.amount, description: plan === "premium_monthly" ? "STTHANG" : "STNAM",
      items: [{ name: getPremiumPlan(plan)!.title, quantity: 1, price: order.amount }],
      returnUrl: `${origin}/membership?order=${order.id}&plan=${plan}&payment=return`,
      cancelUrl: `${origin}/membership?order=${order.id}&plan=${plan}&payment=cancel`,
      expiredAt: Math.floor(Date.parse(order.expires_at) / 1000),
    });
  } catch {
    // A timeout may occur after payOS created the order. Recover only this reserved code.
    const payment = await reconcileOrder(admin, gateway, order);
    if (payment.status === "PAID" || payment.status === "CANCELLED" || payment.status === "EXPIRED") return { id: order.id, checkoutUrl: null };
    const url = safeCheckoutUrl(`https://pay.payos.vn/web/${encodeURIComponent(payment.id)}`);
    const { error: bindError } = await admin.rpc("bind_membership_payment", { p_order: order.id, p_payment_link_id: payment.id, p_checkout_url: url });
    if (bindError) throw new BillingError(503, "order_unavailable", "Chưa thể lưu liên kết thanh toán. Vui lòng thử lại.");
    return { id: order.id, checkoutUrl: url };
  }
  if (checkout.orderCode !== order.order_code || checkout.amount !== order.amount || checkout.currency !== "VND" || !checkout.paymentLinkId) {
    throw new BillingError(502, "payment_mismatch", "Thông tin thanh toán chưa khớp với đơn.");
  }
  const url = safeCheckoutUrl(checkout.checkoutUrl);
  const { error: bindError } = await admin.rpc("bind_membership_payment", { p_order: order.id, p_payment_link_id: checkout.paymentLinkId, p_checkout_url: url });
  if (bindError) throw new BillingError(503, "order_unavailable", "Chưa thể lưu liên kết thanh toán. Vui lòng thử lại.");
  return { id: order.id, checkoutUrl: url };
}

export async function processWebhook(admin: SupabaseClient, gateway: PaymentGateway, body: unknown) {
  let verified: WebhookData;
  try { verified = await gateway.verify(body); }
  catch { throw new BillingError(400, "signature_invalid", "Webhook không hợp lệ."); }
  if (verified.code !== "00") return;
  if (verified.currency !== "VND" || !Number.isSafeInteger(verified.orderCode) || !verified.paymentLinkId) throw new BillingError(400, "webhook_invalid", "Webhook không hợp lệ.");
  const { data, error } = await admin.from("membership_orders").select("*").eq("order_code", verified.orderCode).maybeSingle();
  if (error) throw new BillingError(503, "storage_unavailable", "Chưa thể xử lý thông báo thanh toán.");
  // payOS sends a signed sample while validating a webhook; never create orders from webhooks.
  if (!data) return;
  if (data.status === "paid") return;
  await reconcileOrder(admin, gateway, data as MembershipOrder, verified.paymentLinkId);
}
