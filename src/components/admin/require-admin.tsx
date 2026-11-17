import { redirect } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase/server";
import { AdminGate } from "./admin-gate";
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
    return <AdminGate tone="error" title="Chưa thể kiểm tra quyền quản trị" description="Vui lòng tải lại hoặc thử lại sau." />;
  if (state.data?.status === "blocked") redirect("/account-disabled");
  if (state.data?.role !== "admin")
    return <AdminGate tone="denied" title="Không có quyền quản trị" description="Khu vực này dành cho quản trị viên SmartTeach." />;
  return <AdminShell>{children}</AdminShell>;
}
