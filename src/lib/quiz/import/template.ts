/** Hàng tiêu đề của tệp mẫu; `rows.ts` nhận ra các cột này (và nhiều cách gọi khác). */
export const TEMPLATE_HEADER = [
  "Loại câu",
  "Câu hỏi",
  "Lựa chọn A",
  "Lựa chọn B",
  "Lựa chọn C",
  "Lựa chọn D",
  "Lựa chọn E",
  "Lựa chọn F",
  "Đáp án đúng",
  "Thời gian (giây)",
  "Đáp án chấp nhận",
  "Bỏ dấu",
] as const;

/** Bốn dòng ví dụ, mỗi dạng câu một dòng (dùng cho tệp mẫu CSV, tệp .xlsx thử và các test tương đương). */
export const TEMPLATE_ROWS: string[][] = [
  ["Một đáp án", "Thủ đô của Việt Nam là gì?", "Hà Nội", "Huế", "Đà Nẵng", "Cần Thơ", "", "", "A", "20", "", ""],
  ["Đúng/sai", "Mặt Trời quay quanh Trái Đất.", "", "", "", "", "", "", "Sai", "10", "", ""],
  ["Nhiều đáp án", "Những số nào là số chẵn?", "2", "3", "4", "5", "", "", "A, C", "30", "", ""],
  ["Điền từ", "Con vật kêu meo meo là gì?", "", "", "", "", "", "", "", "20", "con mèo | mèo", "có"],
];

function csvCell(value: string): string {
  return /[",\n\r;]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

/**
 * Nội dung tệp mẫu CSV: UTF-8 có BOM (Excel mở đúng chữ có dấu) và dòng đầu `sep=,` để Excel dùng dấu phẩy làm dấu phân
 * cách dù máy đặt vùng là tiếng Việt (mặc định `;`).
 */
export function buildTemplateCsv(): string {
  const lines = ["sep=,", TEMPLATE_HEADER.join(","), ...TEMPLATE_ROWS.map((row) => row.map(csvCell).join(","))];
  return `﻿${lines.join("\r\n")}\r\n`;
}

/** Ví dụ cú pháp dán văn bản, cùng bộ câu với tệp mẫu. */
export const TEXT_SYNTAX_EXAMPLE = `Câu 1: Thủ đô của Việt Nam là gì? [20s]
*A. Hà Nội
B. Huế
C. Đà Nẵng
D. Cần Thơ

Câu 2: Mặt Trời quay quanh Trái Đất. [10s]
A. Đúng
B. Sai
Đáp án: B

Câu 3: Những số nào là số chẵn? [30s]
A. 2
B. 3
C. 4
D. 5
Đáp án: A, C

Câu 4: Con vật kêu meo meo là gì?
Đáp án: con mèo | mèo
Bỏ dấu: có
`;
