import type { Metadata } from "next";
import { Suspense } from "react";
import { ClassEditor } from "@/components/class-editor";
import styles from "../my-classes.module.css";

export const metadata: Metadata = { title: "Chi tiết lớp" };

export default function ClassPage({ params }: PageProps<"/my-classes/[id]">) {
  return (
    <div className={`container ${styles.page}`}>
      <Suspense fallback={null}>
        <ClassContent params={params} />
      </Suspense>
    </div>
  );
}

/** Đọc id từ URL bên trong Suspense; dữ liệu lớp do trình duyệt tải qua RLS. */
async function ClassContent({ params }: Pick<PageProps<"/my-classes/[id]">, "params">) {
  const { id } = await params;
  return <ClassEditor classId={id} />;
}
