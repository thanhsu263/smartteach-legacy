import { MAX_CLASSES, MAX_NAME_LENGTH, MAX_STUDENTS_PER_CLASS } from "@/lib/classes/limits";

type ErrorLike = { code?: string; message?: string } | null | undefined;

const GENERIC = "Có lỗi xảy ra. Thầy cô thử lại nhé.";

/** Đổi lỗi từ PostgREST/Postgres thành lời nhắn tiếng Việt, rõ bước tiếp theo. */
export function describeDbError(error: ErrorLike): string {
  if (!error) return GENERIC;
  const message = error.message ?? "";
  if (message.includes("class_limit_exceeded")) {
    return `Thầy cô đã có ${MAX_CLASSES} lớp, là giới hạn tối đa. Xoá bớt lớp cũ rồi tạo lớp mới nhé.`;
  }
  if (message.includes("student_limit_exceeded")) {
    return `Một lớp chứa tối đa ${MAX_STUDENTS_PER_CLASS} học sinh.`;
  }
  if (error.code === "23514") return `Tên cần từ 1 đến ${MAX_NAME_LENGTH} ký tự.`;
  if (error.code === "23505") return "Mục này đã có rồi.";
  if (error.code === "42501" || error.code === "PGRST301") {
    return "Phiên đăng nhập không còn hiệu lực. Thầy cô đăng nhập lại nhé.";
  }
  if (/failed to fetch|networkerror|network request failed|load failed/i.test(message)) {
    return "Không kết nối được máy chủ. Thầy cô kiểm tra mạng rồi thử lại nhé.";
  }
  return GENERIC;
}
