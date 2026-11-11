import type { Metadata } from "next";
import { Suspense } from "react";
import { RequireUser } from "@/components/require-user";

export const metadata: Metadata = { robots: { index: false } };

export default function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  return <Suspense fallback={null}><RequireUser fallbackNext="/dashboard">{children}</RequireUser></Suspense>;
}
