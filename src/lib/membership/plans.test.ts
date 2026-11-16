import { describe, expect, it } from "vitest";
import { formatMembershipPrice, getPremiumPlan, premiumPlans } from "./plans";

describe("membership catalog", () => {
  it("giá cố định và gói năm tiết kiệm 100.000đ", () => {
    expect(premiumPlans.premium_monthly).toMatchObject({ amount: 50_000, months: 1 });
    expect(premiumPlans.premium_yearly).toMatchObject({ amount: 500_000, months: 12 });
    expect(12 * premiumPlans.premium_monthly.amount - premiumPlans.premium_yearly.amount).toBe(100_000);
    expect(formatMembershipPrice(500000)).toBe("500.000đ");
  });
  it.each([undefined, null, "__proto__", "free", "premium", 50000])("không nhận gói lạ: %s", value => {
    expect(getPremiumPlan(value)).toBeNull();
  });
});
