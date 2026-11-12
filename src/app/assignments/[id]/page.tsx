import { AssignmentDetail } from "@/components/assignments/assignment-detail";
import { Suspense } from "react";

export default function AssignmentPage({ params }: PageProps<"/assignments/[id]">) {
  return <Suspense fallback={null}><AssignmentContent params={params} /></Suspense>;
}

async function AssignmentContent({ params }: Pick<PageProps<"/assignments/[id]">, "params">) {
  const { id } = await params;
  return <AssignmentDetail assignmentId={id} />;
}
