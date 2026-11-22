import type { Metadata } from "next";
import Link from "next/link";
import { AuthForm } from "@/components/auth-form";
import { safeNextPath } from "@/lib/auth/rules";
import { authSettings } from "@/lib/auth/settings";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const next = safeNextPath(typeof params.next === "string" ? params.next : null);

  return (
    <>
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-gold">Golden Gist Studio</p>
      <h1 className="mt-2 font-display text-3xl font-extrabold text-white">Welcome back</h1>
      <p className="mt-2 text-sm text-muted">Sign in to review today&apos;s gist.</p>
      <div className="mt-6">
        {authSettings() ? (
          <AuthForm mode="login" next={next === "/" ? undefined : next} />
        ) : (
          <p className="rounded-2xl border border-warn/30 bg-warn/5 p-4 text-sm text-warn">
            Sign-in isn&apos;t configured yet. Set SUPABASE_ANON_KEY and OWNER_EMAIL (docs/SETUP.md).
          </p>
        )}
      </div>
      <p className="mt-6 text-center text-sm text-muted">
        First time here?{" "}
        <Link href="/signup" className="font-medium text-gold hover:text-gold-light">
          Set up your account
        </Link>
      </p>
    </>
  );
}
