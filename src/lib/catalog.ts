export const SUBJECTS = [
  { id: "toan", label: "Toán" },
  { id: "ngu-van", label: "Ngữ văn" },
  { id: "tieng-anh", label: "Tiếng Anh" },
  { id: "khoa-hoc-tu-nhien", label: "Khoa học tự nhiên" },
  { id: "lich-su-dia-li", label: "Lịch sử và Địa lí" },
  { id: "tin-hoc", label: "Tin học" },
] as const;

export const GRADES = [
  { id: "1", label: "Lớp 1" },
  { id: "2", label: "Lớp 2" },
  { id: "3", label: "Lớp 3" },
  { id: "4", label: "Lớp 4" },
  { id: "5", label: "Lớp 5" },
  { id: "6", label: "Lớp 6" },
  { id: "7", label: "Lớp 7" },
  { id: "8", label: "Lớp 8" },
  { id: "9", label: "Lớp 9" },
  { id: "10", label: "Lớp 10" },
  { id: "11", label: "Lớp 11" },
  { id: "12", label: "Lớp 12" },
  { id: "dai-hoc", label: "Đại học" },
] as const;

export type SubjectId = (typeof SUBJECTS)[number]["id"];
export type GradeId = (typeof GRADES)[number]["id"];

export type Game = {
  id: string;
  title: string;
  description: string;
  /** Rỗng nghĩa là dùng được cho mọi môn. */
  subjects: readonly SubjectId[];
  /** Rỗng nghĩa là dùng được cho mọi lớp. */
  grades: readonly GradeId[];
  /** Địa chỉ trang game, nhúng bằng iframe. */
  embedUrl: string;
  /** Ghi nguồn bản quyền hiển thị dưới khung game. */
  credits?: string;
  /** Hiện ở khu "Trò chơi nổi bật" trên trang chủ. */
  featured?: boolean;
};

export type GameFilter = {
  subject?: SubjectId | "";
  grade?: GradeId | "";
  query?: string;
};

/** Bỏ dấu và hạ chữ thường để tìm kiếm tiếng Việt không phân biệt dấu. */
export function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/đ/g, "d")
    .trim();
}

export function filterGames(games: readonly Game[], filter: GameFilter): Game[] {
  const query = normalizeText(filter.query ?? "");
  return games.filter((game) => {
    if (filter.subject && game.subjects.length > 0 && !game.subjects.includes(filter.subject)) {
      return false;
    }
    if (filter.grade && game.grades.length > 0 && !game.grades.includes(filter.grade)) {
      return false;
    }
    if (query) {
      const haystack = normalizeText(`${game.title} ${game.description}`);
      if (!haystack.includes(query)) return false;
    }
    return true;
  });
}

export function findGame(games: readonly Game[], id: string): Game | undefined {
  return games.find((game) => game.id === id);
}

function labelsFor<T extends { id: string; label: string }>(
  all: readonly T[],
  ids: readonly string[],
): string[] {
  return ids.map((id) => all.find((item) => item.id === id)?.label ?? id);
}

export function subjectLabels(game: Game): string[] {
  return game.subjects.length === 0 ? ["Mọi môn"] : labelsFor(SUBJECTS, game.subjects);
}

export function gradeLabels(game: Game): string[] {
  return game.grades.length === 0 ? ["Mọi lớp"] : labelsFor(GRADES, game.grades);
}
