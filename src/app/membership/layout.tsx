import type { Metadata } from "next";
import { Suspense } from "react";
import { RequireUser } from "@/components/require-user";

export const metadata: Metadata = { title: "Gói thành viên", robots: { index: false } };
export default function MembershipLayout({ children }: LayoutProps<"/membership">) {
  return <Suspense fallback={null}><RequireUser fallbackNext="/membership">{children}</RequireUser></Suspense>;
}
