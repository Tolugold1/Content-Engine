import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { decideAccess } from "@/lib/auth/rules";
import { authSettings } from "@/lib/auth/settings";

/**
 * Runs before every page and API call: refreshes the Supabase session cookie,
 * verifies the token, and lets only the owner through. Pages redirect to
 * sign-in; the API answers 401. Pages, server actions and API routes check
 * again on their own (see lib/auth/session.ts), so this is not the only gate.
 */
export async function proxy(request: NextRequest) {
  const settings = authSettings();
  let response = NextResponse.next({ request });
  let sessionEmail: string | null = null;

  if (settings) {
    const supabase = createServerClient(settings.url, settings.anonKey, {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (toSet, headers) => {
          for (const { name, value } of toSet) request.cookies.set(name, value);
          response = NextResponse.next({ request });
          for (const { name, value, options } of toSet) response.cookies.set(name, value, options);
          for (const [key, value] of Object.entries(headers ?? {})) response.headers.set(key, value);
        },
      },
    });
    const { data } = await supabase.auth.getClaims();
    sessionEmail = typeof data?.claims?.email === "string" ? data.claims.email : null;
  }

  const origin = request.headers.get("origin");
  const decision = decideAccess({
    pathname: request.nextUrl.pathname,
    search: request.nextUrl.search,
    method: request.method,
    originHost: origin ? safeHost(origin) : null,
    host: request.nextUrl.host,
    authConfigured: Boolean(settings),
    production: process.env.NODE_ENV === "production",
    sessionEmail,
    ownerEmail: settings?.ownerEmail ?? null,
  });

  switch (decision.kind) {
    case "allow":
      return response;
    case "redirect": {
      const redirect = NextResponse.redirect(new URL(decision.to, request.url));
      // Keep any refreshed session cookies on the redirect.
      for (const cookie of response.cookies.getAll()) redirect.cookies.set(cookie);
      return redirect;
    }
    case "unauthorized":
      return problem(401, "Sign in required", "Sign in to the dashboard to use the API.");
    case "forbidden":
      return problem(403, "Cross-site request refused");
    case "unconfigured":
      return problem(503, "Sign-in is not configured", "Set SUPABASE_ANON_KEY and OWNER_EMAIL (see docs/SETUP.md).");
  }
}

function safeHost(origin: string): string | null {
  try {
    return new URL(origin).host;
  } catch {
    return "invalid";
  }
}

function problem(status: number, title: string, detail?: string) {
  return NextResponse.json({ type: "about:blank", title, status, ...(detail ? { detail } : {}) }, { status });
}

export const config = {
  // Everything except static assets.
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
