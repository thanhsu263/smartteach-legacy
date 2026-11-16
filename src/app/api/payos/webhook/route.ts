import { billingBody, billingFailure, billingJson } from "@/lib/membership/http";
import { getBillingAdmin, getPaymentGateway } from "@/lib/membership/payos";
import { BillingError, processWebhook } from "@/lib/membership/service";

export async function POST(request: Request) {
  try {
    const admin = getBillingAdmin(), gateway = getPaymentGateway();
    if (!admin || !gateway) throw new BillingError(503, "payment_unavailable", "Dịch vụ chưa sẵn sàng.");
    await processWebhook(admin, gateway, await billingBody(request, 16_384));
    return billingJson({ received: true });
  } catch (error) { return billingFailure(error); }
}
