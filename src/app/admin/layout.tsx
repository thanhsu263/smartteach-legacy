import { Suspense } from "react";
import { RequireAdmin } from "@/components/admin/require-admin";
export const metadata = { title: "Quản trị", robots: { index: false } };
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={<p role="status">Đang kiểm tra quyền…</p>}>
      <RequireAdmin>{children}</RequireAdmin>
    </Suspense>
  );
}
