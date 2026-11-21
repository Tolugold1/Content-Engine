import { z } from "zod";
import { Category, Platform, ReviewChannel } from "./schemas";

/**
 * Event contract between the pipeline, the Telegram bot and the dashboard.
 *
 * scout/requested            dashboard "Scan now" -> trend scout (also runs on a schedule)
 * story/selected             trend scout -> draft producer (one event per story)
 * draft/ready                producer -> Telegram notification + review lifecycle
 *                            (Telegram always gets this; the dashboard reads the same row)
 * draft/reviewed             web or Telegram -> lifecycle resumes, other channel syncs
 * draft/caption-edited       web or Telegram -> audit trail
 * draft/posted               web or Telegram -> metrics tracker (+24h / +72h)
 * metrics/screenshot-received Telegram photo -> vision extraction
 */
export const EVENT_SCHEMAS = {
  "scout/requested": z.object({ requestedBy: z.enum(["schedule", "dashboard", "cli"]) }),
  "story/selected": z.object({
    title: z.string(),
    sources: z.array(z.string()),
    searchQuery: z.string(),
    category: Category,
    summary: z.string(),
    isSerious: z.boolean(),
    score: z.number(),
    /** News items about the story found by the scout; they become evidence. */
    relatedNews: z.array(z.object({ url: z.string(), title: z.string(), outlet: z.string(), snippet: z.string().optional() })),
  }),
  "draft/ready": z.object({ draftId: z.string() }),
  "draft/reviewed": z.object({
    draftId: z.string(),
    decision: z.enum(["approved", "rejected"]),
    channel: ReviewChannel,
  }),
  "draft/caption-edited": z.object({ draftId: z.string(), platform: Platform, channel: ReviewChannel }),
  "draft/posted": z.object({ draftId: z.string(), platform: Platform, url: z.string() }),
  "metrics/screenshot-received": z.object({
    draftId: z.string(),
    platform: Platform,
    fileId: z.string(),
    chatId: z.string(),
  }),
} as const;

export type EventName = keyof typeof EVENT_SCHEMAS;
export type EventPayloads = { [K in EventName]: z.infer<(typeof EVENT_SCHEMAS)[K]> };
