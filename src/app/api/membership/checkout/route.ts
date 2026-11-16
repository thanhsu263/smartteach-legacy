import { billingBody, billingFailure, billingJson, billingUser, assertBillingOrigin } from "@/lib/membership/http";
import { getBillingAdmin, getBillingOrigin, getPaymentGateway } from "@/lib/membership/payos";
import { getPremiumPlan } from "@/lib/membership/plans";
import { BillingError, createCheckout } from "@/lib/membership/service";

export async function POST(request: Request) {
  try {
    const user = await billingUser();
    const origin = getBillingOrigin();
    assertBillingOrigin(request, origin);
    const body = await billingBody(request);
    const plan = getPremiumPlan(body.plan);
    if (!plan) throw new BillingError(400, "plan_invalid", "Vui lòng chọn gói Premium hợp lệ.");
    const admin = getBillingAdmin(), gateway = getPaymentGateway();
    if (!admin || !gateway) throw new BillingError(503, "payment_unavailable", "Thanh toán đang tạm thời chưa sẵn sàng. Vui lòng thử lại sau.");
    return billingJson(await createCheckout(user, admin, gateway, plan.id, origin!));
  } catch (error) { return billingFailure(error); }
}
