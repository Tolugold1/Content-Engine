import { describe, expect, it } from "vitest";
import { checkSignUp, decideAccess, isOwnerEmail, passwordProblem, safeNextPath, secretsMatch, type AccessRequest } from "./rules";

const OWNER = "steve@example.com";

const request = (overrides: Partial<AccessRequest> = {}): AccessRequest => ({
  pathname: "/",
  search: "",
  method: "GET",
  originHost: null,
  host: "studio.example.com",
  authConfigured: true,
  production: true,
  sessionEmail: null,
  ownerEmail: OWNER,
  ...overrides,
});

describe("owner and secrets", () => {
  it("matches the owner email regardless of case and spaces", () => {
    expect(isOwnerEmail("  Steve@Example.com ", OWNER)).toBe(true);
    expect(isOwnerEmail("someone@example.com", OWNER)).toBe(false);
    expect(isOwnerEmail(null, OWNER)).toBe(false);
  });

  it("compares codes exactly", () => {
    expect(secretsMatch("abc123", "abc123")).toBe(true);
    expect(secretsMatch("abc12", "abc123")).toBe(false);
  });

  it("only allows same-site redirects after sign-in", () => {
    expect(safeNextPath("/review?status=x")).toBe("/review?status=x");
    expect(safeNextPath("//evil.example")).toBe("/");
    expect(safeNextPath("https://evil.example")).toBe("/");
    expect(safeNextPath("/\\evil.example")).toBe("/");
    expect(safeNextPath("/login")).toBe("/");
    expect(safeNextPath(null)).toBe("/");
  });

  it("enforces password length and refuses the email as password", () => {
    expect(passwordProblem("short", OWNER)).toMatch(/at least/);
    expect(passwordProblem(OWNER, OWNER)).toBeTruthy();
    expect(passwordProblem("a".repeat(73), OWNER)).toMatch(/at most/);
    expect(passwordProblem("correct horse battery", OWNER)).toBeNull();
  });
});

describe("sign-up", () => {
  const base = { email: OWNER, code: "s3cret-code", ownerEmail: OWNER, expectedCode: "s3cret-code", ownerExists: false };

  it("lets the owner sign up once, with the right code", () => {
    expect(checkSignUp(base)).toEqual({ ok: true });
    expect(checkSignUp({ ...base, ownerExists: true })).toMatchObject({ ok: false, error: expect.stringMatching(/closed/) });
  });

  it("refuses other emails and wrong codes with the same message", () => {
    const wrongEmail = checkSignUp({ ...base, email: "intruder@example.com" });
    const wrongCode = checkSignUp({ ...base, code: "guess" });
    expect(wrongEmail).toEqual(wrongCode);
    expect(wrongEmail.ok).toBe(false);
  });

  it("is off when no sign-up code is configured", () => {
    expect(checkSignUp({ ...base, expectedCode: undefined })).toMatchObject({ ok: false, error: expect.stringMatching(/SIGNUP_CODE/) });
  });
});

describe("proxy access", () => {
  it("sends signed-out visitors to sign-in and remembers where they were going", () => {
    expect(decideAccess(request({ pathname: "/drafts/abc", search: "?x=1" }))).toEqual({
      kind: "redirect",
      to: "/login?next=%2Fdrafts%2Fabc%3Fx%3D1",
    });
    expect(decideAccess(request())).toEqual({ kind: "redirect", to: "/login" });
  });

  it("answers 401 on the API and keeps the webhook and health check open", () => {
    expect(decideAccess(request({ pathname: "/api/drafts" }))).toEqual({ kind: "unauthorized" });
    expect(decideAccess(request({ pathname: "/api/telegram/webhook", method: "POST" }))).toEqual({ kind: "allow" });
    expect(decideAccess(request({ pathname: "/api/health" }))).toEqual({ kind: "allow" });
  });

  it("lets only the owner in, and moves them off the sign-in page", () => {
    expect(decideAccess(request({ sessionEmail: OWNER }))).toEqual({ kind: "allow" });
    expect(decideAccess(request({ sessionEmail: "other@example.com" }))).toMatchObject({ kind: "redirect" });
    expect(decideAccess(request({ pathname: "/login", sessionEmail: OWNER }))).toEqual({ kind: "redirect", to: "/" });
    expect(decideAccess(request({ pathname: "/signup" }))).toEqual({ kind: "allow" });
  });

  it("refuses cross-site writes to the API", () => {
    expect(decideAccess(request({ pathname: "/api/scans", method: "POST", sessionEmail: OWNER, originHost: "evil.example" }))).toEqual({
      kind: "forbidden",
    });
    expect(
      decideAccess(request({ pathname: "/api/scans", method: "POST", sessionEmail: OWNER, originHost: "studio.example.com" })),
    ).toEqual({ kind: "allow" });
  });

  it("never serves a production app without sign-in configured", () => {
    expect(decideAccess(request({ authConfigured: false }))).toEqual({ kind: "unconfigured" });
    expect(decideAccess(request({ authConfigured: false, production: false }))).toEqual({ kind: "allow" });
  });
});
