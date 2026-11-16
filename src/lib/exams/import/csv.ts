/** Strict, bounded CSV reader. Never truncates rows or accepts an unfinished quote. */
export function readExamCsv(text: string): string[][] {
  if (text.length > 100000) throw new Error("Văn bản vượt 100.000 ký tự.");
  text = text.replace(/^\uFEFF/, "");
  const rows: string[][] = []; let row: string[] = [], cell = "", quoted = false, closed = false;
  const endCell = () => { row.push(cell); cell = ""; closed = false; };
  const endRow = () => { endCell(); rows.push(row); row = []; if (rows.length > 501) throw new Error("Tệp vượt 500 hàng dữ liệu."); };
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) { if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else { quoted = false; closed = true; } } else cell += c; continue; }
    if (c === ',') endCell();
    else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; endRow(); }
    else if (closed) throw new Error("Có ký tự sau dấu đóng ngoặc kép trong CSV.");
    else if (c === '"') { if (cell) throw new Error("Dấu ngoặc kép cần bao toàn bộ ô CSV."); quoted = true; }
    else cell += c;
  }
  if (quoted) throw new Error("CSV còn dấu ngoặc kép chưa đóng.");
  if (cell || row.length || closed) endRow();
  return rows;
}
