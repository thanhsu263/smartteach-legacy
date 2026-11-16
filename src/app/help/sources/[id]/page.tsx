import { Suspense } from "react";
import { RequireUser } from "@/components/require-user";
import { SourceViewer } from "@/components/chat/source-viewer";
async function Content({ params }: PageProps<"/help/sources/[id]">) {
  const { id } = await params;
  return (
    <RequireUser fallbackNext={"/help/sources/" + id}>
      <SourceViewer id={id} />
    </RequireUser>
  );
}
export default function Page(props: PageProps<"/help/sources/[id]">) {
  return (
    <Suspense fallback={<p>Đang kiểm tra tài khoản…</p>}>
      <Content {...props} />
    </Suspense>
  );
}
