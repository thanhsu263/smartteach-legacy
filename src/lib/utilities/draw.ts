/** Mỗi dòng không rỗng là một tên. Tên trùng được giữ nguyên vì có thể là hai bạn khác nhau. */
export function parseNames(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line !== "");
}

/**
 * Số người chưa được bốc. Lịch sử `taken` có thể chứa cùng một vị trí nhiều lần
 * (khi cho phép bốc lại), nên chỉ đếm các vị trí khác nhau và còn nằm trong danh sách.
 */
export function remainingCount(total: number, taken: readonly number[]): number {
  const distinct = new Set(taken.filter((index) => index >= 0 && index < total));
  return Math.max(0, total - distinct.size);
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
