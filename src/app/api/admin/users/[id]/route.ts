import {
  dbError,
  failure,
  json,
  mutation,
  requireUser,
  uuid,
} from "@/lib/admin/http";
import { getAdminSupabase } from "@/lib/supabase/admin";
export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { client } = await requireUser(true);
    const body = await mutation(request),
      id = uuid((await context.params).id);
    const result = await client.rpc("admin_update_user", {
      p_user: id,
      p_action: body.action,
      p_reason: body.reason,
      p_expected_version: body.expectedVersion,
      p_request_id: uuid(body.requestId),
      p_role: body.role ?? null,
    });
    dbError(result.error);
    let authSyncPending = false;
    if (body.action === "block" || body.action === "unblock") {
      const admin = getAdminSupabase();
      const synced = admin
        ? await admin.auth.admin.updateUserById(id, {
            ban_duration: body.action === "block" ? "876000h" : "none",
          })
        : null;
      authSyncPending = !synced || Boolean(synced.error);
      if (admin && !authSyncPending) {
        const recorded = await admin.rpc("admin_auth_sync_result", {
          p_user: id,
          p_pending: false,
        });
        authSyncPending = Boolean(recorded.error);
      }
    }
    return json({ ok: true, authSyncPending });
  } catch (error) {
    return failure(error);
  }
}
