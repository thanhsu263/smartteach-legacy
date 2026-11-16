import { it, expect } from "vitest";
import { retrievalFilters } from "./retrieval-filters";
it("filters explicit Vietnamese material searches without turning how-to requests into subject-only search", () => {
  expect(retrievalFilters("Tìm học liệu Toán lớp 6")).toEqual({
    subject: "toan",
    grade: "6",
  });
  expect(retrievalFilters("Tôi cần quiz khoa học tự nhiên lớp 6")).toEqual({
    subject: "khoa-hoc-tu-nhien",
    grade: "6",
  });
  expect(retrievalFilters("Tìm Ngữ văn khối 12")).toEqual({
    subject: "ngu-van",
    grade: "12",
  });
  expect(retrievalFilters("Tìm tài liệu Tin học lớp 16").grade).toBeNull();
  expect(retrievalFilters("Hướng dẫn tạo quiz Toán lớp 6")).toEqual({
    subject: null,
    grade: null,
  });
  expect(retrievalFilters("Tìm lịch sử hội thoại").subject).toBeNull();
});
