import {
  applyReview,
  editCaption,
  markPosted,
  ReviewConflictError,
  ReviewRuleError,
  type ChatSession,
  type Draft,
  type Evidence,
  type NewDraft,
  type Platform,
  type ReviewChannel,
  type SourceHealth,
  type Trend,
  type UsageRecord,
} from "@content-engine/core";
import { randomUUID } from "node:crypto";
import { DraftNotFoundError, type DraftFilter, type NewEvidence, type NewTrend, type Repository } from "./repository";
import { createSampleDrafts } from "./sample-data";

interface MemoryState {
  drafts: Draft[];
  trends: Map<string, Trend & { evidence: Evidence[] }>;
  usage: Array<UsageRecord & { at: string }>;
  sessions: Map<string, ChatSession>;
  health: Map<string, SourceHealth>;
}

const now = () => new Date().toISOString();

/** In-memory repository for sample mode and tests. Same rules as production. */
export class MemoryRepository implements Repository {
  readonly kind = "memory" as const;
  private readonly state: MemoryState;

  constructor(options: { seed?: boolean } = {}) {
    const drafts = options.seed === false ? [] : createSampleDrafts();
    this.state = {
      drafts,
      trends: new Map(drafts.map((draft) => [draft.trend.id, { ...draft.trend, evidence: draft.evidence }])),
      usage: [],
      sessions: new Map(),
      health: new Map(),
    };
  }

