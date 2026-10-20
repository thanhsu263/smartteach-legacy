const zero = (code: number) => String.fromCharCode(code);

/**
 * Ký tự điều khiển (trừ xuống dòng và tab) và ký tự vô hình hay dính vào khi dán từ Word hoặc web: khoảng rộng bằng không
 * (U+200B đến U+200D), nối từ (U+2060) và BOM (U+FEFF). Dựng từ mã ký tự để không phải viết ký tự vô hình vào mã nguồn.
 */
const INVISIBLE = new RegExp(`[\\x00-\\x08\\x0B\\x0C\\x0E-\\x1F\\x7F${zero(0x200b)}-${zero(0x200d)}${zero(0x2060)}${zero(0xfeff)}]`, "g");

/** Làm sạch một chuỗi lấy từ tệp: chuẩn hoá Unicode NFC (gõ dấu kiểu nào cũng như nhau), bỏ ký tự điều khiển và ký tự vô hình. */
export function clean(value: string): string {
  return value.normalize("NFC").replace(INVISIBLE, "").trim();
}

/** Một dòng: mọi kiểu xuống dòng và tab thành một khoảng trắng (lựa chọn, đáp án không có xuống dòng). */
export function oneLine(value: string): string {
  return clean(value.replace(/[\r\n\t]+/g, " ").replace(/ {2,}/g, " "));
}

/**
 * Dạng so khớp: chữ thường, bỏ dấu (đ thành d) và bỏ mọi ký tự không phải chữ số hay chữ cái. Dùng để nhận ra tên cột
 * ("Đáp án đúng" và "dap an dung" như nhau) và các từ khoá như "Đúng", "nhiều đáp án".
 */
export function fold(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/gi, "d")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}
