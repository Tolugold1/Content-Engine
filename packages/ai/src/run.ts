import type Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { claudeCost, type UsageRecord } from "@content-engine/core";
import type { z } from "zod";
import { FALLBACK_BETA, FALLBACK_MODELS, getClaude } from "./client";

export type UsageSink = (record: UsageRecord) => Promise<void>;

/** Per-call context: where costs are recorded and which trend they belong to. */
export interface AiContext {
  recordUsage: UsageSink;
  trendId: string | null;
  client?: Anthropic;
}

export class AiRefusalError extends Error {
  constructor(readonly stage: string) {
    super(`Claude declined the ${stage} request`);
    this.name = "AiRefusalError";
  }
}

export class AiOutputError extends Error {
  constructor(
    readonly stage: string,
    reason: string,
  ) {
    super(`Claude ${stage} output unusable: ${reason}`);
    this.name = "AiOutputError";
  }
}

type BetaUsage = Anthropic.Beta.Messages.BetaUsage;
type Effort = "low" | "medium" | "high" | "xhigh" | "max";

/** Records one call's tokens and cost against the trend. */
export async function recordClaudeUsage(
  ctx: AiContext,
  call: { stage: string; model: string; promptVersion: string; usage: BetaUsage; startedAt: number },
): Promise<void> {
  const usage = {
    inputTokens: call.usage.input_tokens,
    outputTokens: call.usage.output_tokens,
    cacheReadTokens: call.usage.cache_read_input_tokens ?? 0,
    cacheWriteTokens: call.usage.cache_creation_input_tokens ?? 0,
    webSearches: call.usage.server_tool_use?.web_search_requests ?? 0,
  };
  await ctx.recordUsage({
    trendId: ctx.trendId,
    provider: "anthropic",
    stage: call.stage,
    model: call.model,
    promptVersion: call.promptVersion,
    inputTokens: usage.inputTokens,
    outputTokens: usage.outputTokens,
    cacheReadTokens: usage.cacheReadTokens,
    cacheWriteTokens: usage.cacheWriteTokens,
    units: usage.webSearches,
    costUsd: claudeCost(call.model, usage),
    latencyMs: Date.now() - call.startedAt,
  });
}

/** Options shared by every request: refusal fallback on supported models. */
export function fallbackOptions(model: string) {
  return FALLBACK_MODELS.has(model) ? { betas: [FALLBACK_BETA], fallbacks: "default" as const } : {};
}

export interface StructuredRequest<S extends z.ZodType> {
  stage: string;
  model: string;
  promptVersion: string;
  effort: Effort;
  /** Stable instructions; cached so repeated calls only pay for the new content. */
  system: string;
  content: Anthropic.Beta.Messages.BetaContentBlockParam[] | string;
  schema: S;
  maxTokens?: number;
}

/** One structured-output call: validated JSON back, refusals and truncation turned into errors, cost recorded. */
export async function runStructured<S extends z.ZodType>(ctx: AiContext, request: StructuredRequest<S>): Promise<z.infer<S>> {
  const client = ctx.client ?? getClaude();
  const startedAt = Date.now();
  const response = await client.beta.messages.parse({
    model: request.model,
    max_tokens: request.maxTokens ?? 16_000,
    system: [{ type: "text", text: request.system, cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content: request.content }],
    output_config: { effort: request.effort, format: betaZodOutputFormat(request.schema) },
    ...fallbackOptions(request.model),
  });
  await recordClaudeUsage(ctx, {
    stage: request.stage,
    model: request.model,
    promptVersion: request.promptVersion,
    usage: response.usage,
    startedAt,
  });

  if (response.stop_reason === "refusal") throw new AiRefusalError(request.stage);
  if (response.stop_reason === "max_tokens") throw new AiOutputError(request.stage, "hit max_tokens");
  if (response.parsed_output == null) throw new AiOutputError(request.stage, "did not match the schema");
  return response.parsed_output as z.infer<S>;
}
