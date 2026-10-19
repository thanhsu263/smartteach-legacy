export type SplitMode = "groups" | "size";

export type SplitError = "no-names" | "invalid-number" | "too-many-groups";

export type SplitResult =
  | { ok: true; groups: string[][] }
  | { ok: false; error: SplitError };

/** Xáo trộn Fisher-Yates, không sửa mảng gốc. */
export function shuffle<T>(items: readonly T[], random: () => number = Math.random): T[] {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const other = Math.min(index, Math.floor(random() * (index + 1)));
    [result[index], result[other]] = [result[other], result[index]];
  }
  return result;
}

/**
 * Chia danh sách thành các nhóm chênh nhau tối đa 1 người.
 * - mode "groups": `value` là số nhóm.
 * - mode "size": `value` là số người tối đa mỗi nhóm; số nhóm là phần nguyên trên của tổng chia `value`.
 */
export function splitIntoGroups(
  names: readonly string[],
  mode: SplitMode,
  value: number,
  random: () => number = Math.random,
): SplitResult {
  if (names.length === 0) return { ok: false, error: "no-names" };
  if (!Number.isInteger(value) || value < 1) return { ok: false, error: "invalid-number" };

  const groupCount = mode === "groups" ? value : Math.ceil(names.length / value);
  if (groupCount > names.length) return { ok: false, error: "too-many-groups" };

  const shuffled = shuffle(names, random);
  const base = Math.floor(shuffled.length / groupCount);
  const extra = shuffled.length % groupCount;

  const groups: string[][] = [];
  let cursor = 0;
  for (let index = 0; index < groupCount; index += 1) {
    const size = base + (index < extra ? 1 : 0);
    groups.push(shuffled.slice(cursor, cursor + size));
    cursor += size;
  }
  return { ok: true, groups };
}
