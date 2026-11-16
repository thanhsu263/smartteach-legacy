import { normalizeText } from "@/lib/catalog";
/** Only explicit material searches get hard filters; general how-to questions keep guide sources. */
export function retrievalFilters(question: string) {
  const text = normalizeText(question);
  if (!/\b(tim|hoc lieu|giao trinh|tai lieu|can quiz|co quiz)\b/.test(text))
    return { subject: null, grade: null };
  const grade =
    /\b(?:lop|khoi)\s*(1[012]|[1-9])\b/.exec(text)?.[1] ??
    (/\bdai hoc\b/.test(text) ? "dai-hoc" : null);
  const subjects = [
    ["toan", /\btoan\b/],
    ["ngu-van", /\bngu van\b/],
    ["tieng-anh", /\btieng anh\b/],
    ["khoa-hoc-tu-nhien", /\b(khoa hoc tu nhien|khtn)\b/],
    ["lich-su-dia-li", /\b(lich su|dia li)\b/],
    ["tin-hoc", /\btin hoc\b/],
  ] as const;
  let subject: string | null =
    subjects.find(([, pattern]) => pattern.test(text))?.[0] ?? null;
  if (
    subject === "lich-su-dia-li" &&
    /\b(chat|hoi thoai|tro chuyen)\b/.test(text)
  )
    subject = null;
  return { subject, grade };
}
