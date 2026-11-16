export type ProviderFailure = {
  kind: "invalid" | "permission" | "quota" | "transient";
  cooldownSeconds: number;
  retry: boolean;
};
export function secondsUntilPacificReset(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Los_Angeles",
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).formatToParts(now);
  const part = (name: string) =>
    Number(parts.find((p) => p.type === name)!.value);
  const nextDay = Date.UTC(part("year"), part("month") - 1, part("day") + 1);
  const offsetName = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Los_Angeles",
    timeZoneName: "longOffset",
  })
    .formatToParts(new Date(nextDay + 8 * 3600_000))
    .find((p) => p.type === "timeZoneName")!.value;
  const match = /GMT([+-])(\d{2}):(\d{2})/.exec(offsetName);
  const offset = match
    ? (Number(match[2]) * 60 + Number(match[3])) * (match[1] === "-" ? -1 : 1)
    : 0;
  return Math.max(
    1,
    Math.ceil((nextDay - offset * 60_000 - now.getTime()) / 1000) + 60,
  );
}
/** No provider message leaves the boundary. An unspecified 403 is permission, not an invalid key. */
export function classifyProviderError(error: unknown): ProviderFailure {
  const e = error as { status?: number; message?: string };
  if (
    e.status === 401 ||
    /API_KEY_INVALID|API_KEY_EXPIRED/.test(e.message ?? "")
  )
    return { kind: "invalid", cooldownSeconds: 0, retry: true };
  if (e.status === 403 || e.status === 400 || e.status === 404)
    return { kind: "permission", cooldownSeconds: 0, retry: false };
  if (e.status === 429) {
    const daily = /per.?day|daily|PerDay|requests_per_day/i.test(
      e.message ?? "",
    );
    const retry = /retryDelay[^0-9]{0,8}([0-9]+)s/i.exec(e.message ?? "");
    return {
      kind: "quota",
      cooldownSeconds: daily
        ? secondsUntilPacificReset()
        : Math.min(172800, Math.max(60, Number(retry?.[1] ?? 0))),
      retry: true,
    };
  }
  return { kind: "transient", cooldownSeconds: 0, retry: true };
}

/** Admin connection tests get actionable, fixed messages, never raw provider text. */
export function credentialTestFailure(error: unknown) {
  if ((error as { status?: number })?.status === 404)
    return {
      status: 503,
      code: "ai_model_unavailable",
      message:
        "Google không cung cấp model này cho project hiện tại. Chọn model mới trong cấu hình AI rồi kiểm kết nối lại.",
    };
  const failure = classifyProviderError(error);
  switch (failure.kind) {
    case "invalid":
      return {
        status: 400,
        code: "ai_key_invalid",
        message: "Google báo API key không hợp lệ hoặc đã hết hạn. Hãy thay key và kiểm tra lại.",
      };
    case "permission":
      if ((error as { status?: number })?.status === 400)
        return {
          status: 503,
          code: "ai_request_invalid",
          message:
            "Google báo cấu hình yêu cầu AI chưa hợp lệ. Cần kiểm tra cấu hình tích hợp trên máy chủ; chưa thể kết luận key sai.",
        };
      return {
        status: 403,
        code: "ai_key_permission",
        message:
          "Google từ chối yêu cầu với key hoặc model này. Kiểm tra quyền Gemini API, giới hạn key và quyền dùng model của project.",
      };
    case "quota":
      return {
        status: 429,
        code: "ai_provider_quota",
        message:
          "Project đã chạm hạn mức Google cho model này. Kiểm tra quota trong AI Studio và đợi hạn mức mở lại.",
      };
    default:
      return {
        status: 503,
        code: "ai_provider_unavailable",
        message: "Chưa kết nối được Google AI hoặc yêu cầu đã hết thời gian. Vui lòng thử lại sau.",
      };
  }
}
