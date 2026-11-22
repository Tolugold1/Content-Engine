"use server";

import { env } from "@content-engine/config";
import { redirect } from "next/navigation";
import { checkSignUp, isOwnerEmail, normaliseEmail, passwordProblem, safeNextPath } from "./rules";
import { authSettings, ownerAccountExists, supabaseAdmin, supabaseForRequest } from "./session";

export interface AuthFormState {
  error: string | null;
  email: string;
}

function field(form: FormData, name: string): string {
  const value = form.get(name);
  return typeof value === "string" ? value : "";
}

const NOT_CONFIGURED: AuthFormState = { error: "Sign-in is not configured on this server yet (see docs/SETUP.md).", email: "" };

export async function signInAction(_previous: AuthFormState, form: FormData): Promise<AuthFormState> {
  const settings = authSettings();
  if (!settings) return NOT_CONFIGURED;
  const email = normaliseEmail(field(form, "email"));
  const password = field(form, "password");
  const failed: AuthFormState = { error: "That email or password is not right.", email };
  if (!email || !password) return failed;

  const supabase = await supabaseForRequest(settings);
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user) return failed;
  if (!isOwnerEmail(data.user.email, settings.ownerEmail)) {
    // Only the owner may use this app, even if another account somehow exists.
    await supabase.auth.signOut();
    return failed;
  }
  redirect(safeNextPath(field(form, "next")));
}

export async function signUpAction(_previous: AuthFormState, form: FormData): Promise<AuthFormState> {
  const settings = authSettings();
  if (!settings) return NOT_CONFIGURED;
  const email = normaliseEmail(field(form, "email"));
  const password = field(form, "password");

  if (password !== field(form, "confirm")) return { error: "The two passwords don't match.", email };
  const weak = passwordProblem(password, email);
  if (weak) return { error: weak, email };

  const check = checkSignUp({
    email,
    code: field(form, "code"),
    ownerEmail: settings.ownerEmail,
    expectedCode: env().SIGNUP_CODE,
    ownerExists: await ownerAccountExists(settings.ownerEmail),
  });
  if (!check.ok) return { error: check.error, email };

  // Created server-side with the admin API, so public sign-ups can stay disabled in Supabase.
  const { error } = await supabaseAdmin().auth.admin.createUser({ email, password, email_confirm: true });
  if (error) return { error: `Could not create the account: ${error.message}`, email };

  const supabase = await supabaseForRequest(settings);
  const signedIn = await supabase.auth.signInWithPassword({ email, password });
  if (signedIn.error) return { error: "Account created. Sign in to continue.", email };
  redirect("/");
}

export async function signOutAction(): Promise<void> {
  const settings = authSettings();
  if (settings) await (await supabaseForRequest(settings)).auth.signOut();
  redirect("/login");
}
