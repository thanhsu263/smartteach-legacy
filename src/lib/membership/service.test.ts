import { createHmac } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { PayOS, type CreatePaymentLinkResponse, type PaymentLink, type WebhookData } from "@payos/node";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createCheckout, processWebhook, reconcileOrder, safeCheckoutUrl } from "./service";
import type { MembershipOrder } from "./types";

vi.mock("server-only", () => ({}));

const order: MembershipOrder = { id: "00000000-0000-4000-8000-000000000001", user_id: "owner", order_code: 12345, plan_id: "premium_monthly", amount: 50000, status: "pending", payment_link_id: "link-id", checkout_url: null, expires_at: "2030-01-01T00:30:00Z", created_at: "2030-01-01T00:00:00Z", paid_at: null };
const quote: CreatePaymentLinkResponse = { orderCode: 12345, amount: 50000, currency: "VND", paymentLinkId: "link-id", checkoutUrl: "https://pay.payos.vn/web/link-id", status: "PENDING", bin: "", accountNumber: "", accountName: "", description: "STTHANG", qrCode: "" };
const payment: PaymentLink = { id: "link-id", orderCode: 12345, amount: 50000, amountPaid: 50000, amountRemaining: 0, status: "PAID", createdAt: "2030-01-01T00:00:00Z", transactions: [], cancellationReason: null, canceledAt: null };
const webhook: WebhookData = { orderCode: 12345, amount: 50000, description: "STTHANG", accountNumber: "123456", reference: "transaction", transactionDateTime: "2030-01-01 00:00:00", currency: "VND", paymentLinkId: "link-id", code: "00", desc: "success" };

function fixtures(record = order) {
  const rpc = vi.fn(async () => ({ data: "2030-02-01T00:00:00Z", error: null }));
  const maybeSingle = vi.fn(async () => ({ data: record as MembershipOrder | null, error: null }));
  const eq = vi.fn(() => ({ maybeSingle }));
  const from = vi.fn(() => ({ select: vi.fn(() => ({ eq })) }));
  const admin = { rpc, from } as unknown as SupabaseClient;
  const userRpc = vi.fn(async () => ({ data: record, error: null }));
  const user = { rpc: userRpc } as unknown as SupabaseClient;
  const gateway = {
    create: vi.fn(async () => quote), get: vi.fn(async () => payment), verify: vi.fn(async () => webhook),
  };
  return { admin, user, gateway, rpc, userRpc, from, eq, maybeSingle };
}

