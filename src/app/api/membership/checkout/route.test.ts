import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";
import { billingUser } from "@/lib/membership/http";
import { createCheckout, BillingError } from "@/lib/membership/service";
import { getBillingAdmin, getPaymentGateway } from "@/lib/membership/payos";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { PaymentGateway } from "@/lib/membership/service";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/membership/http", async importOriginal => ({ ...await importOriginal<typeof import("@/lib/membership/http")>(), billingUser: vi.fn() }));
vi.mock("@/lib/membership/payos", () => ({ getBillingOrigin: () => "https://app.test", getBillingAdmin: vi.fn(), getPaymentGateway: vi.fn() }));
vi.mock("@/lib/membership/service", async importOriginal => ({ ...await importOriginal<typeof import("@/lib/membership/service")>(), createCheckout: vi.fn() }));

const user = {} as SupabaseClient, admin = {} as SupabaseClient, gateway = {} as PaymentGateway;
const request = (body: unknown, origin = "https://app.test") => new Request("https://app.test/api/membership/checkout", { method: "POST", headers: { Origin: origin, "Content-Type": "application/json" }, body: JSON.stringify(body) });
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(billingUser).mockResolvedValue(user);
  vi.mocked(getBillingAdmin).mockReturnValue(admin);
  vi.mocked(getPaymentGateway).mockReturnValue(gateway);
  vi.mocked(createCheckout).mockResolvedValue({ id: "order", checkoutUrl: "https://pay.payos.vn/web/link" });
});

describe("checkout route", () => {
  it("client không quyết định giá hay chủ đơn", async () => {
    const response = await POST(request({ plan: "premium_yearly", amount: 1, userId: "other" }));
    expect(response.status).toBe(200);
    expect(createCheckout).toHaveBeenCalledWith(user, admin, gateway, "premium_yearly", "https://app.test");
  });
  it("chặn chưa đăng nhập, CSRF và gói không hợp lệ trước khi gọi payOS", async () => {
    vi.mocked(billingUser).mockRejectedValueOnce(new BillingError(401, "auth", "Đăng nhập"));
    expect((await POST(request({ plan: "premium_monthly" }))).status).toBe(401);
    expect((await POST(request({ plan: "premium_monthly" }, "https://evil.test"))).status).toBe(403);
    expect((await POST(request({ plan: "free" }))).status).toBe(400);
    expect(createCheckout).not.toHaveBeenCalled();
  });
  it("thiếu cấu hình không tạo đơn/giả lập thành công", async () => {
    vi.mocked(getPaymentGateway).mockReturnValueOnce(null);
    expect((await POST(request({ plan: "premium_monthly" }))).status).toBe(503);
    expect(createCheckout).not.toHaveBeenCalled();
  });
});
