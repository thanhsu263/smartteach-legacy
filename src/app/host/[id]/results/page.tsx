import type { Metadata } from "next";
import { Suspense } from "react";
import { ResultsScreen } from "@/components/live/results/results-screen";

export const metadata: Metadata = { title: "Kết quả buổi chơi" };

export default function ResultsPage({ params }: PageProps<"/host/[id]/results">) {
  return (
    <div className="container" style={{ paddingBlock: "var(--space-5)" }}>
      <Suspense fallback={null}>
        <ResultsContent params={params} />
      </Suspense>
    </div>
  );
}

/** Đọc id phiên từ URL bên trong Suspense; kết quả do trình duyệt hỏi qua hàm có kiểm tra chủ phiên. */
async function ResultsContent({ params }: Pick<PageProps<"/host/[id]/results">, "params">) {
  const { id } = await params;
  return <ResultsScreen sessionId={id} />;
}
