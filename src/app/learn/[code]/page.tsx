import type { Metadata } from "next";
import { Suspense } from "react";
import { StudentAssignmentRunner } from "@/components/assignments/student-assignment-runner";

export const metadata: Metadata = { title: "Làm bài" };
export default function LearnAssignmentPage({ params }: PageProps<"/learn/[code]">) { return <Suspense fallback={null}><LearnContent params={params} /></Suspense>; }
async function LearnContent({ params }: Pick<PageProps<"/learn/[code]">, "params">) { const { code } = await params; return <StudentAssignmentRunner code={code} />; }
