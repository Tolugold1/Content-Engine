import {
  applyReview,
  editCaption,
  EVENTS,
  markPosted,
  type Draft,
  type DraftStatus,
  type Platform,
  type ReviewInput,
  type Tone,
} from "@content-engine/core";
import { connection } from "next/server";
import { publishEvent } from "./events";
import { createSampleDrafts } from "./sample-data";

/**
 * Data access for the dashboard.
 *
 * Today this is an in-memory store seeded with sample drafts, so the UI runs
 * without any accounts. When Supabase is connected, only this file changes:
 * every function keeps its signature and the review rules stay in
 * @content-engine/core, shared with the Telegram bot.
 */

const globalStore = globalThis as unknown as { __contentEngineDrafts?: Draft[] };

function table(): Draft[] {
  globalStore.__contentEngineDrafts ??= createSampleDrafts();
  return globalStore.__contentEngineDrafts;
}

export const isSampleMode = !process.env.SUPABASE_URL;

export interface DraftFilter {
  status?: DraftStatus;
  tone?: Tone;
  q?: string;
}

function byNewest(a: Draft, b: Draft) {
  return b.createdAt.localeCompare(a.createdAt);
}

/** For pages: waits for a request so data is never baked in at build time. */
export async function listDrafts(filter: DraftFilter = {}): Promise<Draft[]> {
  await connection();
  const q = filter.q?.trim().toLowerCase();
  return table()
    .filter((draft) => !filter.status || draft.status === filter.status)
    .filter((draft) => !filter.tone || draft.tone === filter.tone)
    .filter(
      (draft) =>
        !q ||
        draft.title.toLowerCase().includes(q) ||
        draft.trend.title.toLowerCase().includes(q) ||
        draft.hashtags.some((tag) => tag.toLowerCase().includes(q)),
    )
    .sort(byNewest);
}

export async function getDraft(idOrSlug: string): Promise<Draft | null> {
  await connection();
  return findDraft(idOrSlug);
}

/** For route handlers and server actions, which already run per request. */
export function findDraft(idOrSlug: string): Draft | null {
  return table().find((draft) => draft.id === idOrSlug || draft.slug === idOrSlug) ?? null;
}

function update(id: string, change: (draft: Draft) => Draft): Draft {
  const rows = table();
  const index = rows.findIndex((draft) => draft.id === id);
  const current = rows[index];
  if (!current) throw new Error("Draft not found");
  const next = change(current);
  rows[index] = next;
  return next;
}

export async function reviewDraft(id: string, input: ReviewInput): Promise<Draft> {
  const draft = update(id, (current) => applyReview(current, input));
  await publishEvent(EVENTS.draftReviewed, { draftId: id, decision: input.decision, channel: input.channel });
  return draft;
}

export async function updateCaption(id: string, platform: Platform, text: string): Promise<Draft> {
  const draft = update(id, (current) => editCaption(current, platform, text, "web"));
  await publishEvent(EVENTS.draftCaptionEdited, { draftId: id, platform, channel: "web" });
  return draft;
}

export async function recordPost(id: string, platform: Platform, url: string): Promise<Draft> {
  const draft = update(id, (current) => markPosted(current, platform, url));
  const post = draft.posts.find((item) => item.platform === platform);
  await publishEvent(EVENTS.draftPosted, { draftId: id, platform, url: post?.url ?? url });
  return draft;
}

export interface PipelineStatus {
  lastScanAt: string;
  nextScanAt: string;
  sources: Array<{ name: string; ok: boolean; note: string }>;
  telegramConnected: boolean;
}

export async function getPipelineStatus(): Promise<PipelineStatus> {
  await connection();
  const now = Date.now();
  return {
    lastScanAt: new Date(now - 12 * 60_000).toISOString(),
    nextScanAt: new Date(now + 48 * 60_000).toISOString(),
    sources: [
      { name: "X trends (NG)", ok: true, note: "Hourly" },
      { name: "Google Trends NG", ok: true, note: "Daily trending feed" },
      { name: "YouTube most popular NG", ok: true, note: "Every 3h" },
      { name: "News RSS", ok: true, note: "14 feeds" },
      { name: "Fixtures feed", ok: true, note: "Matchdays" },
    ],
    telegramConnected: Boolean(process.env.TELEGRAM_BOT_TOKEN),
  };
}
