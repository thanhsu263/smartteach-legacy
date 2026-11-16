import { describe, expect, it, vi } from "vitest";
import { assertBillingOrigin, billingBody, billingFailure } from "./http";
import { BillingError } from "./service";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ getServerSupabase: vi.fn() }));

describe("billing HTTP boundaries", () => {
  it("POST yêu cầu đúng origin ứng dụng, không nhận origin ngoài", () => {
    expect(() => assertBillingOrigin(new Request("https://app.test/api", { headers: { Origin: "https://evil.test" } }), "https://app.test")).toThrow();
    expect(() => assertBillingOrigin(new Request("https://app.test/api", { headers: { Origin: "https://app.test" } }), "https://app.test")).not.toThrow();
    expect(() => assertBillingOrigin(new Request("https://app.test/api"), null)).toThrow();
  });
  it("JSON đúng, không nhận array hoặc dữ liệu lỗi", async () => {
    const make = (body: string) => new Request("https://app.test/api", { method: "POST", headers: { "content-type": "application/json" }, body });
    await expect(billingBody(make('{"plan":"premium_monthly","amount":1}'))).resolves.toEqual({ plan: "premium_monthly", amount: 1 });
    await expect(billingBody(make("[]"))).rejects.toMatchObject({ status: 400 });
    await expect(billingBody(make("invalid"))).rejects.toMatchObject({ status: 400 });
    await expect(billingBody(make('"string"'))).rejects.toMatchObject({ status: 400 });
  });
  it("giới hạn số byte thật kể cả khi thiếu Content-Length", async () => {
    const request = new Request("https://app.test/api", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ x: "a".repeat(9000) }) });
    await expect(billingBody(request)).rejects.toMatchObject({ status: 413 });
  });
  it("lỗi trả no-store và không lộ lỗi SQL/secret nội bộ", async () => {
    const response = billingFailure(new Error("secret-sql-details"));
    expect(response.status).toBe(503);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(JSON.stringify(await response.json())).not.toContain("secret-sql-details");
    expect(billingFailure(new BillingError(401, "auth", "Đăng nhập")).status).toBe(401);
  });
});
