import "server-only";
import { AppError } from "@/lib/admin/http";
import { examIssues } from "./validation";
import type { ExamForm } from "./types";
export function examForm(value: unknown, complete = false): ExamForm {
  const issues = examIssues(value, complete);
  if (issues.length) throw new AppError(400, "exam_invalid", issues.slice(0, 3).map(i => `${i.path}: ${i.message}`).join(" "));
  return value as ExamForm;
}
