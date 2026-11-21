import { Draft, Trend, type ChatSession, type Evidence, type SourceHealth, type UsageRecord } from "@content-engine/core";

/** Row shapes returned by PostgREST for the selects in supabase.ts. */
export interface EvidenceRow {
  id: string;
  outlet: string;
  title: string;
  url: string;
  snippet: string | null;
  fetched_at: string;
}

export interface TrendRow {
  id: string;
  title: string;
  sources: string[];
  mood: string;
  reaction_summary: string;
  top_takes: string[];
  virality_score: number | string;
  detected_at: string;
  evidence?: EvidenceRow[];
  usage?: Array<{ cost_usd: number | string }>;
}

export interface DraftRow {
  id: string;
  slug: string;
  title: string;
  hook: string;
  tone: string;
  category: string;
  status: string;
  scenes: unknown;
  captions: unknown;
  hashtags: string[];
  engagement_question: string;
  duration_sec: number | string;
  video_key: string | null;
  still_key: string | null;
  audio_key: string | null;
  telegram_chat_id: string | null;
  telegram_message_id: number | string | null;
  created_at: string;
  trend: TrendRow;
  claims: Array<{
    id: string;
    position: number;
    text: string;
    status: string;
    evidence_ids: string[];
    verdict: string;
    note: string | null;
  }>;
  review: ReviewRow | ReviewRow[] | null;
  edits: Array<{ field: string; before: string; after: string; channel: string; created_at: string }>;
  posts: Array<{ platform: string; url: string; posted_at: string; via: string }>;
  metrics: Array<{ platform: string; views: number; likes: number; comments: number; shares: number; checked_at: string; source: string }>;
  events: Array<{ id: number; stage: string; note: string | null; at: string }>;
}

interface ReviewRow {
  decision: string;
  channel: string;
  reason: string | null;
  created_at: string;
}

export const DRAFT_SELECT =
  "*, trend:trends(*, evidence(*), usage(cost_usd)), claims(*), review:reviews(*), edits(*), posts(*), metrics(*), events:pipeline_events(*)";

export function toEvidence(row: EvidenceRow): Evidence {
  return {
    id: row.id,
    outlet: row.outlet,
    title: row.title,
    url: row.url,
    ...(row.snippet ? { snippet: row.snippet } : {}),
    fetchedAt: row.fetched_at,
  };
}

export function toTrend(row: TrendRow): Trend {
  return Trend.parse({
    id: row.id,
    title: row.title,
    sources: row.sources,
    mood: row.mood,
    reactionSummary: row.reaction_summary,
    topTakes: row.top_takes,
    viralityScore: Number(row.virality_score),
    detectedAt: row.detected_at,
  });
}

/** Maps a joined draft row to the domain Draft, validating the result. */
export function toDraft(row: DraftRow): Draft {
  const review = Array.isArray(row.review) ? row.review[0] : row.review;
  return Draft.parse({
    id: row.id,
    slug: row.slug,
    title: row.title,
    hook: row.hook,
    tone: row.tone,
    category: row.category,
    status: row.status,
    createdAt: row.created_at,
    trend: toTrend(row.trend),
    scenes: row.scenes,
    captions: row.captions,
    hashtags: row.hashtags,
    engagementQuestion: row.engagement_question,
    claims: [...row.claims]
      .sort((a, b) => a.position - b.position)
      .map((claim) => ({
        id: claim.id,
        text: claim.text,
        status: claim.status,
        evidenceIds: claim.evidence_ids,
        verdict: claim.verdict,
        ...(claim.note ? { note: claim.note } : {}),
      })),
    evidence: (row.trend.evidence ?? []).map(toEvidence),
    durationSec: Number(row.duration_sec),
    media: { video: row.video_key, still: row.still_key, audio: row.audio_key },
    costUsd: (row.trend.usage ?? []).reduce((sum, item) => sum + Number(item.cost_usd), 0),
    telegram:
      row.telegram_chat_id && row.telegram_message_id ? { chatId: row.telegram_chat_id, messageId: Number(row.telegram_message_id) } : null,
    review: review
      ? {
          decision: review.decision,
          channel: review.channel,
          at: review.created_at,
          ...(review.reason ? { reason: review.reason } : {}),
        }
      : null,
    edits: row.edits.map((edit) => ({ ...edit, at: edit.created_at })),
    posts: row.posts.map((post) => ({ platform: post.platform, url: post.url, postedAt: post.posted_at, via: post.via })),
    metrics: row.metrics.map((metric) => ({ ...metric, checkedAt: metric.checked_at })),
    timeline: [...row.events]
      .sort((a, b) => a.at.localeCompare(b.at) || a.id - b.id)
      .map((event) => ({ stage: event.stage, at: event.at, ...(event.note ? { note: event.note } : {}) })),
  });
}

export function toUsage(row: Record<string, unknown>): UsageRecord {
  return {
    trendId: (row.trend_id as string | null) ?? null,
    provider: row.provider as UsageRecord["provider"],
    stage: String(row.stage),
    model: String(row.model),
    promptVersion: (row.prompt_version as string | null) ?? null,
    inputTokens: Number(row.input_tokens),
    outputTokens: Number(row.output_tokens),
    cacheReadTokens: Number(row.cache_read_tokens),
    cacheWriteTokens: Number(row.cache_write_tokens),
    units: Number(row.units),
    costUsd: Number(row.cost_usd),
    latencyMs: Number(row.latency_ms),
  };
}

export function fromUsage(record: UsageRecord) {
  return {
    trend_id: record.trendId,
    provider: record.provider,
    stage: record.stage,
    model: record.model,
    prompt_version: record.promptVersion,
    input_tokens: record.inputTokens,
    output_tokens: record.outputTokens,
    cache_read_tokens: record.cacheReadTokens,
    cache_write_tokens: record.cacheWriteTokens,
    units: record.units,
    cost_usd: record.costUsd,
    latency_ms: record.latencyMs,
  };
}

export function toChatSession(row: Record<string, unknown>): ChatSession {
  return {
    chatId: String(row.chat_id),
    action: row.action as ChatSession["action"],
    draftId: String(row.draft_id),
    platform: (row.platform as ChatSession["platform"]) ?? null,
    expiresAt: String(row.expires_at),
  };
}

export function toSourceHealth(row: Record<string, unknown>): SourceHealth {
  return { name: String(row.name), ok: Boolean(row.ok), note: String(row.note), checkedAt: String(row.checked_at) };
}

/** Strips characters that have meaning in PostgREST filter syntax. */
export function sanitiseSearch(q: string): string {
  return q
    .replace(/[,()*%\\:."']/g, " ")
    .trim()
    .slice(0, 80);
}
