import { computeInsights, type Insights } from "@content-engine/core";
import { getRepository, type DraftFilter } from "@content-engine/db";
import { connection } from "next/server";

/**
 * Read helpers for pages. `connection()` makes each read happen per request,
 * so nothing is baked into the build.
 */
export async function listDrafts(filter: DraftFilter = {}) {
  await connection();
  return getRepository().listDrafts(filter);
}

export async function getDraft(idOrSlug: string) {
  await connection();
  return getRepository().getDraft(idOrSlug);
}

export async function getSourceHealth() {
  await connection();
  return getRepository().listSourceHealth();
}

export async function getInsights(days = 30): Promise<Insights & { days: number }> {
  await connection();
  const since = new Date(Date.now() - days * 86_400_000).toISOString();
  const repo = getRepository();
  const [drafts, usage] = await Promise.all([repo.listDrafts({ limit: 500 }), repo.listUsage(since)]);
  return {
    ...computeInsights(
      drafts.filter((draft) => draft.createdAt >= since),
      usage,
    ),
    days,
  };
}

export const isSampleMode = () => getRepository().kind === "memory";
