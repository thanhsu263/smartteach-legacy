import type { Metadata } from "next";
import { Suspense } from "react";
import { RequireUser } from "@/components/require-user";

export const metadata: Metadata = { title: "Bài đã giao", robots: { index: false } };

export default function AssignmentsLayout({ children }: LayoutProps<"/assignments">) {
  return <Suspense fallback={null}><RequireUser fallbackNext="/assignments">{children}</RequireUser></Suspense>;
}
