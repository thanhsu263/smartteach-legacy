import { describe, expect, it } from "vitest";
import { parseCsv, tooLarge } from "./csv";
import { IMPORT_MAX_BYTES, IMPORT_MAX_ROWS } from "./types";

describe("đọc CSV", () => {
  it("dấu phẩy, hai kiểu xuống dòng, bỏ hàng trống cuối và BOM", () => {
    expect(parseCsv("a,b,c\r\n1,2,3\r\n").grid).toEqual([["a", "b", "c"], ["1", "2", "3"]]);
    expect(parseCsv("a,b\n1,2").grid).toEqual([["a", "b"], ["1", "2"]]);
    expect(parseCsv("﻿Câu hỏi,Đáp án\nHà Nội,A\n").grid).toEqual([["Câu hỏi", "Đáp án"], ["Hà Nội", "A"]]);
  });

  it("ô trong ngoặc kép có thể chứa dấu phân cách, xuống dòng và ngoặc kép (nhân đôi)", () => {
    const { grid } = parseCsv('a,b\n"x, y","dòng 1\ndòng 2"\n"nói ""xin chào""",z');
    expect(grid).toEqual([["a", "b"], ["x, y", "dòng 1\ndòng 2"], ['nói "xin chào"', "z"]]);
  });

  it("tự dò dấu chấm phẩy (Excel tiếng Việt) và tab", () => {
    expect(parseCsv("Câu hỏi;Đáp án\nHà Nội;A").grid).toEqual([["Câu hỏi", "Đáp án"], ["Hà Nội", "A"]]);
    expect(parseCsv("a\tb\n1\t2").grid).toEqual([["a", "b"], ["1", "2"]]);
    // Dấu phẩy nằm trong ngoặc kép ở hàng đầu không được tính.
    expect(parseCsv('"a,b";c\n1;2').grid).toEqual([["a,b", "c"], ["1", "2"]]);
  });

  it("hiểu dòng đầu sep= của Excel và bỏ dòng đó", () => {
    expect(parseCsv("sep=;\nCâu hỏi;Đáp án\nx;y").grid).toEqual([["Câu hỏi", "Đáp án"], ["x", "y"]]);
    expect(parseCsv("sep=,\r\na,b\r\n1,2").grid).toEqual([["a", "b"], ["1", "2"]]);
  });

  it("giữ nguyên chữ tiếng Việt có dấu (dựng sẵn và tổ hợp) và ô rỗng", () => {
    const composed = "Hà Nội";
    // Dấu tổ hợp dựng từ mã ký tự (U+0300 dấu huyền, U+0302 mũ, U+0323 nặng) để mã nguồn không chứa ký tự vô hình.
    const decomposed = `Ha${String.fromCharCode(0x300)} No${String.fromCharCode(0x302)}${String.fromCharCode(0x323)}i`;
    const { grid } = parseCsv(`${composed},,${decomposed}`);
    expect(grid[0][0]).toBe(composed);
    expect(grid[0][1]).toBe("");
    expect(grid[0][2]).toBe(decomposed); // chuẩn hoá NFC làm ở bước dựng câu hỏi, không phải ở đây
  });

  it("phát hiện chữ lỗi mã hoá (CSV không lưu ở dạng UTF-8)", () => {
    expect(parseCsv("Câu h�i,A").encodingSuspect).toBe(true);
    expect(parseCsv("Câu hỏi,A").encodingSuspect).toBe(false);
  });

  it("giới hạn số hàng đọc và báo số hàng bị bỏ", () => {
    const text = Array.from({ length: IMPORT_MAX_ROWS + 50 }, (_, i) => `r${i},x`).join("\n");
    const result = parseCsv(text);
    expect(result.grid).toHaveLength(IMPORT_MAX_ROWS + 1);
    expect(result.truncated).toBe(49);
  });

  it("giới hạn kích thước tệp", () => {
    expect(tooLarge(IMPORT_MAX_BYTES)).toBe(false);
    expect(tooLarge(IMPORT_MAX_BYTES + 1)).toBe(true);
  });
});
