export type CsvCell = string | number | boolean | null | undefined;
/** RFC4180 + UTF-8 BOM. Typed numbers stay numeric; untrusted text cannot execute a spreadsheet formula. */
export function csvCell(value: CsvCell): string {
  let text = value === null || value === undefined ? "" : String(value);
  if (typeof value === "number" && !Number.isFinite(value)) text = "";
  if (typeof value === "string" && (/^[\s\u0000-\u001f]*[=+\-@]/.test(text) || /^[\t\r\n]/.test(text))) text = "'" + text;
  return '"' + text.replaceAll('"', '""') + '"';
}
export function makeCsv(headers: string[], rows: CsvCell[][]): string {
  if (rows.some(row => row.length !== headers.length)) throw new Error("Số cột CSV chưa khớp.");
  return "\uFEFF" + [headers, ...rows].map(row => row.map(csvCell).join(",")).join("\r\n") + "\r\n";
}
export function downloadCsv(filename: string, content: string) {
  const url = URL.createObjectURL(new Blob([content], { type: "text/csv;charset=utf-8" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename.replace(/[^\p{L}\p{N}._-]/gu, "_").slice(0, 100).replace(/^\.+/, "") || "ket-qua.csv";
  document.body.append(anchor); anchor.click(); anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
