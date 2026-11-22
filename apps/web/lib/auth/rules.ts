import { createHash, timingSafeEqual } from "node:crypto";
import { PASSWORD_MIN } from "./constants";

export { PASSWORD_MIN };

/**
 * Authentication rules as pure functions, shared by the proxy, the pages and
 * the server actions, and unit-tested without a network.
 */

/** Pages and endpoints reachable without signing in. */
export const AUTH_PAGES = ["/login", "/signup"] as const;
const PUBLIC_API = ["/api/health", "/api/telegram/webhook"] as const;

export function normaliseEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isOwnerEmail(email: string | null | undefined, ownerEmail: string): boolean {
  return Boolean(email) && normaliseEmail(email!) === normaliseEmail(ownerEmail);
}

/** Compares secrets without leaking their length or content through timing. */
export function secretsMatch(given: string, expected: string): boolean {
  const a = createHash("sha256").update(given).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}

/** Only same-site paths, so `?next=` can never send you to another website. */
export function safeNextPath(next: string | null | undefined): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return "/";
  if (AUTH_PAGES.some((page) => next === page || next.startsWith(`${page}?`))) return "/";
  return next;
}

const PASSWORD_MAX = 72; // Supabase Auth hashes with bcrypt, which reads at most 72 bytes.

export function passwordProblem(password: string, email: string): string | null {
  if (password.length < PASSWORD_MIN) return `Use at least ${PASSWORD_MIN} characters.`;
  if (Buffer.byteLength(password) > PASSWORD_MAX) return `Use at most ${PASSWORD_MAX} characters.`;
  if (normaliseEmail(password) === normaliseEmail(email)) return "Your password can't be your email.";
  return null;
}

export type SignUpCheck = { ok: true } | { ok: false; error: string };

/** Sign-up is for the owner only, once, and only with the server's one-time code. */
export function checkSignUp(input: {
  email: string;
  code: string;
  ownerEmail: string;
  expectedCode: string | undefined;
  ownerExists: boolean;
}): SignUpCheck {
  if (input.ownerExists) return { ok: false, error: "Sign-up is closed. Sign in instead." };
  if (!input.expectedCode) return { ok: false, error: "Sign-up is turned off: set SIGNUP_CODE on the server first." };
  // One message for both checks, so the form never confirms which email is the owner's.
  const allowed = isOwnerEmail(input.email, input.ownerEmail) && secretsMatch(input.code.trim(), input.expectedCode);
  return allowed ? { ok: true } : { ok: false, error: "That email or sign-up code is not right." };
}

export type AccessDecision =
  { kind: "allow" } | { kind: "redirect"; to: string } | { kind: "unauthorized" } | { kind: "forbidden" } | { kind: "unconfigured" };

export interface AccessRequest {
  pathname: string;
  search: string;
  method: string;
  /** Host of the `Origin` header, if the browser sent one. */
  originHost: string | null;
  host: string;
  authConfigured: boolean;
  production: boolean;
  /** Email from a verified session, if any. */
  sessionEmail: string | null;
  ownerEmail: string | null;
}

/** What the proxy does with each request. Pages redirect to sign-in; the API answers 401. */
export function decideAccess(request: AccessRequest): AccessDecision {
  const isApi = request.pathname.startsWith("/api/");
  if (PUBLIC_API.some((path) => request.pathname === path)) return { kind: "allow" };

  if (!request.authConfigured) {
    // Local preview with sample data only; a production server never runs without sign-in.
    return request.production ? { kind: "unconfigured" } : { kind: "allow" };
  }

  // Cross-site writes to the API are refused even with a valid session cookie.
  const writes = !["GET", "HEAD", "OPTIONS"].includes(request.method.toUpperCase());
  if (isApi && writes && request.originHost && request.originHost !== request.host) return { kind: "forbidden" };

  const isOwner = Boolean(request.ownerEmail) && isOwnerEmail(request.sessionEmail, request.ownerEmail!);
  const isAuthPage = AUTH_PAGES.some((page) => request.pathname === page);

  if (isAuthPage) return isOwner ? { kind: "redirect", to: "/" } : { kind: "allow" };
  if (isOwner) return { kind: "allow" };
  if (isApi) return { kind: "unauthorized" };
  const next = `${request.pathname}${request.search}`;
  return { kind: "redirect", to: next === "/" ? "/login" : `/login?next=${encodeURIComponent(next)}` };
}
