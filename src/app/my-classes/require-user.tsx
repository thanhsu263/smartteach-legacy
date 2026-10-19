import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { getServerSupabase } from "@/lib/supabase/server";

/**
 * Kiểm tra phiên ở phía server trước khi hiện trang của giáo viên (lớp phòng thủ thứ hai sau
 * proxy.ts). Dữ liệu thật vẫn được bảo vệ bằng RLS, không chỉ bằng bước này.
 */
export async function RequireUser({ children }: { children: ReactNode }) {
  const supabase = await getServerSupabase();
  if (!supabase) {
    return (
      <div className="container" style={{ paddingBlock: "var(--space-6)" }}>
        <p role="alert">Đăng nhập chưa được cấu hình trên máy chủ này.</p>
      </div>
    );
  }
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) redirect("/login?next=%2Fmy-classes");
  return <>{children}</>;
}
