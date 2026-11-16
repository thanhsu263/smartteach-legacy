import { SignOutAccount } from "@/components/admin/sign-out-account";
import { WorkspacePage, PageHeading } from "@/components/workspace/workspace-layout";
export default function AccountDisabledPage() {
  return (
    <WorkspacePage className="container">
      <PageHeading title="Tài khoản đã bị khóa" description="Liên hệ quản trị viên nếu thầy cô cần hỗ trợ." />
      <SignOutAccount />
    </WorkspacePage>
  );
}
