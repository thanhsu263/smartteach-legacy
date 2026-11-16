import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { admin, anon, buildQuiz, cleanupUsers, signUp, simpleQuestion, type TestUser } from "./helpers";

type Order = { id: string; order_code: number; amount: number; user_id: string; status: string };
let a: TestUser, b: TestUser;
let classId: string, quizId: string;

async function order(user: TestUser, plan = "premium_monthly") {
  const result = await user.client.rpc("prepare_membership_checkout", { p_plan: plan });
  expect(result.error).toBeNull(); return result.data as Order;
}
async function settle(item: Order, link = `test-${item.id}`) {
  return admin.rpc("settle_membership_payment", { p_order_code: item.order_code, p_payment_link_id: link, p_amount: item.amount });
}

beforeAll(async () => {
  a = await signUp("membership-a"); b = await signUp("membership-b");
  const klass = await a.client.rpc("create_class_with_students", { class_name: "Lớp thành viên", student_names: ["An"] });
  expect(klass.error).toBeNull(); classId = klass.data as string;
  quizId = await buildQuiz(a.client, "Quiz Free vẫn dùng", [simpleQuestion()]);
}, 60_000);
afterAll(cleanupUsers);

describe("membership money and permission boundaries", () => {
  it("Free vẫn soạn quiz nhưng không tạo đề; client không tự cấp Premium hoặc xác nhận tiền", async () => {
    expect((await a.client.rpc("membership_status")).data).toEqual({ active: false, premiumUntil: null });
    const create = await a.client.rpc("create_assignment", { p_class_id: classId, p_quiz_id: quizId, p_title: "Đề cần Premium" });
    expect(create.error?.code).toBe("PT402");
    expect((await a.client.from("membership_entitlements").upsert({ user_id: a.id, premium_until: "2030-01-01T00:00:00Z" })).error?.code).toBe("42501");
    expect((await a.client.rpc("settle_membership_payment", { p_order_code: 123, p_payment_link_id: "forged", p_amount: 50000 })).error?.code).toBe("42501");
    expect((await anon.rpc("prepare_membership_checkout", { p_plan: "premium_monthly" })).error?.code).toBe("42501");
    expect((await anon.from("membership_orders").select("*")).error?.code).toBe("42501");
  });

  it("giá cố định, từ chối plan lạ, tạo đồng thời dùng chung một đơn chờ và chỉ chủ đơn đọc được", async () => {
    expect((await a.client.rpc("prepare_membership_checkout", { p_plan: "premium_1vnd" })).error?.code).toBe("PT400");
    const reserved = await Promise.all(Array.from({ length: 6 }, () => order(a)));
    expect(new Set(reserved.map(item => item.id)).size).toBe(1);
    expect(reserved[0].amount).toBe(50000);
    expect((await b.client.from("membership_orders").select("id").eq("id", reserved[0].id)).data).toEqual([]);
    expect((await a.client.from("membership_orders").update({ amount: 1 }).eq("id", reserved[0].id)).error?.code).toBe("42501");
    const wrong = await admin.rpc("settle_membership_payment", { p_order_code: reserved[0].order_code, p_payment_link_id: "bad", p_amount: 1 });
    expect(wrong.error?.code).toBe("PT409");
    expect((await a.client.rpc("membership_status")).data.active).toBe(false);
    const first = await a.client.rpc("claim_membership_check", { p_order: reserved[0].id });
    expect(first.error).toBeNull();
    expect((await a.client.rpc("claim_membership_check", { p_order: reserved[0].id })).error?.code).toBe("PT429");
    expect((await b.client.rpc("claim_membership_check", { p_order: reserved[0].id })).error?.code).toBe("PT404");
  });

  it("webhook trùng/đồng thời chỉ cộng hạn một lần, link sai không được cấp quyền", async () => {
    const item = await order(a);
    const bound = await admin.rpc("bind_membership_payment", { p_order: item.id, p_payment_link_id: "verified-link", p_checkout_url: "https://pay.payos.vn/web/verified-link" });
    expect(bound.error).toBeNull();
    expect((await settle(item, "other-link")).error?.code).toBe("PT409");
    const paid = await Promise.all(Array.from({ length: 6 }, () => settle(item, "verified-link")));
    for (const receipt of paid) expect(receipt.error).toBeNull();
    expect(new Set(paid.map(receipt => receipt.data)).size).toBe(1);
    expect((await a.client.rpc("membership_status")).data.active).toBe(true);
    await admin.rpc("set_membership_order_state", { p_order: item.id, p_status: "cancelled" });
    expect((await a.client.from("membership_orders").select("status").eq("id", item.id).single()).data?.status).toBe("paid");
  });

  it("cộng tháng theo lịch và hai đơn khác nhau đồng thời không làm mất hạn", async () => {
    expect((await admin.from("membership_entitlements").update({ premium_until: "2030-01-31T10:00:00Z" }).eq("user_id", a.id)).error).toBeNull();
    expect((await settle(await order(a))).data).toBe("2030-02-28T10:00:00+00:00");
    const monthly = await order(a), yearly = await order(a, "premium_yearly");
    expect(yearly.amount).toBe(500000);
    const paid = await Promise.all([settle(monthly), settle(yearly)]);
    for (const receipt of paid) expect(receipt.error).toBeNull();
    const status = await a.client.rpc("membership_status");
    expect(status.data.premiumUntil).toBe("2031-03-28T10:00:00+00:00");
  });

  it("mua sau khi hết hạn tính từ hiện tại; hết hạn chặn chỉnh/phát hành nhưng vẫn đọc và đóng đề cũ", async () => {
    await admin.from("membership_entitlements").upsert({ user_id: b.id, premium_until: "2000-01-01T00:00:00Z" });
    const paid = await settle(await order(b, "premium_yearly"));
    expect(paid.error).toBeNull();
    expect(new Date(paid.data).getUTCFullYear()).toBe(new Date().getUTCFullYear() + 1);
    const created = await a.client.rpc("create_assignment", { p_class_id: classId, p_quiz_id: quizId, p_title: "Đề đã tạo" });
    expect(created.error).toBeNull();
    const id = created.data as string;
    await admin.from("membership_entitlements").update({ premium_until: "2000-01-01T00:00:00Z" }).eq("user_id", a.id);
    expect((await a.client.rpc("publish_assignment", { p_assignment: id })).error?.code).toBe("PT402");
    expect((await a.client.rpc("update_assignment_draft", { p_assignment: id, p_title: "Sửa khi hết hạn" })).error?.code).toBe("PT402");
    expect((await a.client.rpc("assignment_detail", { p_assignment: id })).error).toBeNull();
    await settle(await order(a));
    expect((await a.client.rpc("publish_assignment", { p_assignment: id })).error).toBeNull();
    await admin.from("membership_entitlements").update({ premium_until: "2000-01-01T00:00:00Z" }).eq("user_id", a.id);
    expect((await a.client.rpc("close_assignment", { p_assignment: id })).error).toBeNull();
  });
});
