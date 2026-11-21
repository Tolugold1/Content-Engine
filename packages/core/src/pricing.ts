/**
 * Prices used for cost tracking (USD). Check the providers' pricing pages when
 * budgeting; these drive the dashboard's cost numbers, not billing.
 */
export const MODEL_PRICES: Record<string, { input: number; output: number; cacheRead: number; cacheWrite: number }> = {
  // Per million tokens.
  "claude-opus-5-5": { input: 4, output: 20, cacheRead: 0.2, cacheWrite: 5 },
  "claude-sonnet-5-5": { input: 2, output: 10, cacheRead: 0.1, cacheWrite: 2.5 },
  "claude-haiku-5-5": { input: 0.1, output: 0.5, cacheRead: 0.01, cacheWrite: 0.125 },
};

export const UNIT_PRICES = {
  /** Claude web search, per search. */
  webSearch: 0.01,
  /** X API pay-per-use reads (per post) and trend lookups (per request). */
  xPostRead: 0.005,
  xTrendsRequest: 0.01,
  /** ElevenLabs marginal cost per character on the Creator plan ($22 / ~121k credits). */
  voiceCharacter: 22 / 121_000,
} as const;

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  webSearches: number;
}

export function claudeCost(model: string, usage: TokenUsage): number {
  const price = MODEL_PRICES[model];
  const tokens = price
    ? (usage.inputTokens * price.input +
        usage.outputTokens * price.output +
        usage.cacheReadTokens * price.cacheRead +
        usage.cacheWriteTokens * price.cacheWrite) /
      1_000_000
    : 0;
  return tokens + usage.webSearches * UNIT_PRICES.webSearch;
}
