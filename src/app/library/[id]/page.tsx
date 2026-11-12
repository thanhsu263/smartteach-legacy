import { LibraryPreview } from "@/components/library/library-preview";

export const instant = false;

export default async function LibraryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <LibraryPreview id={id} />;
}
