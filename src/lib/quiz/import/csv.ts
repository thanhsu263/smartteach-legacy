import { IMPORT_MAX_BYTES, IMPORT_MAX_ROWS, type Grid } from "./types";

export type CsvResult = {
  grid: Grid;
  /** Có ký tự lỗi mã hoá (�): tệp không lưu ở dạng UTF-8 nên chữ có dấu đã hỏng. */
  encodingSuspect: boolean;
  /** Số hàng vượt `IMPORT_MAX_ROWS` bị bỏ. */
  truncated: number;
  /** Dòng nơi một dấu ngoặc kép được mở mà đến hết tệp vẫn chưa đóng (null nếu mọi ngoặc đều đóng). */
  unterminatedQuoteLine: number | null;
};

/** Dấu phân cách Excel tiếng Việt thường lưu là `;` chứ không phải `,`: chọn theo hàng đầu (ngoài ngoặc kép). */
function detectDelimiter(text: string): string {
  const counts: Record<string, number> = { ",": 0, ";": 0, "\t": 0 };
  let quoted = false;
  for (const char of text) {
    if (char === '"') quoted = !quoted;
    else if (!quoted && (char === "\n" || char === "\r")) break;
    else if (!quoted && char in counts) counts[char] += 1;
  }
  const best = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  return best[1] > 0 ? best[0] : ",";
}

/**
 * Đọc CSV theo RFC 4180: ô trong ngoặc kép có thể chứa dấu phân cách, xuống dòng và `""` (ngoặc kép). Bỏ BOM, nhận cả
 * `\r\n` lẫn `\n`, tự dò `,` `;` hoặc tab, và hiểu dòng đầu `sep=;` mà Excel dùng để khai báo dấu phân cách.
 */
export function parseCsv(input: string): CsvResult {
  let text = input.charCodeAt(0) === 0xfeff ? input.slice(1) : input;
  let delimiter: string | null = null;

  const sep = /^sep=(.)\r?\n/i.exec(text);
  if (sep) {
    delimiter = sep[1];
    text = text.slice(sep[0].length);
  }
  const encodingSuspect = text.includes("�");
  delimiter ??= detectDelimiter(text);

  const rows: Grid = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  let quoteLine = 0;
  // Số dòng gốc của ký tự đang đọc (dòng `sep=` đã bị cắt khỏi `text` nên cộng lại).
  let line = 1 + (sep ? 1 : 0);
  let i = 0;
  const endCell = () => {
    row.push(cell);
    cell = "";
  };
  const endRow = () => {
    endCell();
    rows.push(row);
    row = [];
  };

  while (i < text.length) {
    const char = text[i];
    if (quoted) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i += 2;
          continue;
        }
        quoted = false;
      } else {
        if (char === "\n") line += 1;
        cell += char;
      }
    } else if (char === '"' && cell === "") {
      quoted = true;
      quoteLine = line;
    } else if (char === delimiter) {
      endCell();
    } else if (char === "\r") {
      if (text[i + 1] === "\n") i += 1;
      line += 1;
      endRow();
    } else if (char === "\n") {
      line += 1;
      endRow();
    } else {
      cell += char;
    }
    i += 1;
  }
  // Hàng cuối không có xuống dòng kết thúc.
  if (cell !== "" || row.length > 0) endRow();

  const total = rows.length;
  return {
    grid: rows.slice(0, IMPORT_MAX_ROWS + 1),
    encodingSuspect,
    truncated: Math.max(0, total - (IMPORT_MAX_ROWS + 1)),
    unterminatedQuoteLine: quoted ? quoteLine : null,
  };
}

/** Giới hạn kích thước tệp trước khi đọc. */
export function tooLarge(bytes: number): boolean {
  return bytes > IMPORT_MAX_BYTES;
}
