import { Platform } from "@content-engine/core";
import { z } from "zod";
import { MODELS } from "./client";
import { runStructured, type AiContext } from "./run";

export const VISION_PROMPT_VERSION = "vision-v1";

const AnalyticsSchema = z.object({
  readable: z.boolean().describe("False if this is not a post analytics screen or the numbers cannot be read"),
  platform: z.union([Platform, z.literal("unknown")]),
  views: z.number().int(),
  likes: z.number().int(),
  comments: z.number().int(),
  shares: z.number().int(),
});
export type AnalyticsReading = z.infer<typeof AnalyticsSchema>;

const SYSTEM = `You read numbers from a screenshot of one social media post's analytics (TikTok, Instagram, YouTube, X or Facebook).
Identify the app from its interface. Convert abbreviations to whole numbers (1.2K = 1200, 3.4M = 3400000).
Use 0 for a number that is not shown. If the image is not a post analytics screen, set readable to false.`;

/** Extracts views, likes, comments and shares from an analytics screenshot. */
export async function readAnalyticsScreenshot(
  ctx: AiContext,
  image: { base64: string; mediaType: "image/jpeg" | "image/png" | "image/webp" },
): Promise<AnalyticsReading> {
  return runStructured(ctx, {
    stage: "metrics_vision",
    model: MODELS.vision,
    promptVersion: VISION_PROMPT_VERSION,
    effort: "low",
    system: SYSTEM,
    content: [
      { type: "image", source: { type: "base64", media_type: image.mediaType, data: image.base64 } },
      { type: "text", text: "Read the analytics in this screenshot." },
    ],
    schema: AnalyticsSchema,
    maxTokens: 2_000,
  });
}
