import type { PremiumPlanId } from "./plans";

export type Membership = { active: boolean; premiumUntil: string | null };
export type OrderStatus = "pending" | "paid" | "cancelled" | "expired";
export type MembershipOrder = {
  id: string; user_id: string; order_code: number; plan_id: PremiumPlanId; amount: number;
  status: OrderStatus; payment_link_id: string | null; checkout_url: string | null;
  expires_at: string; created_at: string; paid_at: string | null;
};
export type OrderView = {
  id: string; plan: PremiumPlanId; amount: number; status: OrderStatus;
  checkoutUrl: string | null; expiresAt: string;
};

export function orderView(order: MembershipOrder): OrderView {
  return { id: order.id, plan: order.plan_id, amount: order.amount, status: order.status, checkoutUrl: order.checkout_url, expiresAt: order.expires_at };
}
