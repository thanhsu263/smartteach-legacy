import "server-only";
import { getServerSupabase } from "@/lib/supabase/server";
import { billingBody } from "@/lib/membership/http";
import { isUuid } from "@/lib/classes/api";

export type AccountSession = {
  userId: string;
  role: "admin" | "teacher";
  status: "active" | "blocked";
  version: number;
};
export class AppError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}
export const json = (value: unknown, status = 200) =>
  Response.json(value, { status, headers: { "Cache-Control": "no-store" } });
export function failure(error: unknown) {
  const issue =
    error instanceof AppError
      ? error
      : new AppError(503, "unavailable", "Chưa thể xử lý. Vui lòng thử lại.");
  return json(
    {
      error: {
        code: issue.code,
        message: issue.message,
        requestId: crypto.randomUUID(),
      },
    },
    issue.status,
  );
}
export async function requireUser(admin = false) {
  const client = await getServerSupabase();
  if (!client)
    throw new AppError(503, "not_configured", "Dịch vụ chưa được cấu hình.");
  const auth = await client.auth.getUser();
  if (auth.error || !auth.data.user)
    throw new AppError(401, "sign_in_required", "Vui lòng đăng nhập.");
  const result = await client.rpc("account_session");
  if (result.error || !result.data)
    throw new AppError(
      503,
      "account_unavailable",
      "Chưa thể kiểm tra tài khoản.",
    );
  const account = result.data as AccountSession;
  if (account.status !== "active" || (admin && account.role !== "admin"))
    throw new AppError(
      403,
      "forbidden",
      "Tài khoản không có quyền thực hiện thao tác này.",
    );
  return { client, account };
}
export async function mutation(request: Request, maxBytes = 16_384) {
  const expected = process.env.APP_BASE_URL;
  if (!expected || request.headers.get("origin") !== new URL(expected).origin)
    throw new AppError(403, "origin_invalid", "Yêu cầu chưa hợp lệ.");
  try {
    return await billingBody(request, maxBytes);
  } catch {
    throw new AppError(
      400,
      "body_invalid",
      "Dữ liệu gửi lên chưa hợp lệ hoặc quá lớn.",
    );
  }
}
export function dbError(error: { code?: string; message?: string } | null) {
  if (!error) return;
  const status = error.code?.startsWith("PT")
    ? Number(error.code.slice(2))
    : error.code === "42501"
      ? 403
      : ["23514", "23502", "22P02", "22023"].includes(error.code ?? "")
        ? 400
        : 503;
  const messages: Record<string, string> = {
    exam_worker_not_ready: "AI nhập đề chưa sẵn sàng. Cần cấu hình lịch nền và key AI đã kiểm kết nối.",
    exam_import_invalid: "Thông tin tệp nhập chưa hợp lệ.",
    exam_import_busy: "Thầy cô đang có tệp chờ xử lý hoặc cần kiểm tra. Hoàn tất hoặc hủy tệp đó trước nhé.",
    exam_import_daily_cap: "Đã nhận đủ 3 tệp AI hôm nay. Thầy cô có thể dùng mẫu nhập miễn phí hoặc thử lại vào ngày mai.",
    exam_import_not_found: "Không tìm thấy tệp nhập này hoặc tệp đã hết hạn.",
    exam_import_not_retryable: "Tệp này không thể thử lại trong hạn mức hiện tại. Kiểm tra tệp/cấu hình rồi tạo lượt nhập mới.",
    exam_import_wait: "Cần chờ hạn mức AI trước khi thử lại.",
    exam_import_review_required: "Cần kiểm tra nội dung và đáp án trước khi lưu bản nhập.",
    exam_import_upload_missing: "Tệp chưa được tải đầy đủ. Thầy cô thử lại nhé.",
    exam_invalid: "Cấu trúc đề không hợp lệ hoặc vượt giới hạn.",
    exam_incomplete: "Đề cần đủ câu hỏi, đáp án và điểm trước khi xuất hoặc phát hành.",
    exam_not_found: "Không tìm thấy đề kiểm tra này.",
    exam_capacity: "Đã đủ 50 đề. Thầy cô xóa đề không dùng trước khi tạo thêm.",
    feedback_invalid: "Góp ý cần từ 10 đến 2000 ký tự và đúng loại nội dung.",
    feedback_rate_limit: "Đã đạt giới hạn gửi góp ý. Thầy cô đợi một lát rồi thử lại nhé.",
    request_conflict: "Yêu cầu trước có nội dung khác. Thầy cô tải lại trước khi gửi.",
    last_admin: "Phải giữ ít nhất một quản trị viên đang hoạt động.",
    version_conflict: "Dữ liệu đã thay đổi. Hãy tải lại trước khi sửa.",
    admin_already_exists: "Đã có quản trị viên; dùng màn hình phân quyền.",
    premium_required: "Cần Premium để thực hiện.",
    capacity_exceeded:
      "Kho đã chạm giới hạn dung lượng hoặc số lượng. Gỡ nguồn không cần trước khi thử lại.",
    user_daily_cap:
      "Thầy cô đã dùng hết lượt hỏi hôm nay. Hạn mức mở lại vào ngày mới theo giờ Việt Nam.",
    thread_busy: "Hội thoại đang xử lý một câu hỏi. Vui lòng chờ hoặc tải lại.",
    chat_unavailable: "Trợ lý chưa sẵn sàng. Vui lòng thử lại sau.",
    source_changed: "Nguồn đã thay đổi hoặc được gỡ. Vui lòng hỏi lại.",
  };
  const safeCodes = new Set([
    "last_admin",
    "version_conflict",
    "capacity_exceeded",
    "lease_lost",
    "source_changed",
    "user_daily_cap",
    "thread_busy",
    "chat_unavailable",
    "thread_not_found",
    "request_expired",
    "thread_deleted",
  ]);
  throw new AppError(
    status,
    safeCodes.has(error.message ?? "") ? error.message! : "operation_failed",
    messages[error.message ?? ""] ??
      "Không thể thực hiện thao tác. Kiểm tra dữ liệu và thử lại.",
  );
}
export function uuid(value: unknown): string {
  if (typeof value !== "string" || !isUuid(value))
    throw new AppError(400, "id_invalid", "Mã dữ liệu chưa hợp lệ.");
  return value.toLowerCase();
}
export function pageParams(request: Request) {
  const params = new URL(request.url).searchParams;
  const offset = Number(params.get("offset") ?? 0);
  if (!Number.isInteger(offset) || offset < 0 || offset > 100000)
    throw new AppError(400, "page_invalid", "Trang chưa hợp lệ.");
  return { query: (params.get("q") ?? "").slice(0, 100), offset, params };
}
