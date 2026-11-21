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
  type ReviewInput,
  type SourceHealth,
  type UsageRecord,
} from "@content-engine/core";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  DRAFT_SELECT,
  fromUsage,
  sanitiseSearch,
  toChatSession,
  toDraft,
  toEvidence,
  toSourceHealth,
  toTrend,
  toUsage,
  type DraftRow,
  type EvidenceRow,
  type TrendRow,
} from "./mappers";
import { DraftNotFoundError, type DraftFilter, type NewEvidence, type NewTrend, type Repository } from "./repository";

interface PostgrestError {
  message: string;
}

function unwrap<T>(result: { data: T | null; error: PostgrestError | null }, context: string): T {
  if (result.error) throw new Error(`${context}: ${result.error.message}`);
  return result.data as T;
}

/** Production repository backed by Supabase Postgres (service role, server-side only). */
export class SupabaseRepository implements Repository {
  readonly kind = "supabase" as const;
  private readonly db: SupabaseClient;

  constructor(url: string, serviceRoleKey: string) {
    this.db = createClient(url, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
  }

  async listDrafts(filter: DraftFilter = {}): Promise<Draft[]> {
    let query = this.db
      .from("drafts")
      .select(DRAFT_SELECT)
      .order("created_at", { ascending: false })
      .limit(filter.limit ?? 200);
    if (filter.status) query = query.eq("status", filter.status);
    if (filter.tone) query = query.eq("tone", filter.tone);
    const q = filter.q ? sanitiseSearch(filter.q) : "";
    if (q) query = query.or(`title.ilike.*${q}*,slug.ilike.*${q}*`);
    return unwrap(await query, "listDrafts").map((row) => toDraft(row as unknown as DraftRow));
  }

  async getDraft(idOrSlug: string): Promise<Draft | null> {
    const column = /^[0-9a-f-]{36}$/i.test(idOrSlug) ? "id" : "slug";
    const row = unwrap(await this.db.from("drafts").select(DRAFT_SELECT).eq(column, idOrSlug).maybeSingle(), "getDraft");
    return row ? toDraft(row as unknown as DraftRow) : null;
  }

  async recentTrendTitles(sinceIso: string): Promise<string[]> {
    const rows = unwrap(await this.db.from("trends").select("title").gte("detected_at", sinceIso), "recentTrendTitles");
    return rows.map((row) => String(row.title));
  }

  async countDraftsSince(sinceIso: string): Promise<number> {
    const result = await this.db
      .from("drafts")
      .select("id", { count: "exact", head: true })
      .gte("created_at", sinceIso)
      .neq("status", "failed");
    if (result.error) throw new Error(`countDraftsSince: ${result.error.message}`);
    return result.count ?? 0;
  }

  async listUsage(sinceIso: string): Promise<UsageRecord[]> {
    const rows = unwrap(await this.db.from("usage").select("*").gte("created_at", sinceIso).limit(10_000), "listUsage");
    return rows.map(toUsage);
  }

  async listSourceHealth(): Promise<SourceHealth[]> {
    return unwrap(await this.db.from("source_health").select("*").order("name"), "listSourceHealth").map(toSourceHealth);
  }

  async saveTrend(trend: NewTrend, evidence: NewEvidence[]) {
    const row = unwrap(
      await this.db
        .from("trends")
        .insert({
          title: trend.title,
          sources: trend.sources,
          mood: trend.mood,
          reaction_summary: trend.reactionSummary,
          top_takes: trend.topTakes,
          virality_score: trend.viralityScore,
        })
        .select()
        .single(),
      "saveTrend",
    ) as TrendRow;
    const saved = await this.addEvidence(row.id, evidence);
    return { ...toTrend(row), evidence: saved };
  }

  async updateTrend(trendId: string, patch: Partial<NewTrend>): Promise<void> {
    const row = {
      ...(patch.title !== undefined ? { title: patch.title } : {}),
      ...(patch.sources !== undefined ? { sources: patch.sources } : {}),
      ...(patch.mood !== undefined ? { mood: patch.mood } : {}),
      ...(patch.reactionSummary !== undefined ? { reaction_summary: patch.reactionSummary } : {}),
      ...(patch.topTakes !== undefined ? { top_takes: patch.topTakes } : {}),
      ...(patch.viralityScore !== undefined ? { virality_score: patch.viralityScore } : {}),
    };
    unwrap(await this.db.from("trends").update(row).eq("id", trendId), "updateTrend");
  }

  async addEvidence(trendId: string, evidence: NewEvidence[]): Promise<Evidence[]> {
    if (evidence.length === 0) return [];
    const rows = unwrap(
      await this.db
        .from("evidence")
        .upsert(
          evidence.map((item) => ({
            trend_id: trendId,
            outlet: item.outlet,
            title: item.title,
            url: item.url,
            snippet: item.snippet ?? null,
          })),
          { onConflict: "trend_id,url", ignoreDuplicates: true },
        )
        .select(),
      "addEvidence",
    ) as EvidenceRow[];
    return rows.map(toEvidence);
  }

  async listEvidence(trendId: string): Promise<Evidence[]> {
    const rows = unwrap(await this.db.from("evidence").select("*").eq("trend_id", trendId).order("fetched_at"), "listEvidence");
    return (rows as EvidenceRow[]).map(toEvidence);
  }

  async createDraft(input: NewDraft): Promise<Draft> {
    const id = unwrap(
      await this.db.rpc("create_draft", {
        p_draft: {
          trend_id: input.trendId,
          slug: input.slug,
          title: input.title,
          hook: input.hook,
          tone: input.tone,
          category: input.category,
          status: input.status,
          scenes: input.scenes,
          captions: input.captions,
          hashtags: input.hashtags,
          engagement_question: input.engagementQuestion,
          duration_sec: input.durationSec,
          video_key: input.media.video,
          still_key: input.media.still,
          audio_key: input.media.audio,
        },
        p_claims: input.claims.map((claim) => ({
          text: claim.text,
          status: claim.status,
          evidence_ids: claim.evidenceIds,
          verdict: claim.verdict,
          note: claim.note ?? null,
        })),
        p_events: input.timeline ?? [],
      }),
      "createDraft",
    ) as string;
    return this.require(id);
  }

  async transitionDraft(id: string, change: Parameters<Repository["transitionDraft"]>[1]): Promise<Draft> {
    await this.rpc("transition_draft", {
      p_draft_id: id,
      p_from: change.from,
      p_to: change.to,
      p_stage: change.stage,
      p_note: change.note ?? null,
      p_media: change.media || change.durationSec ? { ...change.media, duration_sec: change.durationSec } : null,
    });
    return this.require(id);
  }

  async addTimelineEvent(draftId: string, stage: string, note?: string): Promise<void> {
    unwrap(await this.db.from("pipeline_events").insert({ draft_id: draftId, stage, note: note ?? null }), "addTimelineEvent");
  }

  async setTelegramMessage(draftId: string, chatId: string, messageId: number): Promise<void> {
    unwrap(
      await this.db.from("drafts").update({ telegram_chat_id: chatId, telegram_message_id: messageId }).eq("id", draftId),
      "setTelegramMessage",
    );
  }

  async addMetrics(draftId: string, metrics: Parameters<Repository["addMetrics"]>[1]): Promise<void> {
    if (metrics.length === 0) return;
    unwrap(await this.db.from("metrics").insert(metrics.map((metric) => ({ ...metric, draft_id: draftId }))), "addMetrics");
    await this.addTimelineEvent(draftId, "metrics_pulled", `${metrics.length} platform(s)`);
  }

  async recordUsage(record: UsageRecord): Promise<void> {
    unwrap(await this.db.from("usage").insert(fromUsage(record)), "recordUsage");
  }

  async recordSourceHealth(health: Parameters<Repository["recordSourceHealth"]>[0]): Promise<void> {
    const checkedAt = new Date().toISOString();
    unwrap(await this.db.from("source_health").upsert(health.map((item) => ({ ...item, checked_at: checkedAt }))), "recordSourceHealth");
  }

  async reviewDraft(id: string, input: ReviewInput): Promise<Draft> {
    applyReview(await this.require(id), input); // shared validation; the RPC enforces atomicity
    try {
      await this.rpc("review_draft", {
        p_draft_id: id,
        p_decision: input.decision,
        p_channel: input.channel,
        p_reason: input.reason?.trim() || null,
      });
    } catch (error) {
      if (error instanceof ReviewRuleError) {
        const latest = await this.require(id);
        if (latest.review) throw new ReviewConflictError(latest.review);
      }
      throw error;
    }
    return this.require(id);
  }

  async editCaption(id: string, platform: Platform, text: string, channel: ReviewChannel): Promise<Draft> {
    const next = editCaption(await this.require(id), platform, text, channel);
    await this.rpc("edit_caption", { p_draft_id: id, p_platform: platform, p_text: next.captions[platform], p_channel: channel });
    return this.require(id);
  }

  async recordPost(id: string, platform: Platform, url: string, via: "manual" | "api" = "manual"): Promise<Draft> {
    const next = markPosted(await this.require(id), platform, url, undefined, via);
    const post = next.posts.find((item) => item.platform === platform);
    await this.rpc("record_post", { p_draft_id: id, p_platform: platform, p_url: post?.url ?? url, p_via: via });
    return this.require(id);
  }

  async getChatSession(chatId: string): Promise<ChatSession | null> {
    const row = unwrap(
      await this.db.from("telegram_sessions").select("*").eq("chat_id", chatId).gt("expires_at", new Date().toISOString()).maybeSingle(),
      "getChatSession",
    );
    return row ? toChatSession(row) : null;
  }

  async setChatSession(session: ChatSession): Promise<void> {
    unwrap(
      await this.db.from("telegram_sessions").upsert({
        chat_id: session.chatId,
        action: session.action,
        draft_id: session.draftId,
        platform: session.platform,
        expires_at: session.expiresAt,
      }),
      "setChatSession",
    );
  }

  async clearChatSession(chatId: string): Promise<void> {
    unwrap(await this.db.from("telegram_sessions").delete().eq("chat_id", chatId), "clearChatSession");
  }

  private async require(id: string): Promise<Draft> {
    const draft = await this.getDraft(id);
    if (!draft) throw new DraftNotFoundError(id);
    return draft;
  }

  /** Calls a SQL function, turning its domain exceptions into the shared error types. */
  private async rpc(name: string, args: Record<string, unknown>): Promise<void> {
    const { error } = await this.db.rpc(name, args);
    if (!error) return;
    if (error.message.includes("review_conflict") || error.message.includes("invalid_transition")) {
      throw new ReviewRuleError("This draft has already moved on. Refresh to see its current state.");
    }
    throw new Error(`${name}: ${error.message}`);
  }
}
