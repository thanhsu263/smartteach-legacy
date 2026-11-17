import type { Metadata } from "next";
import Link from "next/link";
import { ImportQuiz } from "@/components/quiz/import-quiz";
import { PageHeading, WorkspacePage } from "@/components/workspace/workspace-layout";

export const metadata: Metadata = { title: "Nhập quiz từ tệp" };

export default function ImportQuizPage() {
  return (
    <WorkspacePage>
      <PageHeading
        title="Nhập quiz từ tệp"
        description="Đưa câu hỏi có sẵn vào quiz mới: tệp Excel (.xlsx), tệp CSV hoặc văn bản dán. Thầy cô xem trước và sửa lỗi trước khi tạo; chưa tạo thì chưa có gì được lưu."
        actions={<Link href="/my-quizzes">Quay lại Quiz của tôi</Link>}
      />
      <ImportQuiz />
    </WorkspacePage>
  );
}
