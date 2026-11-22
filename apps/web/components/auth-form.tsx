"use client";

import { LogIn, UserPlus } from "lucide-react";
import { useActionState } from "react";
import { signInAction, signUpAction, type AuthFormState } from "@/lib/auth/actions";
import { PASSWORD_MIN } from "@/lib/auth/constants";

interface Field {
  name: string;
  label: string;
  type: "email" | "password" | "text";
  autoComplete: string;
  hint?: string;
}

const FIELDS: Record<"login" | "signup", Field[]> = {
  login: [
    { name: "email", label: "Email", type: "email", autoComplete: "username" },
    { name: "password", label: "Password", type: "password", autoComplete: "current-password" },
  ],
  signup: [
    { name: "email", label: "Your email", type: "email", autoComplete: "username", hint: "Must match OWNER_EMAIL on the server." },
    { name: "password", label: "Password", type: "password", autoComplete: "new-password", hint: `At least ${PASSWORD_MIN} characters.` },
    { name: "confirm", label: "Confirm password", type: "password", autoComplete: "new-password" },
    { name: "code", label: "Sign-up code", type: "text", autoComplete: "one-time-code", hint: "The SIGNUP_CODE from your server's .env." },
  ],
};

const INITIAL: AuthFormState = { error: null, email: "" };

/** One form for sign-in and sign-up; the server action does every check. */
export function AuthForm({ mode, next }: { mode: "login" | "signup"; next?: string }) {
  const [state, action, pending] = useActionState(mode === "login" ? signInAction : signUpAction, INITIAL);
  const Icon = mode === "login" ? LogIn : UserPlus;

  return (
    <form action={action} className="space-y-4">
      {next && <input type="hidden" name="next" value={next} />}
      {FIELDS[mode].map((field) => (
        <div key={field.name}>
          <label htmlFor={`auth-${field.name}`} className="text-sm font-medium text-cream">
            {field.label}
          </label>
          <input
            id={`auth-${field.name}`}
            name={field.name}
            type={field.type}
            autoComplete={field.autoComplete}
            required
            minLength={mode === "signup" && field.type === "password" ? PASSWORD_MIN : undefined}
            defaultValue={field.name === "email" ? state.email : undefined}
            aria-describedby={field.hint ? `auth-${field.name}-hint` : undefined}
            className="mt-1.5 h-12 w-full rounded-xl border border-white/10 bg-black/40 px-3.5 text-[15px] text-cream placeholder:text-faint focus:border-gold/60 focus:outline-none"
          />
          {field.hint && (
            <p id={`auth-${field.name}-hint`} className="mt-1 text-xs text-muted">
              {field.hint}
            </p>
          )}
        </div>
      ))}
      <p aria-live="polite" role={state.error ? "alert" : undefined} className="min-h-5 text-sm text-bad">
        {state.error ?? ""}
      </p>
      <button type="submit" className="btn btn-gold w-full" disabled={pending}>
        <Icon className="h-4 w-4" aria-hidden />
        {pending ? "One moment…" : mode === "login" ? "Sign in" : "Create my account"}
      </button>
    </form>
  );
}
