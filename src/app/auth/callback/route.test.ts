import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const exchangeCodeForSession = vi.fn();
const getServerSupabase = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  getServerSupabase: () => getServerSupabase(),
}));

import { GET } from "./route";

const origin = "http://localhost:3100";

function call(query: string) {
  return GET(new NextRequest(`${origin}/auth/callback${query}`));
}

function location(response: Response) {
  return response.headers.get("location");
}

beforeEach(() => {
  exchangeCodeForSession.mockReset();
  getServerSupabase.mockReset();
  getServerSupabase.mockResolvedValue({ auth: { exchangeCodeForSession } });
});

describe("GET /auth/callback", () => {
  it("recovery lỗi về đúng màn hình gửi lại, không loop qua login có phiên", async () => {
    exchangeCodeForSession.mockResolvedValue({ error: { code: "bad_code" } });
    const response = await call("?code=used&next=%2Freset-password");
    expect(location(response)).toBe(`${origin}/reset-password?error=recovery`);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("referrer-policy")).toBe("no-referrer");
  });
  it("không lộ lỗi provider khi network throw", async () => {
    exchangeCodeForSession.mockRejectedValue(new Error("sensitive provider error"));
    expect(location(await call("?code=bad&next=%2Freset-password"))).toBe(`${origin}/reset-password?error=recovery`);
  });
  it("đổi mã lấy phiên thành công thì về trang đích nội bộ", async () => {
    exchangeCodeForSession.mockResolvedValue({ error: null });
    const response = await call("?code=abc&next=%2Fgames%2Fgargamel-bat-xi-trum");
    expect(exchangeCodeForSession).toHaveBeenCalledWith("abc");
    expect(location(response)).toBe(`${origin}/games/gargamel-bat-xi-trum`);
  });

  it("không có next thì về Tổng quan", async () => {
    exchangeCodeForSession.mockResolvedValue({ error: null });
    expect(location(await call("?code=abc"))).toBe(`${origin}/dashboard`);
  });

  it("next trỏ ra ngoài (kể cả bằng dấu chấm) thì bị thay bằng trang mặc định, không bao giờ rời tên miền", async () => {
    exchangeCodeForSession.mockResolvedValue({ error: null });
    for (const evil of [
      "https://evil.example",
      "//evil.example",
      "/..//evil.example",
      "/.//evil.example",
      "/%2e%2e//evil.example",
      "/\\evil.example",
    ]) {
      const target = location(await call(`?code=abc&next=${encodeURIComponent(evil)}`));
      expect(target, evil).toBe(`${origin}/dashboard`);
      expect(new URL(target!).origin, evil).toBe(origin);
    }
  });

  it("mã sai hoặc hết hạn thì về trang đăng nhập kèm lỗi", async () => {
    exchangeCodeForSession.mockResolvedValue({ error: { message: "invalid grant" } });
    expect(location(await call("?code=bad&next=%2Fgames"))).toBe(`${origin}/login?error=callback`);
  });

  it("thiếu mã thì không gọi Supabase và về trang đăng nhập kèm lỗi", async () => {
    expect(location(await call("?next=%2Fgames"))).toBe(`${origin}/login?error=callback`);
    expect(exchangeCodeForSession).not.toHaveBeenCalled();
  });

  it("chưa cấu hình Supabase thì về trang đăng nhập kèm lỗi", async () => {
    getServerSupabase.mockResolvedValue(null);
    expect(location(await call("?code=abc"))).toBe(`${origin}/login?error=callback`);
  });
});
