import { env } from "@content-engine/config";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { isOwnerEmail } from "./rules";
import { authSettings, type AuthSettings } from "./settings";

export { authSettings, type AuthSettings };

export class UnauthorizedError extends Error {
  constructor() {
    super("Sign in to continue.");
    this.name = "UnauthorizedError";
  }
}

/** A Supabase client bound to this request's cookies. Create one per request; never share it. */
export async function supabaseForRequest(settings: AuthSettings) {
  const store = await cookies();
  return createServerClient(settings.url, settings.anonKey, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (toSet) => {
        try {
          for (const { name, value, options } of toSet) store.set(name, value, options);
        } catch {
          // Server components cannot set cookies; the proxy refreshes the session instead.
        }
      },
    },
  });
}

/** Service-role client for creating the owner account. Server-side only. */
export function supabaseAdmin() {
  const values = env();
  if (!values.SUPABASE_URL || !values.SUPABASE_SERVICE_ROLE_KEY) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set.");
  return createClient(values.SUPABASE_URL, values.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export type Viewer = { mode: "owner"; email: string } | { mode: "open" } | { mode: "anonymous" };

/**
 * Who is making this request, verified from the session token (not just read from
 * the cookie). Cached for the duration of one request.
 */
export const getViewer = cache(async (): Promise<Viewer> => {
  const settings = authSettings();
  if (!settings) return process.env.NODE_ENV === "production" ? { mode: "anonymous" } : { mode: "open" };
  const supabase = await supabaseForRequest(settings);
  const { data } = await supabase.auth.getClaims();
  const email = typeof data?.claims?.email === "string" ? data.claims.email : null;
  return isOwnerEmail(email, settings.ownerEmail) ? { mode: "owner", email: email! } : { mode: "anonymous" };
});

/** For pages: anyone but the owner goes to the sign-in page. */
export async function requireOwnerPage(): Promise<Viewer> {
  const viewer = await getViewer();
  if (viewer.mode === "anonymous") redirect("/login");
  return viewer;
}

/** For server actions and API routes: a second check behind the proxy. */
export async function assertOwner(): Promise<void> {
  if ((await getViewer()).mode === "anonymous") throw new UnauthorizedError();
}

/** True once the owner account exists; sign-up closes then. */
export async function ownerAccountExists(ownerEmail: string): Promise<boolean> {
  for (let page = 1; page <= 10; page++) {
    const { data, error } = await supabaseAdmin().auth.admin.listUsers({ page, perPage: 100 });
    if (error) throw new Error(`Could not check accounts: ${error.message}`);
    if (data.users.some((user) => isOwnerEmail(user.email, ownerEmail))) return true;
    if (data.users.length < 100) return false;
  }
  return false;
}
