import { Suspense } from "react";
import { AdminGateLoading } from "@/components/admin/admin-gate";
import { RequireAdmin } from "@/components/admin/require-admin";
export const metadata = { title: "Quản trị", robots: { index: false } };
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={<AdminGateLoading />}>
      <RequireAdmin>{children}</RequireAdmin>
    </Suspense>
  );
}
