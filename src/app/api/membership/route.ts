import { billingFailure, billingJson, billingUser } from "@/lib/membership/http";
import { BillingError } from "@/lib/membership/service";
import { orderView, type MembershipOrder } from "@/lib/membership/types";
import { isUuid } from "@/lib/classes/api";

export async function GET(request: Request) {
  try {
    const user = await billingUser();
    const { data: membership, error } = await user.rpc("membership_status");
    if (error || !membership) throw new BillingError(503, "membership_unavailable", "Chưa thể tải thông tin thành viên. Vui lòng thử lại.");
    const id = new URL(request.url).searchParams.get("order");
    if (!id) return billingJson({ membership, order: null });
    if (!isUuid(id)) throw new BillingError(400, "order_invalid", "Mã đơn chưa hợp lệ.");
    const { data, error: orderError } = await user.from("membership_orders").select("*").eq("id", id).maybeSingle();
    if (orderError) throw new BillingError(503, "order_unavailable", "Chưa thể tải đơn thanh toán.");
    if (!data) throw new BillingError(404, "order_not_found", "Không tìm thấy đơn thanh toán của tài khoản này.");
    return billingJson({ membership, order: orderView(data as MembershipOrder) });
  } catch (error) { return billingFailure(error); }
}
