import { IMPORT_MAX_ENTRY_BYTES, IMPORT_MAX_UNZIPPED_BYTES } from "./types";

/**
 * Chốt chặn cho tệp .xlsx lạ: giới hạn 1 MB chỉ tính trên tệp đã NÉN, mà một tệp vài trăm KB có thể giải nén ra hàng trăm
 * MB (zip bomb) làm tab trình duyệt đơ hàng chục giây. Hàm này chỉ ĐỌC DANH MỤC của tệp zip (bộ lọc không giải nén gì cả)
 * và từ chối nếu kích thước giải nén được khai báo quá lớn. Lưu ý: tệp cố tình khai báo thấp hơn thực tế vẫn lọt; đây là
 * chốt chặn cho tệp lạ hoặc hỏng, không phải bảo vệ tuyệt đối.
 *
 * Trả về lời nhắn (tiếng Việt) nếu phải từ chối, hoặc null nếu ổn hoặc không đọc được danh mục (để thư viện đọc tệp báo
 * lỗi định dạng như thường lệ).
 */
export async function checkZipSizes(bytes: Uint8Array): Promise<string | null> {
  const { unzipSync } = await import("fflate");
  let total = 0;
  let largest = 0;
  try {
    unzipSync(bytes, {
      filter(file) {
        total += file.originalSize;
        largest = Math.max(largest, file.originalSize);
        return false; // chỉ liệt kê, không giải nén
      },
    });
  } catch {
    return null;
  }
  if (largest > IMPORT_MAX_ENTRY_BYTES || total > IMPORT_MAX_UNZIPPED_BYTES) {
    return "Tệp Excel này chứa dữ liệu giải nén quá lớn so với kích thước tệp (có thể là tệp lạ hoặc bị hỏng) nên không được đọc. Thầy cô dùng tệp mẫu hoặc lưu lại thành CSV UTF-8 nhé.";
  }
  return null;
}
