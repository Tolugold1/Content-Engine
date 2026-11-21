import Anthropic from "@anthropic-ai/sdk";
import { requireFeature } from "@content-engine/config";

/**
 * Model routing: cheap Haiku for high-volume triage and reading screenshots,
 * Opus for the work viewers see (scripts) and the claim checker.
 */
export const MODELS = {
  triage: "claude-haiku-5-5",
  vision: "claude-haiku-5-5",
  research: "claude-opus-5-5",
  writer: "claude-opus-5-5",
  judge: "claude-opus-5-5",
} as const;

/** Models that support server-side refusal fallbacks. */
export const FALLBACK_MODELS: ReadonlySet<string> = new Set(["claude-opus-5-5", "claude-sonnet-5-5"]);
export const FALLBACK_BETA = "server-side-fallback-2026-07-01";

let client: Anthropic | undefined;

export function getClaude(): Anthropic {
  client ??= new Anthropic({ apiKey: requireFeature("claude").ANTHROPIC_API_KEY, maxRetries: 3 });
  return client;
}
