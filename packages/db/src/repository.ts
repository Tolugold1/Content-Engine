import type {
  ChatSession,
  Draft,
  DraftMedia,
  DraftStatus,
  Evidence,
  Metrics,
  NewDraft,
  Platform,
  ReviewChannel,
  ReviewInput,
  SourceHealth,
  Tone,
  Trend,
  UsageRecord,
} from "@content-engine/core";

export interface DraftFilter {
  status?: DraftStatus;
  tone?: Tone;
  q?: string;
  limit?: number;
}

export type NewTrend = Omit<Trend, "id" | "detectedAt">;
export type NewEvidence = Omit<Evidence, "id" | "fetchedAt">;

export class DraftNotFoundError extends Error {
  constructor(readonly draftId: string) {
    super(`Draft ${draftId} not found`);
    this.name = "DraftNotFoundError";
  }
}

/**
 * Storage for everything the engine knows. Two implementations share this
 * contract: Supabase (production) and in-memory (sample mode and tests).
 *
 * Review mutations validate with the shared rules in @content-engine/core and
 * then write atomically, so the first decision wins across channels.
 */
export interface Repository {
  readonly kind: "supabase" | "memory";

  // Reads
  listDrafts(filter?: DraftFilter): Promise<Draft[]>;
  getDraft(idOrSlug: string): Promise<Draft | null>;
  recentTrendTitles(sinceIso: string): Promise<string[]>;
  countDraftsSince(sinceIso: string): Promise<number>;
  listUsage(sinceIso: string): Promise<UsageRecord[]>;
  listSourceHealth(): Promise<SourceHealth[]>;

  // Pipeline writes
  saveTrend(trend: NewTrend, evidence: NewEvidence[]): Promise<Trend & { evidence: Evidence[] }>;
  updateTrend(trendId: string, patch: Partial<NewTrend>): Promise<void>;
  addEvidence(trendId: string, evidence: NewEvidence[]): Promise<Evidence[]>;
  listEvidence(trendId: string): Promise<Evidence[]>;
  createDraft(input: NewDraft): Promise<Draft>;
  /** Moves a draft between statuses (e.g. rendering -> pending_review with media) and logs the step. */
  transitionDraft(
    id: string,
    change: { from: DraftStatus[]; to: DraftStatus; stage: string; note?: string; media?: Partial<DraftMedia>; durationSec?: number },
  ): Promise<Draft>;
  addTimelineEvent(draftId: string, stage: string, note?: string): Promise<void>;
  setTelegramMessage(draftId: string, chatId: string, messageId: number): Promise<void>;
  addMetrics(draftId: string, metrics: Omit<Metrics, "checkedAt">[]): Promise<void>;
  recordUsage(record: UsageRecord): Promise<void>;
  recordSourceHealth(health: Omit<SourceHealth, "checkedAt">[]): Promise<void>;

  // Review (atomic, shared rules)
  reviewDraft(id: string, input: ReviewInput): Promise<Draft>;
  editCaption(id: string, platform: Platform, text: string, channel: ReviewChannel): Promise<Draft>;
  recordPost(id: string, platform: Platform, url: string, via?: "manual" | "api"): Promise<Draft>;

  // Telegram conversation state
  getChatSession(chatId: string): Promise<ChatSession | null>;
  setChatSession(session: ChatSession): Promise<void>;
  clearChatSession(chatId: string): Promise<void>;
}
