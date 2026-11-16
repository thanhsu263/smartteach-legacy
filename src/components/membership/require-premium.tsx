import type { ReactNode } from "react";
import { getServerSupabase } from "@/lib/supabase/server";
import { ButtonLink } from "@/components/button";
import styles from "./membership.module.css";

export async function RequirePremium({ children }: { children: ReactNode }) {
  const client = await getServerSupabase();
  const result = client ? await client.rpc("membership_status") : null;
  if (!result || result.error) return <section className={styles.gate}><h1>Chưa thể kiểm tra gói thành viên</h1><p role="alert">Vui lòng tải lại trang hoặc thử lại sau.</p><ButtonLink href="/membership">Thông tin thành viên</ButtonLink></section>;
  if (result.data?.active) return <>{children}</>;
  return <section className={styles.gate}><h1>Soạn và giao đề với Premium</h1><p>Premium mở khóa soạn đề online, giao bài và theo dõi kết quả. Quiz và trò chơi cơ bản vẫn miễn phí.</p><p>Từ 50.000đ/tháng hoặc 500.000đ/năm, không tự động gia hạn.</p><div className={styles.actions}><ButtonLink href="/membership?plan=premium_monthly" variant="primary">Xem gói Premium</ButtonLink><ButtonLink href="/assignments">Xem bài đã giao</ButtonLink></div></section>;
}
