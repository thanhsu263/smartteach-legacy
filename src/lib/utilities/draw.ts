/** Mỗi dòng không rỗng là một tên. Tên trùng được giữ nguyên vì có thể là hai bạn khác nhau. */
export function parseNames(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line !== "");
}

/**
 * Chọn ngẫu nhiên một vị trí chưa nằm trong `taken`.
 * Trả về null khi không còn vị trí nào để chọn.
 */
export function pickIndex(
  total: number,
  taken: ReadonlySet<number>,
  random: () => number = Math.random,
): number | null {
  const available: number[] = [];
  for (let index = 0; index < total; index += 1) {
    if (!taken.has(index)) available.push(index);
  }
  if (available.length === 0) return null;
  const position = Math.min(available.length - 1, Math.floor(random() * available.length));
  return available[position];
}
