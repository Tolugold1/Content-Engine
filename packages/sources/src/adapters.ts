import { env, isConfigured } from "@content-engine/config";
import { SOURCES, UNIT_PRICES, type RawItem, type UsageRecord } from "@content-engine/core";
import { parseFeed, parseGoogleTrends } from "./feeds";
import { fetchJson, fetchText, SourceError } from "./http";

/** A trend source. Adapters never throw for "not configured"; they report it as skipped. */
export interface SourceAdapter {
  name: string;
  enabled(): boolean;
  fetch(): Promise<{ items: RawItem[]; usage?: Omit<UsageRecord, "trendId"> }>;
}

function usage(stage: string, model: string, units: number, costUsd: number): Omit<UsageRecord, "trendId"> {
  return {
    provider: "x",
    stage,
    model,
    promptVersion: null,
    inputTokens: 0,
    outputTokens: 0,
    cacheReadTokens: 0,
    cacheWriteTokens: 0,
    units,
    costUsd,
    latencyMs: 0,
  };
}

/**
 * X trends for Nigeria (pay-per-use API). Field names are read defensively
 * because the v2 trends payload has changed shape over time.
 */
export const xTrends: SourceAdapter = {
  name: "X trends (NG)",
  enabled: () => isConfigured("xApi"),
  async fetch() {
    const body = await fetchJson<{ data?: Array<Record<string, unknown>> }>(
      this.name,
      `https://api.x.com/2/trends/by/woeid/${SOURCES.xWoeid}?max_trends=30`,
      { headers: { authorization: `Bearer ${env().X_BEARER_TOKEN}` } },
    );
    const items = (body.data ?? [])
      .map((trend) => {
        const title = String(trend.trend_name ?? trend.name ?? "").trim();
        const volume = Number(trend.tweet_count ?? trend.post_count ?? 0) || undefined;
        return { source: this.name, kind: "trend" as const, title, ...(volume ? { volume } : {}) };
      })
      .filter((item) => item.title);
    return { items, usage: usage("trends", "x-trends-by-woeid", 1, UNIT_PRICES.xTrendsRequest) };
  },
};

export const googleTrends: SourceAdapter = {
  name: "Google Trends NG",
  enabled: () => true,
  async fetch() {
    const xml = await fetchText(this.name, `https://trends.google.com/trending/rss?geo=${SOURCES.googleTrendsGeo}`);
    return { items: parseGoogleTrends(xml) };
  },
};

export const youtubePopular: SourceAdapter = {
  name: "YouTube most popular NG",
  enabled: () => isConfigured("youtube"),
  async fetch() {
    const params = new URLSearchParams({
      part: "snippet,statistics",
      chart: "mostPopular",
      regionCode: SOURCES.youtubeRegion,
      maxResults: "25",
      key: env().YOUTUBE_API_KEY ?? "",
    });
    const body = await fetchJson<{
      items?: Array<{ id: string; snippet?: { title?: string; channelTitle?: string }; statistics?: { viewCount?: string } }>;
    }>(this.name, `https://www.googleapis.com/youtube/v3/videos?${params}`);
    const items = (body.items ?? [])
      .filter((video) => video.snippet?.title)
      .map((video) => ({
        source: this.name,
        kind: "video" as const,
        title: video.snippet!.title!,
        url: `https://www.youtube.com/watch?v=${video.id}`,
        ...(video.snippet?.channelTitle ? { summary: `Channel: ${video.snippet.channelTitle}` } : {}),
        ...(video.statistics?.viewCount ? { volume: Number(video.statistics.viewCount) } : {}),
      }));
    return { items };
  },
};

export const newsFeeds: SourceAdapter = {
  name: "News RSS",
  enabled: () => SOURCES.feeds.length > 0,
  async fetch() {
    const since = new Date(Date.now() - 24 * 3_600_000);
    const results = await Promise.allSettled(SOURCES.feeds.map(async (url) => parseFeed(await fetchText(this.name, url), url, since)));
    const items = results.flatMap((result) => (result.status === "fulfilled" ? result.value.slice(0, 15) : []));
    const failed = results.filter((result) => result.status === "rejected").length;
    if (items.length === 0 && failed > 0) throw new SourceError(this.name, `all ${failed} feeds failed`);
    return { items };
  },
};

interface FootballMatch {
  utcDate: string;
  status: string;
  competition?: { name?: string };
  homeTeam: { name?: string; shortName?: string };
  awayTeam: { name?: string; shortName?: string };
  score?: { fullTime?: { home: number | null; away: number | null } };
}

/** Matchday content is scheduled, not discovered: today's fixtures and fresh results for followed teams. */
export const footballFixtures: SourceAdapter = {
  name: "Fixtures feed",
  enabled: () => isConfigured("football"),
  async fetch() {
    const today = new Date().toISOString().slice(0, 10);
    const params = new URLSearchParams({ competitions: SOURCES.footballCompetitions.join(","), dateFrom: today, dateTo: today });
    const body = await fetchJson<{ matches?: FootballMatch[] }>(this.name, `https://api.football-data.org/v4/matches?${params}`, {
      headers: { "X-Auth-Token": env().FOOTBALL_DATA_API_KEY ?? "" },
    });
    return { items: fixturesToItems(body.matches ?? [], new Date(), this.name) };
  },
};

export function fixturesToItems(matches: FootballMatch[], now: Date, source: string): RawItem[] {
  const followed = SOURCES.followedTeams.map((team) => team.toLowerCase());
  const isFollowed = (team: FootballMatch["homeTeam"]) =>
    followed.some((name) => [team.name, team.shortName].some((candidate) => candidate?.toLowerCase().includes(name)));
  const name = (team: FootballMatch["homeTeam"]) => team.shortName ?? team.name ?? "TBC";

  return matches
    .filter((match) => isFollowed(match.homeTeam) || isFollowed(match.awayTeam))
    .flatMap((match): RawItem[] => {
      const kickoff = new Date(match.utcDate);
      const competition = match.competition?.name ?? "Football";
      const fixture = `${name(match.homeTeam)} vs ${name(match.awayTeam)}`;
      if (match.status === "FINISHED") {
        const recent = now.getTime() - kickoff.getTime() < 5 * 3_600_000;
        const { home, away } = match.score?.fullTime ?? { home: null, away: null };
        return recent && home !== null && away !== null
          ? [
              {
                source,
                kind: "fixture",
                title: `Full time: ${name(match.homeTeam)} ${home}-${away} ${name(match.awayTeam)}`,
                summary: competition,
                publishedAt: match.utcDate,
              },
            ]
          : [];
      }
      if (["SCHEDULED", "TIMED"].includes(match.status) && kickoff.getTime() > now.getTime()) {
        return [
          {
            source,
            kind: "fixture",
            title: `${fixture} today`,
            summary: `${competition}, kickoff ${kickoff.toISOString()}`,
            publishedAt: match.utcDate,
          },
        ];
      }
      return [];
    });
}

export const ALL_SOURCES: SourceAdapter[] = [xTrends, googleTrends, youtubePopular, newsFeeds, footballFixtures];
