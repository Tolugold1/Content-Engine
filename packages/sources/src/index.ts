import { env, isConfigured } from "@content-engine/config";
import { errorMessage, SOURCES, UNIT_PRICES, type RawItem, type Reaction, type UsageRecord } from "@content-engine/core";
import { ALL_SOURCES, type SourceAdapter } from "./adapters";
import { fetchJson } from "./http";

export { ALL_SOURCES, fixturesToItems, type SourceAdapter } from "./adapters";
export { parseFeed, parseGoogleTrends } from "./feeds";
export { SourceError } from "./http";

export interface CollectResult {
  items: RawItem[];
  health: Array<{ name: string; ok: boolean; note: string }>;
  usage: Array<Omit<UsageRecord, "trendId">>;
}

/** Runs every adapter in parallel. A failing source is reported, never fatal. */
export async function collectTrends(adapters: SourceAdapter[] = ALL_SOURCES): Promise<CollectResult> {
  const results = await Promise.all(
    adapters.map(async (adapter) => {
      if (!adapter.enabled()) return { adapter, items: [] as RawItem[], ok: true, note: "Not configured (skipped)" };
      try {
        const { items, usage } = await adapter.fetch();
        return { adapter, items, usage, ok: true, note: `${items.length} items` };
      } catch (error) {
        return { adapter, items: [] as RawItem[], ok: false, note: errorMessage(error).slice(0, 200) };
      }
    }),
  );
  return {
    items: dedupeItems(results.flatMap((result) => result.items)),
    health: results.map((result) => ({ name: result.adapter.name, ok: result.ok, note: result.note })),
    usage: results.flatMap((result) => ("usage" in result && result.usage ? [result.usage] : [])),
  };
}

/** Drops exact duplicates (same URL, or same title from the same source). */
export function dedupeItems(items: RawItem[]): RawItem[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = item.url ?? `${item.source}|${item.title.toLowerCase()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

interface SearchResponse {
  data?: Array<{
    id: string;
    text: string;
    public_metrics?: { like_count?: number; retweet_count?: number; reply_count?: number; quote_count?: number };
  }>;
}

/** Pulls the most relevant recent posts about a story (paid per post read). */
export async function searchReactions(
  query: string,
  max = SOURCES.reactionsPerStory,
): Promise<{ reactions: Reaction[]; usage: Omit<UsageRecord, "trendId"> | null }> {
  if (!isConfigured("xApi")) return { reactions: [], usage: null };
  const params = new URLSearchParams({
    query: `${query} -is:retweet`,
    max_results: String(Math.min(100, Math.max(10, max))),
    sort_order: "relevancy",
    "tweet.fields": "public_metrics,created_at",
  });
  const body = await fetchJson<SearchResponse>("X search", `https://api.x.com/2/tweets/search/recent?${params}`, {
    headers: { authorization: `Bearer ${env().X_BEARER_TOKEN}` },
  });
  const reactions = (body.data ?? []).map((post) => ({
    text: post.text,
    likes: post.public_metrics?.like_count ?? 0,
    reposts: (post.public_metrics?.retweet_count ?? 0) + (post.public_metrics?.quote_count ?? 0),
    replies: post.public_metrics?.reply_count ?? 0,
    url: `https://x.com/i/web/status/${post.id}`,
  }));
  return {
    reactions: reactions.sort((a, b) => b.likes + b.reposts - (a.likes + a.reposts)),
    usage: {
      provider: "x",
      stage: "reactions",
      model: "x-search-recent",
      promptVersion: null,
      inputTokens: 0,
      outputTokens: 0,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
      units: reactions.length,
      costUsd: reactions.length * UNIT_PRICES.xPostRead,
      latencyMs: 0,
    },
  };
}

interface TweetLookup {
  data?: {
    public_metrics?: { impression_count?: number; like_count?: number; reply_count?: number; retweet_count?: number; quote_count?: number };
  };
}

/** Public metrics for one of your own X posts. */
export async function xPostMetrics(postUrl: string) {
  const id = postUrl.match(/status\/(\d+)/)?.[1];
  if (!id || !isConfigured("xApi")) return null;
  const body = await fetchJson<TweetLookup>("X lookup", `https://api.x.com/2/tweets/${id}?tweet.fields=public_metrics`, {
    headers: { authorization: `Bearer ${env().X_BEARER_TOKEN}` },
  });
  const m = body.data?.public_metrics;
  if (!m) return null;
  return {
    views: m.impression_count ?? 0,
    likes: m.like_count ?? 0,
    comments: m.reply_count ?? 0,
    shares: (m.retweet_count ?? 0) + (m.quote_count ?? 0),
  };
}

/** Public statistics for a YouTube video or Short (free with an API key). */
export async function youtubeVideoMetrics(videoUrl: string) {
  const id = videoUrl.match(/(?:shorts\/|v=|youtu\.be\/)([\w-]{11})/)?.[1];
  if (!id || !isConfigured("youtube")) return null;
  const params = new URLSearchParams({ part: "statistics", id, key: env().YOUTUBE_API_KEY ?? "" });
  const body = await fetchJson<{ items?: Array<{ statistics?: { viewCount?: string; likeCount?: string; commentCount?: string } }> }>(
    "YouTube stats",
    `https://www.googleapis.com/youtube/v3/videos?${params}`,
  );
  const s = body.items?.[0]?.statistics;
  if (!s) return null;
  return { views: Number(s.viewCount ?? 0), likes: Number(s.likeCount ?? 0), comments: Number(s.commentCount ?? 0), shares: 0 };
}