describe("payOS confirmation boundary", () => {
  it("checkout lấy giá từ đơn đã reserve, không có giá client hoặc URL client", async () => {
    const f = fixtures();
    const result = await createCheckout(f.user, f.admin, f.gateway, "premium_monthly", "https://smartteach.test");
    expect(result.checkoutUrl).toBe(quote.checkoutUrl);
    expect(f.userRpc).toHaveBeenCalledWith("prepare_membership_checkout", { p_plan: "premium_monthly" });
    expect(f.gateway.create).toHaveBeenCalledWith(expect.objectContaining({ amount: 50000, orderCode: 12345, returnUrl: expect.stringMatching(/^https:\/\/smartteach\.test\/membership\?order=/) }));
    expect(f.rpc).toHaveBeenCalledWith("bind_membership_payment", expect.any(Object));
  });
  it.each(["https://evil.test/pay", "javascript:alert(1)", "https://pay.payos.vn.evil.test/"])("từ chối checkout URL ngoài payOS: %s", url => {
    expect(() => safeCheckoutUrl(url)).toThrow();
  });
  it("không bind hoặc cấp quyền khi provider trả sai giá", async () => {
    const f = fixtures(); f.gateway.create.mockResolvedValue({ ...quote, amount: 1 });
    await expect(createCheckout(f.user, f.admin, f.gateway, "premium_monthly", "https://smartteach.test")).rejects.toMatchObject({ status: 502 });
    expect(f.rpc).not.toHaveBeenCalled();
  });
  it("chỉ PAID với đủ số tiền mới được settle; hỗ trợ thanh toán cộng dồn/overpay", async () => {
    const f = fixtures();
    f.gateway.get.mockResolvedValue({ ...payment, status: "UNDERPAID", amountPaid: 20000, amountRemaining: 30000 });
    await reconcileOrder(f.admin, f.gateway, order); expect(f.rpc).not.toHaveBeenCalled();
    f.gateway.get.mockResolvedValue({ ...payment, amountPaid: 20000, amountRemaining: 30000 });
    await expect(reconcileOrder(f.admin, f.gateway, order)).rejects.toMatchObject({ status: 409 });
    f.gateway.get.mockResolvedValue({ ...payment, amountPaid: 60000, amountRemaining: -10000 });
    await reconcileOrder(f.admin, f.gateway, order);
    expect(f.rpc).toHaveBeenCalledWith("settle_membership_payment", { p_order_code: 12345, p_payment_link_id: "link-id", p_amount: 50000 });
  });
  it.each([{ id: "foreign-link" }, { orderCode: 777 }, { amount: 500000 }])("khớp order/link/amount trước khi settle: %s", mismatch => {
    const f = fixtures(); f.gateway.get.mockResolvedValue({ ...payment, ...mismatch });
    return expect(reconcileOrder(f.admin, f.gateway, order)).rejects.toMatchObject({ status: 409 });
  });
  it("timeout tạo link phục hồi bằng đúng order code, không tạo đơn khác", async () => {
    const f = fixtures({ ...order, payment_link_id: null });
    f.gateway.create.mockRejectedValue(new Error("timeout"));
    f.gateway.get.mockResolvedValue({ ...payment, status: "PENDING", amountPaid: 0, amountRemaining: 50000 });
    const result = await createCheckout(f.user, f.admin, f.gateway, "premium_monthly", "https://smartteach.test");
    expect(result).toEqual({ id: order.id, checkoutUrl: quote.checkoutUrl });
    expect(f.gateway.get).toHaveBeenCalledWith(12345);
    expect(f.userRpc).toHaveBeenCalledTimes(1);
  });
  it("không tin success/callback; chỉ dùng dữ liệu webhook đã verify và đối soát", async () => {
    const f = fixtures();
    await processWebhook(f.admin, f.gateway, { success: false, data: { orderCode: 999, amount: 1 } });
    expect(f.eq).toHaveBeenCalledWith("order_code", 12345);
    expect(f.gateway.get).toHaveBeenCalledWith(12345);
    expect(f.rpc).toHaveBeenCalledWith("settle_membership_payment", expect.objectContaining({ p_amount: 50000 }));
  });
  it("chữ ký sai không đọc DB; webhook sample không tạo đơn; replay đã paid không gọi provider", async () => {
    const f = fixtures();
    f.gateway.verify.mockRejectedValueOnce(new Error("signature invalid"));
    await expect(processWebhook(f.admin, f.gateway, {})).rejects.toMatchObject({ status: 400 });
    expect(f.from).not.toHaveBeenCalled();
    f.maybeSingle.mockResolvedValueOnce({ data: null, error: null });
    await processWebhook(f.admin, f.gateway, {}); expect(f.gateway.get).not.toHaveBeenCalled();
    const done = fixtures({ ...order, status: "paid" });
    await processWebhook(done.admin, done.gateway, {}); expect(done.gateway.get).not.toHaveBeenCalled();
  });
  it("hủy provider chỉ cập nhật trạng thái đơn, không cấp Premium", async () => {
    const f = fixtures(); f.gateway.get.mockResolvedValue({ ...payment, status: "CANCELLED", amountPaid: 0, amountRemaining: 50000 });
    await reconcileOrder(f.admin, f.gateway, order);
    expect(f.rpc).toHaveBeenCalledWith("set_membership_order_state", { p_order: order.id, p_status: "cancelled" });
  });
});

describe("official payOS SDK signature verification", () => {
  const checksum = "unit-test-checksum-key";
  const client = new PayOS({ clientId: "unit-test", apiKey: "unit-test", checksumKey: checksum, logLevel: "off" });
  const text = Object.keys(webhook).sort().map(key => `${key}=${webhook[key as keyof WebhookData]}`).join("&");
  const signature = createHmac("sha256", checksum).update(text).digest("hex");
  it("xác minh HMAC hợp lệ và từ chối thay đổi số tiền", async () => {
    const body = { code: "00", desc: "success", success: true, data: webhook, signature };
    await expect(client.webhooks.verify(body)).resolves.toEqual(webhook);
    await expect(client.webhooks.verify({ ...body, data: { ...webhook, amount: 1 } })).rejects.toThrow();
  });
  it("envelope success không thay thế code đã được ký trong data", async () => {
    await expect(client.webhooks.verify({ code: "13", desc: "unsigned", success: false, data: webhook, signature })).resolves.toEqual(webhook);
  });
});
