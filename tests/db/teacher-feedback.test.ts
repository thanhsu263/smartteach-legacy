import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { admin, anon, cleanupUsers, signUp, type TestUser } from "./helpers";
import { seedAdmin } from "./admin-fixtures";
let teacher: TestUser, other: TestUser, root: TestUser;
beforeAll(async () => { teacher = await signUp("feedback-a"); other = await signUp("feedback-b"); root = await signUp("feedback-admin"); seedAdmin(root); });
afterAll(cleanupUsers);
describe("teacher feedback boundary", () => {
  it("owner history, admin triage, retries and conflict", async () => {
    const request = crypto.randomUUID();
    const body = { p_request: request, p_kind: "bug", p_body: "Không lưu được câu hỏi thử nghiệm", p_path: null };
    const first = await teacher.client.rpc("submit_teacher_feedback", body);
    expect(first.error).toBeNull();
    expect((await teacher.client.rpc("submit_teacher_feedback", body)).data).toEqual(first.data);
    expect((await teacher.client.rpc("submit_teacher_feedback", { ...body, p_body: "Nội dung thay đổi, cùng request" })).error?.code).toBe("PT409");
    expect((await other.client.rpc("teacher_feedback_list")).data.items).toEqual([]);
    expect((await other.client.rpc("teacher_feedback_list", { p_admin: true })).error?.code).toBe("42501");
    const own = await teacher.client.rpc("teacher_feedback_list");
    expect(own.data.items).toHaveLength(1);
    const listing = await root.client.rpc("teacher_feedback_list", { p_admin: true });
    expect(listing.error).toBeNull(); expect(listing.data.items.some((r: { id: string }) => r.id === first.data.id)).toBe(true);
    expect((await root.client.rpc("admin_feedback_status", { p_id: first.data.id, p_status: "in_progress", p_version: 1 })).error).toBeNull();
    expect((await root.client.rpc("admin_feedback_status", { p_id: first.data.id, p_status: "resolved", p_version: 1 })).error?.code).toBe("PT409");
    expect((await root.client.rpc("admin_feedback_status", { p_id: first.data.id, p_status: "resolved", p_version: 2 })).error).toBeNull();
    expect((await teacher.client.rpc("admin_feedback_status", { p_id: first.data.id, p_status: "new", p_version: 3 })).error?.code).toBe("42501");
  });
  it("tables denied, bounds and atomic rate limit", async () => {
    for (const client of [teacher.client, other.client, root.client, anon]) expect((await client.from("teacher_feedback").select("*")).error?.code).toBe("42501");
    expect((await anon.rpc("teacher_feedback_list")).error).not.toBeNull();
    for (const p_body of ["short", "a".repeat(2001)]) expect((await other.client.rpc("submit_teacher_feedback", { p_request: crypto.randomUUID(), p_kind: "bug", p_body })).error?.code).toBe("PT400");
    const results = await Promise.all(Array.from({ length: 8 }, () => other.client.rpc("submit_teacher_feedback", { p_request: crypto.randomUUID(), p_kind: "suggestion", p_body: "Đề xuất có đủ nội dung" })));
    expect(results.filter(r => !r.error)).toHaveLength(5);
    expect(results.filter(r => r.error?.code === "PT429")).toHaveLength(3);
    // The application role still cannot grant itself access to private classroom data.
    expect((await root.client.from("quizzes").select("id").eq("owner_id", teacher.id)).data ?? []).toHaveLength(0);
    expect(admin).toBeTruthy();
  });
});
