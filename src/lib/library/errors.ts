type ErrorLike = { code?: string; message?: string } | null | undefined;

export function describeLibraryError(error: ErrorLike): string {
  const message = error?.message ?? "";
  if (message.includes("publication_not_found")) return "Không tìm thấy học liệu này hoặc học liệu chưa được duyệt.";
  if (message.includes("publication_not_editable")) return "Học liệu đang chờ duyệt hoặc đã được duyệt nên không thể sửa.";
  if (message.includes("publication_quiz_invalid")) return "Quiz cần có câu hỏi hợp lệ trước khi gửi duyệt.";
  if (message.includes("not_authenticated") || error?.code === "42501") return "Thầy cô đăng nhập để thực hiện thao tác này nhé.";
  if (/failed to fetch|networkerror|network request failed|load failed/i.test(message)) return "Không kết nối được máy chủ. Thầy cô kiểm tra mạng rồi thử lại nhé.";
  return "Có lỗi xảy ra. Thầy cô thử lại nhé.";
}
