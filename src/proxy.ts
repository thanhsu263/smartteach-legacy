import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { safeNextPath } from "@/lib/auth/safe-next";
import { getSupabaseConfig } from "@/lib/supabase/config";

/**
 * Làm mới phiên đăng nhập và chuyển hướng:
 * - trang của giáo viên (/my-classes) mà chưa đăng nhập thì về /login, nhớ trang đang vào;
 * - /login mà đã đăng nhập thì về trang đích.
 * Đây chỉ là lớp tiện lợi; quyền truy cập dữ liệu thật do RLS và kiểm tra ở server bảo đảm.
 */
export async function proxy(request: NextRequest) {
  const config = getSupabaseConfig();
  if (!config) return NextResponse.next();

  let response = NextResponse.next({ request });
  const supabase = createServerClient(config.url, config.key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet) => {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) response.cookies.set(name, value, options);
      },
    },
  });

  const { data } = await supabase.auth.getClaims();
  const signedIn = Boolean(data?.claims);
  const { pathname, search } = request.nextUrl;

  if (!signedIn && pathname.startsWith("/my-classes")) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(pathname + search)}`;
    return redirectWithCookies(url, response);
  }

  if (signedIn && pathname === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = safeNextPath(request.nextUrl.searchParams.get("next"), "/my-classes");
    url.search = "";
    return redirectWithCookies(url, response);
  }

  return response;
}

/** Giữ cookie phiên vừa được làm mới khi chuyển hướng. */
function redirectWithCookies(url: URL, from: NextResponse) {
  const redirect = NextResponse.redirect(url);
  for (const cookie of from.cookies.getAll()) redirect.cookies.set(cookie);
  return redirect;
}

export const config = {
  matcher: ["/my-classes/:path*", "/login"],
};
