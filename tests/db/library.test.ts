import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { admin, anon, buildQuiz, cleanupUsers, signUp, simpleQuestion, type TestUser } from "./helpers";

let owner: TestUser;
let other: TestUser;
let publicationId = "";

beforeAll(async () => {
  owner = await signUp("library-owner");
  other = await signUp("library-other");
  const quizId = await buildQuiz(owner.client, "Quiz thư viện", [simpleQuestion("Câu snapshot")]);
  const submitted = await owner.client.rpc("submit_quiz_publication", { p_quiz_id: quizId, p_title: "Học liệu Toán", p_description: "Mô tả", p_subject: "toan", p_grades: ["6"] });
  expect(submitted.error).toBeNull();
  publicationId = submitted.data as string;
});
afterAll(cleanupUsers);

describe("library publication boundary", () => {
  it("pending không public; chỉ service role duyệt được", async () => {
    expect((await anon.rpc("library_browse", { p_query: "", p_subject: null, p_grade: null, p_limit: 24, p_offset: 0 })).data).toMatchObject({ items: [], total: 0 });
    expect((await owner.client.rpc("moderate_quiz_publication", { p_publication: publicationId, p_status: "approved", p_reason: null })).error?.code).toBe("42501");
    expect((await admin.rpc("moderate_quiz_publication", { p_publication: publicationId, p_status: "approved", p_reason: null })).error).toBeNull();
  });

  it("browse/preview approved không lộ đáp án", async () => {
    const browse = await anon.rpc("library_browse", { p_query: "học liệu", p_subject: "toan", p_grade: "6", p_limit: 24, p_offset: 0 });
    expect(browse.error).toBeNull();
    expect(JSON.stringify(browse.data)).toContain("Học liệu Toán");
    const preview = await anon.rpc("library_preview", { p_publication: publicationId });
    expect(preview.error).toBeNull();
    expect(JSON.stringify(preview.data)).not.toContain("is_correct");
    expect(JSON.stringify(preview.data)).not.toContain("accepted_answers");
  });

  it("report của giáo viên được idempotent và anon không được gọi", async () => {
    expect((await anon.rpc("report_publication", { p_publication: publicationId, p_reason: "inaccurate", p_note: "x" })).error?.code).toBe("42501");
    await other.client.rpc("report_publication", { p_publication: publicationId, p_reason: "inaccurate", p_note: "Nội dung cần xem lại" });
    await other.client.rpc("report_publication", { p_publication: publicationId, p_reason: "inaccurate", p_note: "Lặp lại" });
    const reports = await admin.from("publication_reports").select("id", { count: "exact", head: true }).eq("publication_id", publicationId).eq("reporter_id", other.id);
    expect(reports.count).toBe(1);
  });

  it("owner chỉ chỉnh publication chưa review rồi có thể gửi duyệt lại", async () => {
    const quizId = await buildQuiz(owner.client, "Quiz gửi lại", [simpleQuestion("Câu gửi lại")]);
    const created = await owner.client.rpc("submit_quiz_publication", { p_quiz_id: quizId, p_title: "Bản gửi lại", p_description: "", p_subject: "toan", p_grades: ["7"] });
    const id = created.data as string;
    expect((await admin.rpc("moderate_quiz_publication", { p_publication: id, p_status: "rejected", p_reason: "Cần rõ hơn" })).error).toBeNull();
    expect((await owner.client.rpc("update_quiz_publication", { p_publication: id, p_title: "Bản đã sửa", p_description: "Rõ hơn", p_subject: "toan", p_grades: ["7"] })).error).toBeNull();
    expect((await owner.client.rpc("resubmit_quiz_publication", { p_publication: id })).error).toBeNull();
    expect((await other.client.rpc("resubmit_quiz_publication", { p_publication: id })).error?.code).toBe("PT404");
  });

  it("clone tạo quiz riêng, còn hide loại ngay publication khỏi public", async () => {
    const clone = await other.client.rpc("clone_library_publication", { p_publication: publicationId });
    expect(clone.error).toBeNull();
    const questions = await other.client.from("questions").select("prompt, options(label,is_correct)").eq("quiz_id", clone.data as string);
    expect(questions.error).toBeNull();
    expect(questions.data?.[0].prompt).toBe("Câu snapshot");
    expect((questions.data?.[0].options as { is_correct: boolean }[])[0].is_correct).toBe(true);
    expect((await admin.rpc("moderate_quiz_publication", { p_publication: publicationId, p_status: "hidden", p_reason: "test" })).error).toBeNull();
    expect((await anon.rpc("library_preview", { p_publication: publicationId })).data).toBeNull();
  });
});
