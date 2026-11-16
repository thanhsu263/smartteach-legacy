import { NextResponse, type NextRequest } from "next/server";
import { internalRedirectUrl, safeNextPath } from "@/lib/auth/safe-next";
import { getServerSupabase } from "@/lib/supabase/server";

/** Nhận mã từ đăng nhập Google hoặc liên kết xác nhận email, đổi lấy phiên rồi về trang đích. */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");

  const recovery = safeNextPath(searchParams.get("next")) === "/reset-password";
  const redirect = (url: URL) => {
    const response = NextResponse.redirect(url);
    response.headers.set("Cache-Control", "no-store");
    response.headers.set("Referrer-Policy", "no-referrer");
    return response;
  };
  try { if (code && !searchParams.has("error")) {
    const supabase = await getServerSupabase();
    if (supabase) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) {
        return redirect(internalRedirectUrl(searchParams.get("next"), origin, "/dashboard"));
      }
    }
  } } catch { /* Never log provider URLs, codes or tokens. */ }
  return redirect(new URL(recovery ? "/reset-password?error=recovery" : "/login?error=callback", origin));
}
