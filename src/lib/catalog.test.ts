import { describe, expect, it } from "vitest";
import { games } from "@/data/games";
import {
  GRADES,
  SUBJECTS,
  filterGames,
  findGame,
  gradeLabels,
  normalizeText,
  subjectLabels,
  type Game,
} from "@/lib/catalog";

function game(overrides: Partial<Game> & Pick<Game, "id">): Game {
  return {
    title: overrides.id,
    description: "",
    subjects: [],
    grades: [],
    embedUrl: "https://example.com/",
    ...overrides,
  };
}

const sample: Game[] = [
  game({ id: "a", title: "Đố vui Toán", subjects: ["toan"], grades: ["3", "4"], description: "Ôn phép nhân" }),
  game({ id: "b", title: "Ghép từ", subjects: ["ngu-van", "tieng-anh"], grades: ["6"] }),
  game({ id: "c", title: "Trò chơi chung" }),
];

describe("filterGames", () => {
  it("không có bộ lọc thì trả về tất cả", () => {
    expect(filterGames(sample, {}).map((g) => g.id)).toEqual(["a", "b", "c"]);
  });

  it("lọc theo môn, game không giới hạn môn luôn khớp", () => {
    expect(filterGames(sample, { subject: "toan" }).map((g) => g.id)).toEqual(["a", "c"]);
    expect(filterGames(sample, { subject: "tieng-anh" }).map((g) => g.id)).toEqual(["b", "c"]);
  });

  it("lọc theo lớp, game không giới hạn lớp luôn khớp", () => {
    expect(filterGames(sample, { grade: "4" }).map((g) => g.id)).toEqual(["a", "c"]);
    expect(filterGames(sample, { grade: "12" }).map((g) => g.id)).toEqual(["c"]);
  });

  it("kết hợp môn và lớp", () => {
    expect(filterGames(sample, { subject: "toan", grade: "6" }).map((g) => g.id)).toEqual(["c"]);
    expect(filterGames(sample, { subject: "ngu-van", grade: "6" }).map((g) => g.id)).toEqual(["b", "c"]);
  });

  it("tìm theo tên hoặc mô tả, không phân biệt dấu và hoa thường", () => {
    expect(filterGames(sample, { query: "do vui" }).map((g) => g.id)).toEqual(["a"]);
    expect(filterGames(sample, { query: "PHÉP NHÂN" }).map((g) => g.id)).toEqual(["a"]);
    expect(filterGames(sample, { query: "ghep tu" }).map((g) => g.id)).toEqual(["b"]);
  });

  it("chuỗi tìm chỉ có khoảng trắng coi như không tìm", () => {
    expect(filterGames(sample, { query: "   " })).toHaveLength(3);
  });

  it("không khớp thì trả về danh sách rỗng", () => {
    expect(filterGames(sample, { query: "không tồn tại" })).toEqual([]);
  });

  it("giá trị rỗng của môn và lớp nghĩa là không lọc", () => {
    expect(filterGames(sample, { subject: "", grade: "" })).toHaveLength(3);
  });
});

describe("normalizeText", () => {
  it("bỏ dấu tiếng Việt và đổi đ thành d", () => {
    expect(normalizeText("Đố vui Xì Trum")).toBe("do vui xi trum");
    expect(normalizeText("  Gọi TÊN  ")).toBe("goi ten");
  });
});

describe("findGame", () => {
  it("tìm theo id", () => {
    expect(findGame(sample, "b")?.title).toBe("Ghép từ");
    expect(findGame(sample, "zzz")).toBeUndefined();
  });
});

describe("nhãn", () => {
  it("game không giới hạn hiển thị Mọi môn và Mọi lớp", () => {
    expect(subjectLabels(sample[2])).toEqual(["Mọi môn"]);
    expect(gradeLabels(sample[2])).toEqual(["Mọi lớp"]);
  });

  it("đổi id sang nhãn tiếng Việt", () => {
    expect(subjectLabels(sample[1])).toEqual(["Ngữ văn", "Tiếng Anh"]);
    expect(gradeLabels(sample[0])).toEqual(["Lớp 3", "Lớp 4"]);
  });
});

describe("danh mục game thật", () => {
  it("có ít nhất một game", () => {
    expect(games.length).toBeGreaterThan(0);
  });

  it("id không trùng và dùng được trong đường dẫn", () => {
    const ids = games.map((g) => g.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  });

  it("mọi game có embedUrl https hợp lệ, tiêu đề và mô tả", () => {
    for (const g of games) {
      const url = new URL(g.embedUrl);
      expect(url.protocol, g.id).toBe("https:");
      expect(g.title.trim(), g.id).not.toBe("");
      expect(g.description.trim(), g.id).not.toBe("");
    }
  });

  it("môn và lớp của mọi game thuộc danh sách đã định nghĩa", () => {
    const subjectIds: string[] = SUBJECTS.map((s) => s.id);
    const gradeIds: string[] = GRADES.map((g) => g.id);
    for (const g of games) {
      for (const s of g.subjects) expect(subjectIds, g.id).toContain(s);
      for (const gr of g.grades) expect(gradeIds, g.id).toContain(gr);
    }
  });
});
