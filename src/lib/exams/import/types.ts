import type { ExamForm } from "../types";
export type SourceText = { text: string; locator: { page?: number; paragraph?: number; row?: number; sheet?: string } };
export type ImportIssue = { severity: "error" | "warning"; message: string; locator: SourceText["locator"]; fixable?: boolean };
export type ExamParse = { form: ExamForm; issues: ImportIssue[] };
export const MAX_EXAM_FILE_BYTES = 2 * 1024 * 1024;
export const TEMPLATE_COLUMNS = ["section", "kind", "prompt", "option_a", "option_b", "option_c", "option_d", "option_e", "option_f", "correct", "accepted_answers", "ignore_diacritics", "points"];
