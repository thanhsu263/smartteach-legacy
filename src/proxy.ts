import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isProtectedPath } from "@/lib/auth/protected-paths";
import { internalRedirectUrl } from "@/lib/auth/safe-next";
import { getSupabaseConfig } from "@/lib/supabase/config";

/**
 * Làm mới phiên đăng nhập và chuyển hướng:
 * - trang của giáo viên (/my-classes, /my-quizzes, /shared) mà chưa đăng nhập thì về /login, nhớ trang đang vào;
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

  if (!signedIn && isProtectedPath(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(pathname + search)}`;
    return redirectWithCookies(url, response);
  }

  if (signedIn && pathname === "/login") {
    // Dựng URL từ cả đường dẫn lẫn query của `next`; gán riêng `pathname` sẽ mã hoá dấu "?".
    const url = internalRedirectUrl(request.nextUrl.searchParams.get("next"), request.nextUrl.origin, "/my-classes");
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

// Giữ khớp với PROTECTED_PREFIXES trong src/lib/auth/protected-paths.ts.
export const config = {
  matcher: ["/my-classes/:path*", "/my-quizzes/:path*", "/shared/:path*", "/login"],
};
