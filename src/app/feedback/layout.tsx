import { Suspense } from "react";
import { RequireUser } from "@/components/require-user";
export default function FeedbackLayout({ children }: { children: React.ReactNode }) { return <Suspense fallback={null}><RequireUser fallbackNext="/feedback">{children}</RequireUser></Suspense>; }
