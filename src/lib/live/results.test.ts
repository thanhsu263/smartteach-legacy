import { describe, expect, it } from "vitest";
import { buildMatrix, correctRate, describeCell, formatDateTime, formatSeconds, type HostResults } from "./results";

const base: Pick<HostResults, "ranking" | "answers" | "question_total"> = {
  question_total: 3,
  ranking: [
    { id: "p1", nickname: "Lan", score: 2000, rank: 1, removed: false, left: false, answered: 2, correct: 2, avg_response_ms: 1200 },
    { id: "p2", nickname: "Huy", score: 0, rank: 2, removed: false, left: false, answered: 1, correct: 0, avg_response_ms: 3000 },
  ],
  answers: [
    { player: "p1", q: 1, answer: 0, ok: true, points: 1000, ms: 900 },
    { player: "p1", q: 3, answer: 1, ok: true, points: 1000, ms: 1500 },
    { player: "p2", q: 1, answer: 2, ok: false, points: 0, ms: 3000 },
  ],
};

describe("kết quả sau buổi chơi", () => {
  it("ma trận người chơi x câu: đúng, sai, bỏ trống đúng chỗ, giữ thứ tự xếp hạng", () => {
    const matrix = buildMatrix(base);
    expect(matrix.map((row) => row.player.nickname)).toEqual(["Lan", "Huy"]);
    expect(matrix[0].cells).toEqual([
      { status: "correct", points: 1000 },
      { status: "none", points: 0 },
      { status: "correct", points: 1000 },
    ]);
    expect(matrix[1].cells).toEqual([
      { status: "wrong", points: 0 },
      { status: "none", points: 0 },
      { status: "none", points: 0 },
    ]);
  });

  it("mỗi ô đều có chữ mô tả, không chỉ màu", () => {
    expect(describeCell({ status: "correct", points: 1000 })).toBe("Đúng, 1000 điểm");
    expect(describeCell({ status: "wrong", points: 0 })).toBe("Sai");
    expect(describeCell({ status: "none", points: 0 })).toBe("Bỏ trống");
  });

  it("tỉ lệ đúng tính trong số người đã trả lời; chưa ai trả lời thì '-'", () => {
    expect(correctRate({ correct: 1, wrong: 2 })).toBe("33%");
    expect(correctRate({ correct: 3, wrong: 0 })).toBe("100%");
    expect(correctRate({ correct: 0, wrong: 0 })).toBe("-");
  });

  it("thời gian trả lời và ngày giờ", () => {
    expect(formatSeconds(3400)).toBe("3,4 giây");
    expect(formatSeconds(0)).toBe("0,0 giây");
    expect(formatSeconds(null)).toBe("-");
    expect(formatDateTime("2026-10-19T03:30:00Z")).toMatch(/10:30/);
    expect(formatDateTime("không phải giờ")).toBe("không phải giờ");
  });
});
