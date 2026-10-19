import { describe, expect, it } from "vitest";
import {
  MAX_MINUTES,
  createTimer,
  durationFrom,
  formatTime,
  pauseTimer,
  resetTimer,
  startTimer,
  tickTimer,
} from "@/lib/utilities/countdown";
import { parseNames, pickIndex } from "@/lib/utilities/draw";
import { shuffle, splitIntoGroups } from "@/lib/utilities/groups";

/** Bộ sinh số giả cho kết quả lặp lại được (LCG). */
function seeded(seed: number) {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

describe("parseNames", () => {
  it("bỏ dòng trống, cắt khoảng trắng và xử lý xuống dòng kiểu Windows", () => {
    expect(parseNames("  An \r\n\r\n Bình\n   \nChi  ")).toEqual(["An", "Bình", "Chi"]);
  });

  it("giữ tên trùng vì có thể là hai bạn khác nhau", () => {
    expect(parseNames("Anh\nAnh\nMai")).toEqual(["Anh", "Anh", "Mai"]);
  });

  it("chuỗi rỗng cho danh sách rỗng", () => {
    expect(parseNames("")).toEqual([]);
    expect(parseNames("  \n \n")).toEqual([]);
  });
});

describe("pickIndex", () => {
  it("không chọn vị trí đã bốc khi truyền vào taken", () => {
    const taken = new Set<number>();
    const picked: number[] = [];
    const random = seeded(7);
    for (let i = 0; i < 6; i += 1) {
      const index = pickIndex(6, taken, random);
      expect(index).not.toBeNull();
      picked.push(index as number);
      taken.add(index as number);
    }
    expect([...picked].sort()).toEqual([0, 1, 2, 3, 4, 5]);
  });

  it("trả về null khi đã bốc hết hoặc danh sách rỗng", () => {
    expect(pickIndex(3, new Set([0, 1, 2]))).toBeNull();
    expect(pickIndex(0, new Set())).toBeNull();
  });

  it("vẫn chọn được khi bộ sinh số trả về sát 1", () => {
    expect(pickIndex(4, new Set(), () => 0.9999999)).toBe(3);
    expect(pickIndex(4, new Set(), () => 0)).toBe(0);
  });

  it("cho phép bốc lại người cũ khi taken rỗng", () => {
    const first = pickIndex(2, new Set(), () => 0);
    const second = pickIndex(2, new Set(), () => 0);
    expect(first).toBe(second);
  });
});

describe("shuffle", () => {
  it("giữ nguyên các phần tử và không sửa mảng gốc", () => {
    const original = [1, 2, 3, 4, 5, 6];
    const result = shuffle(original, seeded(3));
    expect([...result].sort()).toEqual([1, 2, 3, 4, 5, 6]);
    expect(original).toEqual([1, 2, 3, 4, 5, 6]);
  });
});

describe("splitIntoGroups", () => {
  const names = Array.from({ length: 11 }, (_, i) => `HS${i + 1}`);

  function check(groups: string[][], expectedTotal: number) {
    const flat = groups.flat();
    expect(flat).toHaveLength(expectedTotal);
    expect(new Set(flat).size).toBe(flat.length);
    const sizes = groups.map((g) => g.length);
    expect(Math.max(...sizes) - Math.min(...sizes)).toBeLessThanOrEqual(1);
  }

  it("chia theo số nhóm: đủ người, không ai ở hai nhóm, chênh tối đa 1", () => {
    for (const count of [1, 2, 3, 4, 5, 11]) {
      const result = splitIntoGroups(names, "groups", count, seeded(count));
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.groups).toHaveLength(count);
        check(result.groups, names.length);
      }
    }
  });

  it("chia theo số người mỗi nhóm: không nhóm nào vượt quá giới hạn", () => {
    for (const size of [1, 2, 3, 4, 5, 10, 11, 20]) {
      const result = splitIntoGroups(names, "size", size, seeded(size));
      expect(result.ok).toBe(true);
      if (result.ok) {
        check(result.groups, names.length);
        for (const group of result.groups) expect(group.length).toBeLessThanOrEqual(size);
      }
    }
  });

  it("11 người chia 3 nhóm cho 4-4-3", () => {
    const result = splitIntoGroups(names, "groups", 3, seeded(1));
    expect(result.ok && result.groups.map((g) => g.length)).toEqual([4, 4, 3]);
  });

  it("trả về lỗi cho đầu vào không hợp lệ", () => {
    expect(splitIntoGroups([], "groups", 2)).toEqual({ ok: false, error: "no-names" });
    expect(splitIntoGroups(names, "groups", 0)).toEqual({ ok: false, error: "invalid-number" });
    expect(splitIntoGroups(names, "groups", -2)).toEqual({ ok: false, error: "invalid-number" });
    expect(splitIntoGroups(names, "groups", 2.5)).toEqual({ ok: false, error: "invalid-number" });
    expect(splitIntoGroups(names, "size", Number.NaN)).toEqual({ ok: false, error: "invalid-number" });
    expect(splitIntoGroups(names, "groups", 12)).toEqual({ ok: false, error: "too-many-groups" });
  });

  it("chia lại cho kết quả khác khi bộ sinh số khác", () => {
    const a = splitIntoGroups(names, "groups", 3, seeded(1));
    const b = splitIntoGroups(names, "groups", 3, seeded(2));
    expect(a.ok && b.ok && JSON.stringify(a.groups) !== JSON.stringify(b.groups)).toBe(true);
  });
});

