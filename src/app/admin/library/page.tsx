import { LibraryManager } from "@/components/admin/content-managers";
import { ReportsManager } from "@/components/admin/operations-managers";
export default function Page() {
  return (
    <>
      <LibraryManager />
      <ReportsManager />
    </>
  );
}