  async listDrafts(filter: DraftFilter = {}): Promise<Draft[]> {
    const q = filter.q?.trim().toLowerCase();
    return this.state.drafts
      .filter((draft) => !filter.status || draft.status === filter.status)
      .filter((draft) => !filter.tone || draft.tone === filter.tone)
      .filter(
        (draft) =>
          !q ||
          draft.title.toLowerCase().includes(q) ||
          draft.trend.title.toLowerCase().includes(q) ||
          draft.hashtags.some((tag) => tag.toLowerCase().includes(q)),
      )
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, filter.limit ?? 200)
      .map((draft) => this.withCost(draft));
  }

  async getDraft(idOrSlug: string): Promise<Draft | null> {
    const draft = this.state.drafts.find((item) => item.id === idOrSlug || item.slug === idOrSlug);
    return draft ? this.withCost(draft) : null;
  }

  async recentTrendTitles(sinceIso: string): Promise<string[]> {
    return [...this.state.trends.values()].filter((trend) => trend.detectedAt >= sinceIso).map((trend) => trend.title);
  }

  async countDraftsSince(sinceIso: string): Promise<number> {
    return this.state.drafts.filter((draft) => draft.createdAt >= sinceIso && draft.status !== "failed").length;
  }

  async listUsage(sinceIso: string): Promise<UsageRecord[]> {
    return this.state.usage.filter((record) => record.at >= sinceIso).map(({ at: _at, ...record }) => record);
  }

  async listSourceHealth(): Promise<SourceHealth[]> {
    return [...this.state.health.values()];
  }

  async saveTrend(trend: NewTrend, evidence: NewEvidence[]) {
    const saved = { ...trend, id: randomUUID(), detectedAt: now(), evidence: [] as Evidence[] };
    this.state.trends.set(saved.id, saved);
    saved.evidence = await this.addEvidence(saved.id, evidence);
    return saved;
  }

  async updateTrend(trendId: string, patch: Partial<NewTrend>): Promise<void> {
    const trend = this.state.trends.get(trendId);
    if (!trend) throw new Error(`Trend ${trendId} not found`);
    Object.assign(trend, patch);
  }

  async addEvidence(trendId: string, evidence: NewEvidence[]): Promise<Evidence[]> {
    const trend = this.state.trends.get(trendId);
    if (!trend) throw new Error(`Trend ${trendId} not found`);
    const added = evidence
      .filter((item) => !trend.evidence.some((existing) => existing.url === item.url))
      .map((item) => ({ ...item, id: randomUUID(), fetchedAt: now() }));
    trend.evidence.push(...added);
    return added;
  }

  async listEvidence(trendId: string): Promise<Evidence[]> {
    return [...(this.state.trends.get(trendId)?.evidence ?? [])];
  }

  async createDraft(input: NewDraft): Promise<Draft> {
    const trend = this.state.trends.get(input.trendId);
    if (!trend) throw new Error(`Trend ${input.trendId} not found`);
    if (this.state.drafts.some((draft) => draft.slug === input.slug)) throw new Error(`Slug ${input.slug} already exists`);
    const { evidence, ...trendFields } = trend;
    const { trendId: _trendId, timeline = [], ...fields } = input;
    const draft: Draft = {
      ...fields,
      id: randomUUID(),
      createdAt: now(),
      trend: trendFields,
      evidence,
      telegram: null,
      review: null,
      edits: [],
      posts: [],
      metrics: [],
      timeline,
    };
    this.state.drafts.push(draft);
    return draft;
  }

  async transitionDraft(id: string, change: Parameters<Repository["transitionDraft"]>[1]): Promise<Draft> {
    return this.update(id, (draft) => {
      if (!change.from.includes(draft.status)) throw new ReviewRuleError(`Cannot move a ${draft.status} draft to ${change.to}`);
      return {
        ...draft,
        status: change.to,
        media: { ...draft.media, ...change.media },
        durationSec: change.durationSec ?? draft.durationSec,
        timeline: [...draft.timeline, { stage: change.stage as Draft["timeline"][number]["stage"], at: now(), note: change.note }],
      };
    });
  }

  async addTimelineEvent(draftId: string, stage: string, note?: string): Promise<void> {
    await this.update(draftId, (draft) => ({
      ...draft,
      timeline: [...draft.timeline, { stage: stage as Draft["timeline"][number]["stage"], at: now(), note }],
    }));
  }

  async setTelegramMessage(draftId: string, chatId: string, messageId: number): Promise<void> {
    await this.update(draftId, (draft) => ({ ...draft, telegram: { chatId, messageId } }));
  }

  async addMetrics(draftId: string, metrics: Parameters<Repository["addMetrics"]>[1]): Promise<void> {
    const checkedAt = now();
    await this.update(draftId, (draft) => ({
      ...draft,
      metrics: [...draft.metrics, ...metrics.map((metric) => ({ ...metric, checkedAt }))],
      timeline: [...draft.timeline, { stage: "metrics_pulled", at: checkedAt, note: `${metrics.length} platform(s)` }],
    }));
  }

  async recordUsage(record: UsageRecord): Promise<void> {
    this.state.usage.push({ ...record, at: now() });
  }

  async recordSourceHealth(health: Parameters<Repository["recordSourceHealth"]>[0]): Promise<void> {
    const checkedAt = now();
    for (const item of health) this.state.health.set(item.name, { ...item, checkedAt });
  }

  async reviewDraft(id: string, input: Parameters<Repository["reviewDraft"]>[1]): Promise<Draft> {
    const current = await this.require(id);
    if (current.review) throw new ReviewConflictError(current.review);
    return this.update(id, (draft) => applyReview(draft, input));
  }

  async editCaption(id: string, platform: Platform, text: string, channel: ReviewChannel): Promise<Draft> {
    return this.update(id, (draft) => editCaption(draft, platform, text, channel));
  }

  async recordPost(id: string, platform: Platform, url: string, via: "manual" | "api" = "manual"): Promise<Draft> {
    return this.update(id, (draft) => markPosted(draft, platform, url, now(), via));
  }

  async getChatSession(chatId: string): Promise<ChatSession | null> {
    const session = this.state.sessions.get(chatId);
    if (!session || session.expiresAt < now()) return null;
    return session;
  }

  async setChatSession(session: ChatSession): Promise<void> {
    this.state.sessions.set(session.chatId, session);
  }

  async clearChatSession(chatId: string): Promise<void> {
    this.state.sessions.delete(chatId);
  }

  private async require(id: string): Promise<Draft> {
    const draft = this.state.drafts.find((item) => item.id === id);
    if (!draft) throw new DraftNotFoundError(id);
    return draft;
  }

  private async update(id: string, change: (draft: Draft) => Draft): Promise<Draft> {
    const index = this.state.drafts.findIndex((item) => item.id === id);
    const current = this.state.drafts[index];
    if (!current) throw new DraftNotFoundError(id);
    const next = change(current);
    this.state.drafts[index] = next;
    return this.withCost(next);
  }

  private withCost(draft: Draft): Draft {
    const spent = this.state.usage.filter((record) => record.trendId === draft.trend.id).reduce((sum, record) => sum + record.costUsd, 0);
    return spent ? { ...draft, costUsd: draft.costUsd + spent } : draft;
  }
}
