import { z } from "zod";

/**
 * Shared data contracts for the whole engine: pipeline workers, the Telegram
 * bot and the web dashboard all read and write these shapes, so a draft looks
 * the same no matter which channel touches it.
 */

export const PLATFORMS = ["tiktok", "instagram", "youtube", "x", "facebook"] as const;
export const Platform = z.enum(PLATFORMS);
export type Platform = z.infer<typeof Platform>;

export const Tone = z.enum(["comedy", "explainer", "hype"]);
export type Tone = z.infer<typeof Tone>;

export const Category = z.enum(["celebrity", "football", "news", "culture"]);
export type Category = z.infer<typeof Category>;

export const Mood = z.enum(["jokes", "debate", "outrage", "hype", "sad"]);
export type Mood = z.infer<typeof Mood>;

export const DraftStatus = z.enum(["rendering", "pending_review", "approved", "rejected", "posted", "failed"]);
export type DraftStatus = z.infer<typeof DraftStatus>;

/** confirmed = 2+ independent outlets, reported = 1 outlet, chatter = social posts only. */
export const ClaimStatus = z.enum(["confirmed", "reported", "chatter"]);
export type ClaimStatus = z.infer<typeof ClaimStatus>;

/** Verdict from the judge model that checks each claim against stored evidence. */
export const JudgeVerdict = z.enum(["supported", "misframed", "unsupported"]);
export type JudgeVerdict = z.infer<typeof JudgeVerdict>;

export const Evidence = z.object({
  id: z.string(),
  outlet: z.string(),
  title: z.string(),
  url: z.string(),
  /** The passage that supports claims (from a web search citation or feed summary). */
  snippet: z.string().optional(),
  fetchedAt: z.string(),
});
export type Evidence = z.infer<typeof Evidence>;

export const Claim = z.object({
  id: z.string(),
  text: z.string(),
  status: ClaimStatus,
  evidenceIds: z.array(z.string()),
  verdict: JudgeVerdict,
  note: z.string().optional(),
});
export type Claim = z.infer<typeof Claim>;

export const Scene = z.object({
  index: z.number().int(),
  text: z.string(),
  visual: z.string(),
  durationSec: z.number().positive(),
});
export type Scene = z.infer<typeof Scene>;

export const Trend = z.object({
  id: z.string(),
  title: z.string(),
  sources: z.array(z.string()),
  mood: Mood,
  reactionSummary: z.string(),
  topTakes: z.array(z.string()),
  viralityScore: z.number().min(1).max(10),
  detectedAt: z.string(),
});
export type Trend = z.infer<typeof Trend>;

export const ReviewChannel = z.enum(["web", "telegram"]);
export type ReviewChannel = z.infer<typeof ReviewChannel>;

export const Review = z.object({
  decision: z.enum(["approved", "rejected"]),
  channel: ReviewChannel,
  at: z.string(),
  reason: z.string().optional(),
});
export type Review = z.infer<typeof Review>;

/** Every human edit is kept: it is the feedback dataset for improving prompts. */
export const Edit = z.object({
  field: z.string(),
  before: z.string(),
  after: z.string(),
  channel: ReviewChannel,
  at: z.string(),
});
export type Edit = z.infer<typeof Edit>;

export const PostRecord = z.object({
  platform: Platform,
  url: z.string(),
  postedAt: z.string(),
  via: z.enum(["manual", "api"]),
});
export type PostRecord = z.infer<typeof PostRecord>;

export const Metrics = z.object({
  platform: Platform,
  views: z.number().int().nonnegative(),
  likes: z.number().int().nonnegative(),
  comments: z.number().int().nonnegative(),
  shares: z.number().int().nonnegative(),
  checkedAt: z.string(),
  source: z.enum(["api", "screenshot", "manual"]),
});
export type Metrics = z.infer<typeof Metrics>;

export const PipelineStage = z.enum([
  "trend_detected",
  "reactions_summarised",
  "script_written",
  "claims_checked",
  "voiced",
  "rendered",
  "notified_telegram",
  "reviewed",
  "caption_edited",
  "posted",
  "metrics_pulled",
  "failed",
]);
export type PipelineStage = z.infer<typeof PipelineStage>;