describe("đồng hồ đếm ngược", () => {
  it("durationFrom đổi phút và giây, từ chối giá trị sai", () => {
    expect(durationFrom(5, 0)).toBe(300_000);
    expect(durationFrom(0, 45)).toBe(45_000);
    expect(durationFrom(MAX_MINUTES, 59)).toBe((MAX_MINUTES * 60 + 59) * 1000);
    expect(durationFrom(0, 0)).toBe(0);
    expect(durationFrom(-1, 0)).toBe(0);
    expect(durationFrom(1, 60)).toBe(0);
    expect(durationFrom(MAX_MINUTES + 1, 0)).toBe(0);
    expect(durationFrom(1.5, 0)).toBe(0);
    expect(durationFrom(Number.NaN, 0)).toBe(0);
  });

  it("formatTime làm tròn lên và chèn số 0", () => {
    expect(formatTime(300_000)).toBe("05:00");
    expect(formatTime(59_001)).toBe("01:00");
    expect(formatTime(1)).toBe("00:01");
    expect(formatTime(0)).toBe("00:00");
    expect(formatTime(-500)).toBe("00:00");
  });

  it("chạy, tạm dừng và chạy tiếp giữ đúng thời gian còn lại", () => {
    let state = startTimer(createTimer(60_000), 1_000);
    expect(state.status).toBe("running");
    state = tickTimer(state, 11_000);
    expect(state.remainingMs).toBe(50_000);
    state = pauseTimer(state, 21_000);
    expect(state.status).toBe("paused");
    expect(state.remainingMs).toBe(40_000);
    // Thời gian trôi qua khi đang tạm dừng không làm mất giây nào.
    state = startTimer(state, 100_000);
    state = tickTimer(state, 110_000);
    expect(state.remainingMs).toBe(30_000);
  });

  it("kết thúc đúng lúc và không giảm xuống dưới 0", () => {
    let state = startTimer(createTimer(3_000), 0);
    state = tickTimer(state, 2_999);
    expect(state.status).toBe("running");
    state = tickTimer(state, 5_000);
    expect(state.status).toBe("finished");
    expect(state.remainingMs).toBe(0);
  });

  it("bắt đầu lại sau khi hết giờ chạy lại từ đầu", () => {
    const finished = tickTimer(startTimer(createTimer(2_000), 0), 9_000);
    const restarted = startTimer(finished, 10_000);
    expect(restarted.status).toBe("running");
    expect(restarted.remainingMs).toBe(2_000);
  });

  it("không bắt đầu khi thời lượng bằng 0, đặt lại về thời lượng đã chọn", () => {
    expect(startTimer(createTimer(0), 0).status).toBe("idle");
    const state = resetTimer(tickTimer(startTimer(createTimer(5_000), 0), 2_000));
    expect(state).toEqual(createTimer(5_000));
  });

  it("tick và pause khi không chạy thì không đổi gì", () => {
    const idle = createTimer(5_000);
    expect(tickTimer(idle, 10)).toBe(idle);
    expect(pauseTimer(idle, 10)).toBe(idle);
  });
});
