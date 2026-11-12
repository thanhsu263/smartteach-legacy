import { Suspense } from "react";
import { LibraryBrowser } from "@/components/library/library-browser";

export default function LibraryPage() {
  return <Suspense fallback={<main className="container"><p>Đang mở kho học liệu…</p></main>}><LibraryBrowser /></Suspense>;
}
