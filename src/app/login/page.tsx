import type { Metadata } from "next";
import { ComingSoon } from "@/components/coming-soon";

export const metadata: Metadata = { title: "Đăng nhập" };

export default function LoginPage() {
  return (
    <ComingSoon title="Đăng nhập đang được chuẩn bị">
      Thầy cô sẽ đăng nhập để lưu danh sách lớp và trò chơi yêu thích. Học sinh không cần tài khoản. Trang này đang được xây dựng.
    </ComingSoon>
  );
}
