import { describe, expect, it } from "vitest";
import { csvCell, makeCsv } from "./csv";
describe("CSV download safety", () => {
  it("giữ tiếng Việt, BOM, quotes và multiline", () => {
    expect(makeCsv(["Tên", "Ghi chú"], [["Nguyễn An", 'Có, dấu "kép"\nvà xuống dòng']])).toBe('\uFEFF"Tên","Ghi chú"\r\n"Nguyễn An","Có, dấu ""kép""\nvà xuống dòng"\r\n');
  });
  it("vô hiệu formula cả sau khoảng trắng/control nhưng không đổi điểm số", () => {
    for (const input of ["=HYPERLINK(1)", " +SUM(1)", "\t@abc", "\r=abc", "-2+3", "\u0000 =x"]) expect(csvCell(input)).toBe('"\'' + input + '"');
    expect(csvCell(-10)).toBe('"-10"');
    expect(csvCell(null)).toBe('""'); expect(csvCell(NaN)).toBe('""');
    expect(() => makeCsv(["a"], [[1, 2]])).toThrow();
  });
});
