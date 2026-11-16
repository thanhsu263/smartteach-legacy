import { Suspense } from "react";
import { RequireUser } from "@/components/require-user";
export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={null}><RequireUser fallbackNext="/account/security">{children}</RequireUser></Suspense>;
}
