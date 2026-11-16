import { billingBody, billingFailure, billingJson, billingUser, assertBillingOrigin } from "@/lib/membership/http";
import { getBillingAdmin, getBillingOrigin, getPaymentGateway } from "@/lib/membership/payos";
import { BillingError, reconcileOrder } from "@/lib/membership/service";
import type { MembershipOrder } from "@/lib/membership/types";
import { isUuid } from "@/lib/classes/api";

export async function POST(request: Request) {
  try {
    const user = await billingUser();
    assertBillingOrigin(request, getBillingOrigin());
    const body = await billingBody(request);
    if (typeof body.order !== "string" || !isUuid(body.order)) throw new BillingError(400, "order_invalid", "Mã đơn chưa hợp lệ.");
    const { data, error } = await user.rpc("claim_membership_check", { p_order: body.order });
    if (error || !data) throw new BillingError(error?.code === "PT429" ? 429 : error?.code === "PT404" ? 404 : 503, "order_unavailable", error?.code === "PT429" ? "Vui lòng đợi 10 giây trước khi kiểm tra lại." : "Không tìm thấy đơn hoặc chưa thể kiểm tra thanh toán.");
    const order = data as MembershipOrder;
    if (order.status !== "paid") {
      const admin = getBillingAdmin(), gateway = getPaymentGateway();
      if (!admin || !gateway) throw new BillingError(503, "payment_unavailable", "Chưa thể kiểm tra thanh toán. Vui lòng thử lại sau.");
      await reconcileOrder(admin, gateway, order);
    }
    return billingJson({ ok: true });
  } catch (error) { return billingFailure(error); }
}