export const TimelineEvent = z.object({
  stage: PipelineStage,
  at: z.string(),
  note: z.string().optional(),
});
export type TimelineEvent = z.infer<typeof TimelineEvent>;

/** Storage keys (R2), or "sample:" keys in sample mode. The app turns keys into URLs. */
export const DraftMedia = z.object({
  video: z.string().nullable(),
  still: z.string().nullable(),
  audio: z.string().nullable(),
});
export type DraftMedia = z.infer<typeof DraftMedia>;

export const Captions = z.object({
  tiktok: z.string(),
  instagram: z.string(),
  youtube: z.string(),
  x: z.string(),
  facebook: z.string(),
});
export type Captions = z.infer<typeof Captions>;

export const Draft = z.object({
  id: z.string(),
  slug: z.string(),
  title: z.string(),
  hook: z.string(),
  tone: Tone,
  category: Category,
  status: DraftStatus,
  createdAt: z.string(),
  trend: Trend,
  scenes: z.array(Scene),
  captions: Captions,
  hashtags: z.array(z.string()),
  engagementQuestion: z.string(),
  claims: z.array(Claim),
  evidence: z.array(Evidence),
  durationSec: z.number().positive(),
  media: DraftMedia,
  costUsd: z.number().nonnegative(),
  telegram: z.object({ chatId: z.string(), messageId: z.number().int() }).nullable(),
  review: Review.nullable(),
  edits: z.array(Edit),
  posts: z.array(PostRecord),
  metrics: z.array(Metrics),
  timeline: z.array(TimelineEvent),
});
export type Draft = z.infer<typeof Draft>;

/** A raw item from any trend source, before clustering. */
export const RawItem = z.object({
  source: z.string(),
  kind: z.enum(["trend", "news", "video", "fixture"]),
  title: z.string(),
  url: z.string().optional(),
  summary: z.string().optional(),
  publishedAt: z.string().optional(),
  volume: z.number().optional(),
});
export type RawItem = z.infer<typeof RawItem>;

/** A post reacting to a story (from X search). */
export const Reaction = z.object({
  text: z.string(),
  likes: z.number(),
  reposts: z.number(),
  replies: z.number(),
  url: z.string(),
});
export type Reaction = z.infer<typeof Reaction>;

/** Input for a new draft; ids, review state and history are created by the repository. */
export type NewDraft = Omit<
  Draft,
  "id" | "createdAt" | "trend" | "evidence" | "review" | "edits" | "posts" | "metrics" | "timeline" | "telegram"
> & { trendId: string; timeline?: TimelineEvent[] };

export const ChatAction = z.enum(["reject_reason", "edit_caption", "post_link", "metrics_screenshot"]);
export type ChatAction = z.infer<typeof ChatAction>;

/** What the Telegram bot is waiting for in a chat (a reason, a caption, a link or a screenshot). */
export const ChatSession = z.object({
  chatId: z.string(),
  action: ChatAction,
  draftId: z.string(),
  platform: Platform.nullable(),
  expiresAt: z.string(),
});
export type ChatSession = z.infer<typeof ChatSession>;

/** One paid API call (Claude, ElevenLabs or X), tied to the trend it was made for. */
export const UsageRecord = z.object({
  trendId: z.string().nullable(),
  provider: z.enum(["anthropic", "elevenlabs", "x"]),
  stage: z.string(),
  model: z.string(),
  promptVersion: z.string().nullable(),
  inputTokens: z.number().int(),
  outputTokens: z.number().int(),
  cacheReadTokens: z.number().int(),
  cacheWriteTokens: z.number().int(),
  units: z.number(),
  costUsd: z.number(),
  latencyMs: z.number().int(),
});
export type UsageRecord = z.infer<typeof UsageRecord>;

export const SourceHealth = z.object({
  name: z.string(),
  ok: z.boolean(),
  note: z.string(),
  checkedAt: z.string(),
});
export type SourceHealth = z.infer<typeof SourceHealth>;
