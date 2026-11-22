import { env, isConfigured } from "@content-engine/config";

export interface AuthSettings {
  url: string;
  anonKey: string;
  ownerEmail: string;
}

/** Sign-in settings, or null when not configured (local sample preview only). */
export function authSettings(): AuthSettings | null {
  if (!isConfigured("auth")) return null;
  const values = env();
  return { url: values.SUPABASE_URL!, anonKey: values.SUPABASE_ANON_KEY!, ownerEmail: values.OWNER_EMAIL! };
}
