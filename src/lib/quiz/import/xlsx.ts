import { IMPORT_MAX_BYTES, IMPORT_MAX_ROWS, type Grid } from "./types";

export type XlsxResult = { ok: true; grid: Grid; truncated: number } | { ok: false; message: string };

/** Lỗi của thư viện đọc .xlsx thành lời nhắn cho giáo viên (không lộ chi tiết kỹ thuật). */
function describeXlsxError(error: unknown): string {
  const code = (error as { code?: string } | null)?.code;
  const name = (error as { name?: string } | null)?.name;
  if (code === "XLS_FILE_NOT_SUPPORTED") {
    return "Đây là tệp Excel cũ (.xls). Thầy cô mở tệp bằng Excel rồi chọn Lưu thành, định dạng Excel (.xlsx) hoặc CSV UTF-8 nhé.";
  }
  if (code === "INVALID_ZIP" || code === "FILE_NOT_SUPPORTED" || code === "NO_DATA" || name === "InvalidSpreadsheetError") {
    return "Không đọc được tệp này như một tệp Excel (.xlsx). Tệp có thể bị hỏng hoặc không đúng định dạng.";
  }
  return "Không đọc được tệp Excel này. Thầy cô thử lưu lại tệp rồi chọn lại nhé.";
}

/** Giá trị một ô thành chuỗi: số nguyên không có đuôi .0, ngày thành YYYY-MM-DD, ô trống thành chuỗi rỗng. */
function cellText(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value);
}

/**
 * Đọc trang tính ĐẦU TIÊN của một tệp .xlsx thành bảng ô văn bản. Thư viện `read-excel-file` được nạp động (chỉ khi
 * giáo viên chọn tệp .xlsx) để không vào gói chính. Chỉ đọc ở trình duyệt, không gửi tệp đi đâu.
 * Giới hạn: 1 MB và 500 hàng (phân tích XML chạy đồng bộ nên tệp lớn có thể làm trang đơ).
 */
export async function readXlsxGrid(input: File | Blob | ArrayBuffer): Promise<XlsxResult> {
  const size = input instanceof ArrayBuffer ? input.byteLength : input.size;
  if (size > IMPORT_MAX_BYTES) {
    return { ok: false, message: `Tệp quá lớn (tối đa ${Math.round(IMPORT_MAX_BYTES / 1_000_000)} MB). Thầy cô tách thành nhiều tệp nhỏ hơn nhé.` };
  }
  try {
    const { readSheet } = await import("read-excel-file/browser");
    const rows = await readSheet(input, 1);
    const grid = rows.map((row) => row.map(cellText));
    return { ok: true, grid: grid.slice(0, IMPORT_MAX_ROWS + 1), truncated: Math.max(0, grid.length - (IMPORT_MAX_ROWS + 1)) };
  } catch (error) {
    return { ok: false, message: describeXlsxError(error) };
  }
}
