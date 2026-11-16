export type Locator = { page?: number; paragraph?: number; question?: number };
export type TextSection = { text: string; locator: Locator };
export type TextChunk = { body: string; locator: Locator };
export function chunkSections(sections: TextSection[]): TextChunk[] {
  const result: TextChunk[] = [];
  for (const section of sections) {
    const text = section.text
      .replace(/\u0000/g, "")
      .replace(/[ \t]+/g, " ")
      .trim();
    let start = 0;
    while (start < text.length) {
      let end = Math.min(start + 1200, text.length);
      if (end < text.length) {
        const boundary = text.lastIndexOf(" ", end);
        if (boundary > start + 800) end = boundary;
      }
      // Do not split a surrogate pair at either edge.
      if (end < text.length && /[\uD800-\uDBFF]/.test(text[end - 1])) end--;
      const body = text.slice(start, end).trim();
      if (body) result.push({ body, locator: section.locator });
      if (end === text.length) break;
      start = end - 150;
      if (/[\uDC00-\uDFFF]/.test(text[start])) start++;
    }
  }
  if (result.length > 2000) throw new Error("too_many_chunks");
  return result;
}
