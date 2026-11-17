import type { Metadata } from "next";
import { Suspense } from "react";
import { PasswordForm } from "@/components/auth/password-forms";
import { Card } from "@/components/ui/ui";
import { PageHeading, WorkspacePage } from "@/components/workspace/workspace-layout";
import styles from "./security.module.css";
export const metadata: Metadata = { title: "Bảo mật tài khoản", robots: { index: false } };
export default function SecurityPage() {
  return <WorkspacePage><PageHeading title="Bảo mật tài khoản" description="Đổi mật khẩu của tài khoản đang đăng nhập." /><Card className={styles.card}><Suspense fallback={null}><PasswordForm mode="change" /></Suspense></Card></WorkspacePage>;
}
