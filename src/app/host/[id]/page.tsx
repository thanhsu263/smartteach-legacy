import type { Metadata } from "next";
import { Suspense } from "react";
import { HostScreen } from "@/components/live/host/host-screen";

export const metadata: Metadata = { title: "Điều khiển phiên chơi" };

export default function HostPage({ params }: PageProps<"/host/[id]">) {
  return (
    <div className="container" style={{ paddingBlock: "var(--space-5)" }}>
      <Suspense fallback={null}>
        <HostContent params={params} />
      </Suspense>
    </div>
  );
}

/** Đọc id phiên từ URL bên trong Suspense; trạng thái do trình duyệt hỏi qua hàm có kiểm tra chủ phiên. */
async function HostContent({ params }: Pick<PageProps<"/host/[id]">, "params">) {
  const { id } = await params;
  return <HostScreen sessionId={id} />;
}
