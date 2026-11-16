import type { HostResults } from "@/lib/live/results";
import type { AssignmentDetail, AssignmentRosterEntry } from "@/lib/assignments/types";
import { makeCsv } from "./csv";
export function liveResultsCsv(results: HostResults) {
  if (!results.ended_at) throw new Error("Chỉ xuất kết quả sau khi kết thúc phiên.");
  return makeCsv(["session_id", "quiz_title", "created_at", "ended_at", "question_total", "nickname", "rank", "status", "score", "answered", "correct"], results.ranking.map(p => [results.id, results.quiz_title, results.created_at, results.ended_at, results.question_total, p.nickname, p.rank, p.removed ? "removed" : p.left ? "left" : "active", p.score, p.answered, p.correct]));
}
type Points = { scorePoints?: number | null; maxPoints?: number | null };
export function assignmentResultsCsv(detail: AssignmentDetail, roster: (AssignmentRosterEntry & Points)[]) {
  return makeCsv(["assignment_id", "title", "class_name", "student_name", "status", "started_at", "submitted_at", "correct", "total", "score_points", "max_points", "legacy_score"], roster.map(r => {
    const submitted = r.attemptStatus === "submitted";
    return [detail.id, detail.title, detail.className, r.name, r.attemptStatus ?? "not_started", r.startedAt, r.submittedAt, submitted ? r.correct : null, submitted ? r.total : null, submitted ? r.scorePoints : null, r.maxPoints, submitted && r.maxPoints === undefined ? r.score : null];
  }));
}
