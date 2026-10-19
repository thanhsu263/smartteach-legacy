import type { Metadata } from "next";
import { Suspense } from "react";
import { RequireUser } from "@/components/require-user";

export const metadata: Metadata = {
  robots: { index: false },
};

export default function HostLayout({ children }: LayoutProps<"/host">) {
  return (
    <Suspense fallback={null}>
      <RequireUser fallbackNext="/my-quizzes">{children}</RequireUser>
    </Suspense>
  );
}
