import { z } from "zod";

/** Empty strings (e.g. an unfilled line copied from .env.example) count as "not set". */
const optional = z.preprocess((value) => (value === "" ? undefined : value), z.string().optional());

const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  APP_URL: z.preprocess((v) => (v === "" ? undefined : v), z.string().url().default("http://localhost:3000")),
  WORKER_PORT: z.preprocess((v) => (v === "" ? undefined : v), z.coerce.number().int().default(3001)),

  SUPABASE_URL: optional,
  SUPABASE_SERVICE_ROLE_KEY: optional,

  ANTHROPIC_API_KEY: optional,

  ELEVENLABS_API_KEY: optional,
  ELEVENLABS_VOICE_ID: optional,
  ELEVENLABS_MODEL_ID: z.preprocess((v) => (v === "" ? undefined : v), z.string().default("eleven_multilingual_v2")),

  X_BEARER_TOKEN: optional,
  YOUTUBE_API_KEY: optional,
  FOOTBALL_DATA_API_KEY: optional,

  TELEGRAM_BOT_TOKEN: optional,
  TELEGRAM_CHAT_ID: optional,
  TELEGRAM_WEBHOOK_SECRET: optional,

  R2_ACCOUNT_ID: optional,
  R2_ACCESS_KEY_ID: optional,
  R2_SECRET_ACCESS_KEY: optional,
  R2_BUCKET: optional,

  DASHBOARD_PASSWORD: optional,
  DASHBOARD_TIMEZONE: z.preprocess((v) => (v === "" ? undefined : v), z.string().default("Africa/Lagos")),

  INNGEST_DEV: optional,
  INNGEST_EVENT_KEY: optional,
  INNGEST_BASE_URL: optional,

  REMOTION_BROWSER_EXECUTABLE: optional,
  REMOTION_LICENSE_KEY: optional,
});

export type Env = z.infer<typeof EnvSchema>;

let cached: Env | undefined;

/** Parsed, validated environment. Parsed once per process. */
export function env(): Env {
  cached ??= EnvSchema.parse(process.env);
  return cached;
}

/** For tests: re-read process.env on the next call. */
export function resetEnvCache(): void {
  cached = undefined;
}

/** Each feature and the keys it needs. Used for errors, the health endpoint and the setup guide. */
export const FEATURES = {
  database: ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"],
  claude: ["ANTHROPIC_API_KEY"],
  voice: ["ELEVENLABS_API_KEY", "ELEVENLABS_VOICE_ID"],
  storage: ["R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET"],
  telegram: ["TELEGRAM_BOT_TOKEN", "TELEGRAM_CHAT_ID", "TELEGRAM_WEBHOOK_SECRET"],
  xApi: ["X_BEARER_TOKEN"],
  youtube: ["YOUTUBE_API_KEY"],
  football: ["FOOTBALL_DATA_API_KEY"],
} as const satisfies Record<string, readonly (keyof Env)[]>;

export type Feature = keyof typeof FEATURES;

/** Section of docs/SETUP.md that explains each feature's keys. */
export const FEATURE_DOCS: Record<Feature, string> = {
  database: "supabase",
  claude: "claude",
  voice: "elevenlabs",
  storage: "cloudflare-r2",
  telegram: "telegram",
  xApi: "x-api",
  youtube: "youtube",
  football: "football-data",
};

export class MissingConfigError extends Error {
  constructor(
    readonly feature: Feature,
    readonly missing: string[],
  ) {
    super(`${feature} is not configured: set ${missing.join(", ")} (see docs/SETUP.md#${FEATURE_DOCS[feature]})`);
    this.name = "MissingConfigError";
  }
}

export function isConfigured(feature: Feature): boolean {
  const values = env();
  return FEATURES[feature].every((key) => Boolean(values[key]));
}

type FeatureValues<F extends Feature> = { [K in (typeof FEATURES)[F][number]]: string };

/** Returns the keys a feature needs, or throws a clear error naming what is missing. */
export function requireFeature<F extends Feature>(feature: F): FeatureValues<F> {
  const values = env();
  const keys = FEATURES[feature] as readonly (keyof Env)[];
  const missing = keys.filter((key) => !values[key]);
  if (missing.length > 0) throw new MissingConfigError(feature, missing as string[]);
  return Object.fromEntries(keys.map((key) => [key, String(values[key])])) as FeatureValues<F>;
}

/** Which features are configured; safe to expose (no values). */
export function featureStatus(): Record<Feature, boolean> {
  return Object.fromEntries(Object.keys(FEATURES).map((feature) => [feature, isConfigured(feature as Feature)])) as Record<
    Feature,
    boolean
  >;
}

/** Events can be sent when a local Inngest dev server or a key/self-hosted URL is configured. */
export function eventsEnabled(): boolean {
  const values = env();
  return Boolean(values.INNGEST_DEV || values.INNGEST_EVENT_KEY || values.INNGEST_BASE_URL);
}
