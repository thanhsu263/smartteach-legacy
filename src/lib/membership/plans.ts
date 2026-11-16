export const premiumPlans = {
  premium_monthly: { id: "premium_monthly", title: "Premium 1 tháng", amount: 50_000, months: 1, period: "tháng" },
  premium_yearly: { id: "premium_yearly", title: "Premium 1 năm", amount: 500_000, months: 12, period: "năm" },
} as const;

export type PremiumPlanId = keyof typeof premiumPlans;

export function getPremiumPlan(value: unknown) {
  return value === "premium_monthly" || value === "premium_yearly" ? premiumPlans[value] : null;
}

export function formatMembershipPrice(amount: number) {
  return `${new Intl.NumberFormat("vi-VN").format(amount)}đ`;
}
