import { redirect } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase/server";
import { AdminShell } from "./admin-shell";
export async function RequireAdmin({
  children,
}: {
  children: React.ReactNode;
}) {
  const client = await getServerSupabase();
  const auth = client ? await client.auth.getUser() : null;
  if (!auth?.data.user) redirect("/login?next=%2Fadmin");
  const state = await client!.rpc("account_session");
  if (state.error)
    return (
      <div className="container">
        <h1>Chưa thể kiểm tra quyền quản trị</h1>
        <p>Vui lòng tải lại hoặc thử lại sau.</p>
      </div>
    );
  if (state.data?.status === "blocked") redirect("/account-disabled");
  if (state.data?.role !== "admin")
    return (
      <div className="container">
        <h1>Không có quyền quản trị</h1>
        <p>Khu vực này dành cho quản trị viên SmartTeach.</p>
      </div>
    );
  return <AdminShell>{children}</AdminShell>;
}
