import { Suspense } from "react";
import { RequireUser } from "@/components/require-user";
export default function ExamsLayout({ children }: { children: React.ReactNode }) { return <Suspense fallback={null}><RequireUser fallbackNext="/my-exams">{children}</RequireUser></Suspense>; }
