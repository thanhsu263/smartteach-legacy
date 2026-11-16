import { SignOutAccount } from "@/components/admin/sign-out-account";
export default function AccountDisabledPage() {
  return (
    <div className="container">
      <h1>Tài khoản đã bị khóa</h1>
      <p>Liên hệ quản trị viên nếu thầy cô cần hỗ trợ.</p>
      <SignOutAccount />
    </div>
  );
}
