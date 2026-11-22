import { errorMessage } from "@content-engine/core";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { AuthForm } from "@/components/auth-form";
import { ownerAccountExists } from "@/lib/auth/session";
import { authSettings } from "@/lib/auth/settings";

export const metadata: Metadata = { title: "Set up your account" };

async function signUpState(): Promise<"open" | "closed" | "unconfigured" | { error: string }> {
  await connection();
  const settings = authSettings();
  if (!settings) return "unconfigured";
  try {
    return (await ownerAccountExists(settings.ownerEmail)) ? "closed" : "open";
  } catch (error) {
    return { error: errorMessage(error) };
  }
}

export default async function SignUpPage() {
  const state = await signUpState();

  return (
    <>
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-gold">One-time setup</p>
      <h1 className="mt-2 font-display text-3xl font-extrabold text-white">Create your account</h1>
      <p className="mt-2 text-sm text-muted">This studio has one account: yours. Sign-up closes as soon as it exists.</p>
      <div className="mt-6">
        {state === "open" && <AuthForm mode="signup" />}
        {state === "closed" && (
          <p className="rounded-2xl border border-line bg-black/30 p-4 text-sm text-cream">
            Sign-up is closed because the owner account already exists.
          </p>
        )}
        {state === "unconfigured" && (
          <p className="rounded-2xl border border-warn/30 bg-warn/5 p-4 text-sm text-warn">
            Sign-in isn&apos;t configured yet. Set SUPABASE_ANON_KEY, OWNER_EMAIL and SIGNUP_CODE (docs/SETUP.md).
          </p>
        )}
        {typeof state === "object" && <p className="rounded-2xl border border-bad/30 bg-bad/5 p-4 text-sm text-bad">{state.error}</p>}
      </div>
      <p className="mt-6 text-center text-sm text-muted">
        Already set up?{" "}
        <Link href="/login" className="font-medium text-gold hover:text-gold-light">
          Sign in
        </Link>
      </p>
    </>
  );
}
