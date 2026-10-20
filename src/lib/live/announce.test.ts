import { describe, expect, it } from "vitest";
import { playerAnnouncement } from "./announce";
import type { ChestView, PlayerState } from "./types";

const base: PlayerState = {
  session_id: "s",
  phase: "reveal",
  seq: 1,
  server_now: "2026-01-01T00:00:00Z",
  nickname: "An",
  score: 3000,
  question_total: 5,
  question_index: 3,
  answered: true,
  is_correct: true,
};
const opened: ChestView = { status: "opened", kind: "win", label: "Nhân đôi điểm", op: "mul", operand: 2, before: 3000, after: 6000, auto: false };

describe("câu cho vùng đọc cố định của học sinh", () => {
  it("không có kho báu thì giữ nguyên câu cũ", () => {
    expect(playerAnnouncement(null)).toBe("");
    expect(playerAnnouncement(base)).toBe("Bạn trả lời đúng.");
    expect(playerAnnouncement({ ...base, is_correct: false })).toBe("Bạn trả lời chưa đúng.");
    expect(playerAnnouncement({ ...base, answered: false })).toBe("Bạn chưa trả lời câu này.");
    expect(playerAnnouncement({ ...base, phase: "ended" })).toBe("Trò chơi đã kết thúc.");
  });

  it("rương chưa mở được báo ngay ở pha hiện đáp án; mở xong báo hiệu ứng và điểm", () => {
    expect(playerAnnouncement({ ...base, chest: { status: "pending", kind: "win" } })).toBe(
      "Bạn trả lời đúng. Bạn nhận được một rương kho báu. Chọn một rương để mở.",
    );
    expect(playerAnnouncement({ ...base, chest: opened })).toBe("Bạn trả lời đúng. Rương: Nhân đôi điểm, 3000 thành 6000 điểm.");
  });

  it("rương tự mở ở câu kế được báo cùng đề câu; không có thì chỉ đề câu", () => {
    const question: PlayerState = { ...base, phase: "question", question: { kind: "single", prompt: "Câu bốn", time_limit_seconds: 20, options: [] } };
    expect(playerAnnouncement(question)).toBe("Câu 3 trên 5: Câu bốn");
    expect(playerAnnouncement({ ...question, last_chest: { ...opened, auto: true } })).toBe(
      "Câu 3 trên 5: Câu bốn. Rương câu trước đã tự mở: Nhân đôi điểm, 3000 thành 6000 điểm.",
    );
  });

  it("kết thúc: báo tổng thay đổi điểm do kho báu khi có mở rương, và im lặng về nó khi không", () => {
    expect(playerAnnouncement({ ...base, phase: "ended", treasure: { opened: 2, delta: 700 } })).toBe("Trò chơi đã kết thúc. Kho báu: +700 điểm.");
    expect(playerAnnouncement({ ...base, phase: "ended", treasure: { opened: 1, delta: -300 } })).toBe("Trò chơi đã kết thúc. Kho báu: -300 điểm.");
    expect(playerAnnouncement({ ...base, phase: "ended", treasure: { opened: 0, delta: 0 } })).toBe("Trò chơi đã kết thúc.");
  });
});
