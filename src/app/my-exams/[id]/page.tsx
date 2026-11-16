import { Suspense } from "react";
import { ExamWorkspace } from "@/components/exams/exam-editor";
async function Editor({ params }: PageProps<"/my-exams/[id]">) { return <ExamWorkspace examId={(await params).id} />; }
export default function ExamPage(props: PageProps<"/my-exams/[id]">) { return <Suspense fallback={<p>Đang tải đề…</p>}><Editor {...props} /></Suspense>; }
