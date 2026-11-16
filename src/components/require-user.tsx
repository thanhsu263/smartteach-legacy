import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { getServerSupabase } from "@/lib/supabase/server";

type RequireUserProps = {
  /** Đường dẫn quay lại sau đăng nhập khi proxy chưa kịp chuyển hướng (ví dụ "/my-quizzes"). */
  fallbackNext: string;
  children: ReactNode;
};

/**
 * Kiểm tra phiên ở phía server trước khi hiện trang của giáo viên (lớp phòng thủ thứ hai sau
 * proxy.ts). Dữ liệu thật vẫn được bảo vệ bằng RLS, không chỉ bằng bước này. Đọc cookie nên phải
 * nằm trong ranh giới Suspense (Cache Components).
 */
export async function RequireUser({ fallbackNext, children }: RequireUserProps) {
  const supabase = await getServerSupabase();
  if (!supabase) {
    return (
      <div className="container" style={{ paddingBlock: "var(--space-6)" }}>
        <p role="alert">Đăng nhập chưa được cấu hình trên máy chủ này.</p>
      </div>
    );
  }
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) redirect(`/login?next=${encodeURIComponent(fallbackNext)}`);
  const state = await supabase.rpc("account_session");
  if (state.error) return <div className="container"><p role="alert">Chưa thể kiểm tra tài khoản. Vui lòng thử lại.</p></div>;
  if (state.data?.status === "blocked") redirect("/account-disabled");
  return <>{children}</>;
}
