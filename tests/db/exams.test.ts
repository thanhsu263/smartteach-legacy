import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { admin, anon, cleanupUsers, signUp, type TestUser } from "./helpers";
import { emptyExam, emptyQuestion } from "../../src/lib/exams/types";
import { localSql, seedAdmin } from "./admin-fixtures";
let teacher: TestUser, other: TestUser, root: TestUser, blocked: TestUser;
beforeAll(async () => { teacher = await signUp("exam-free-a"); other = await signUp("exam-free-b"); root = await signUp("exam-admin"); blocked = await signUp("exam-blocked"); seedAdmin(root); localSql(`insert into private.account_controls(user_id,status) values('${blocked.id}','blocked') on conflict(user_id) do update set status='blocked';`); });
afterAll(cleanupUsers);
describe("Free private exam documents", () => {
  it("lưu incomplete, retry, revisions, owner boundaries", async () => {
    const form = emptyExam(); form.title = "Đề nháp Free";
    form.document.sections = [{ id: crypto.randomUUID(), title: "I", questions: [emptyQuestion("short_text")] }];
    const args = { p_exam: null, p_revision: null, p_request: crypto.randomUUID(), p_title: form.title, p_description: "", p_document: form.document };
    const saved = await teacher.client.rpc("save_exam", args);
    expect(saved.error).toBeNull(); expect(saved.data.revision).toBe(1);
    expect((await teacher.client.rpc("save_exam", args)).data.id).toBe(saved.data.id);
    expect((await teacher.client.rpc("save_exam", { ...args, p_title: "Đổi nội dung" })).error?.code).toBe("PT409");
    expect((await teacher.client.rpc("save_exam", { ...args, p_exam: saved.data.id, p_revision: 1, p_title: "Đề đã đổi" })).data.revision).toBe(2);
    expect((await teacher.client.rpc("save_exam", { ...args, p_exam: saved.data.id, p_revision: 1 })).error?.code).toBe("PT409");
    expect((await other.client.rpc("exam_detail", { p_exam: saved.data.id })).error?.code).toBe("PT404");
    expect((await anon.rpc("exam_detail", { p_exam: saved.data.id })).error).not.toBeNull();
    expect((await root.client.rpc("exam_detail", { p_exam: saved.data.id })).error?.code).toBe("PT404");
    expect((await root.client.rpc("delete_exam", { p_exam: saved.data.id, p_revision: 2 })).error?.code).toBe("PT404");
    expect((await blocked.client.rpc("exam_list")).error).not.toBeNull();
    expect((await blocked.client.rpc("save_exam", args)).error).not.toBeNull();
    expect((await teacher.client.from("exams").select("*")).error?.code).toBe("42501");
    expect((await admin.from("exams").select("id").eq("id", saved.data.id)).data).toHaveLength(1);
  });
  it("SQL không tin validator client", async () => {
    const form = emptyExam(); const q = emptyQuestion("single"); q.pointUnits = -100;
    form.document.sections = [{ id: crypto.randomUUID(), title: "I", questions: [q] }];
    const result = await teacher.client.rpc("save_exam", { p_exam: null, p_revision: null, p_request: crypto.randomUUID(), p_title: "Đề sai", p_description: "", p_document: form.document });
    expect(result.error?.code).toBe("PT400");
    expect((await teacher.client.rpc("exam_list")).data.items).toHaveLength(1);
  });
  it("giới hạn 50 đề vẫn nguyên tử khi ba request tranh chỗ cuối", async () => {
    const form = emptyExam(); form.title = "Đề kiểm tra giới hạn";
    const save = () => other.client.rpc("save_exam", { p_exam: null, p_revision: null, p_request: crypto.randomUUID(), p_title: form.title, p_description: "", p_document: form.document });
    for (let i = 0; i < 49; i++) expect((await save()).error).toBeNull();
    const race = await Promise.all([save(), save(), save()]);
    expect(race.filter(r => !r.error)).toHaveLength(1);
    expect(race.filter(r => r.error?.code === "PT413")).toHaveLength(2);
    expect((await other.client.rpc("exam_list")).data.total).toBe(50);
  });
});
