import { it, expect } from "vitest";
import { classifyProviderError, credentialTestFailure, secondsUntilPacificReset } from "./errors";
it("does not revoke keys for ordinary permission errors and groups quota failures", () => {
  expect(classifyProviderError({ status: 403 }).kind).toBe("permission");
  expect(
    classifyProviderError({ status: 400, message: "API_KEY_INVALID" }).kind,
  ).toBe("invalid");
  expect(
    classifyProviderError({ status: 429, message: "requests_per_day" })
      .cooldownSeconds,
  ).toBeGreaterThan(0);
  expect(classifyProviderError({ status: 429 }).cooldownSeconds).toBe(60);
  expect(classifyProviderError({ status: 503 }).retry).toBe(true);
});
it("daily reset follows Pacific midnight including DST", () => {
  expect(secondsUntilPacificReset(new Date("2026-11-15T07:00:00Z"))).toBe(3660);
  expect(secondsUntilPacificReset(new Date("2026-07-01T06:00:00Z"))).toBe(3660);
});

it("connection diagnostics distinguish removed models from bad keys without exposing provider text", () => {
  const secret = "CANARY_PRIVATE_KEY_IN_PROVIDER_ERROR";
  expect(credentialTestFailure({ status: 404, message: secret })).toMatchObject({
    code: "ai_model_unavailable", status: 503,
  });
  expect(credentialTestFailure({ status: 401, message: secret }).code).toBe("ai_key_invalid");
  expect(credentialTestFailure({ status: 403, message: secret }).code).toBe("ai_key_permission");
  expect(credentialTestFailure({ status: 400, message: secret }).code).toBe("ai_request_invalid");
  expect(credentialTestFailure({ status: 429, message: secret }).code).toBe("ai_provider_quota");
  expect(credentialTestFailure({ status: 503, message: secret }).code).toBe("ai_provider_unavailable");
  for (const status of [400, 401, 403, 404, 429, 503])
    expect(JSON.stringify(credentialTestFailure({ status, message: secret }))).not.toContain(secret);
});
