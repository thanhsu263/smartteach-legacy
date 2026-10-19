import type { Metadata } from "next";
import { Suspense } from "react";
import { RequireUser } from "./require-user";

export const metadata: Metadata = {
  robots: { index: false },
};

export default function MyClassesLayout({ children }: LayoutProps<"/my-classes">) {
  return (
    <Suspense fallback={null}>
      <RequireUser>{children}</RequireUser>
    </Suspense>
  );
}
