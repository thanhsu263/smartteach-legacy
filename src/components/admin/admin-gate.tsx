import type { ReactNode } from "react";
import { ButtonLink } from "@/components/button";
import { LockIcon, ShieldCheckIcon } from "@/components/icons";
import { Card, EmptyState, Skeleton } from "@/components/ui/ui";
import styles from "./admin-gate.module.css";

/** Trạng thái chặn trước khi vào shell quản trị (không quyền, lỗi kiểm tra). */
export function AdminGate({ title, description, tone }: { title: string; description: ReactNode; tone: "denied" | "error" }) {
  return (
    <div className={styles.gate}>
      <Card size="lg" className={styles.card}>
        <EmptyState
          level={1}
          role={tone === "error" ? "alert" : undefined}
          icon={tone === "denied" ? <LockIcon /> : <ShieldCheckIcon />}
          title={title}
          description={description}
          actions={<ButtonLink href="/dashboard" variant="primary">Về không gian dạy học</ButtonLink>}
        />
      </Card>
    </div>
  );
}

/** Fallback Suspense: khung shell rỗng để tránh nhảy bố cục khi đang kiểm tra quyền. */
export function AdminGateLoading() {
  return (
    <div className={styles.loading}>
      <div className={styles.loadingSidebar} aria-hidden="true" />
      <div className={styles.loadingBody}>
        <p role="status" className={styles.loadingText}>Đang kiểm tra quyền…</p>
        <Skeleton width="40%" height="2rem" />
        <Skeleton width="70%" />
        <Skeleton height="12rem" />
      </div>
    </div>
  );
}
