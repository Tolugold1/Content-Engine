import { firstPassApprovalRate } from "./review";
import type { Draft, Metrics, UsageRecord } from "./schemas";

export interface Insights {
  totalSpendUsd: number;
  spendByStage: Array<{ provider: string; stage: string; model: string; calls: number; costUsd: number }>;
  draftsByStatus: Record<string, number>;
  postedCount: number;
  costPerPostedUsd: number | null;
  firstPassRate: number | null;
  calibration: Array<{ draftId: string; title: string; predicted: number; views: number }>;
  editsCount: number;
}

/** Derived analytics shared by every repository implementation. */
export function computeInsights(drafts: Draft[], usage: UsageRecord[]): Insights {
  const groups = new Map<string, Insights["spendByStage"][number]>();
  for (const record of usage) {
    const key = `${record.provider}|${record.stage}|${record.model}`;
    const group = groups.get(key) ?? { provider: record.provider, stage: record.stage, model: record.model, calls: 0, costUsd: 0 };
    group.calls += 1;
    group.costUsd += record.costUsd;
    groups.set(key, group);
  }
  const totalSpendUsd = usage.reduce((sum, record) => sum + record.costUsd, 0);
  const posted = drafts.filter((draft) => draft.status === "posted");
  const draftsByStatus = drafts.reduce<Record<string, number>>((acc, draft) => {
    acc[draft.status] = (acc[draft.status] ?? 0) + 1;
    return acc;
  }, {});

  return {
    totalSpendUsd,
    spendByStage: [...groups.values()].sort((a, b) => b.costUsd - a.costUsd),
    draftsByStatus,
    postedCount: posted.length,
    costPerPostedUsd: posted.length ? totalSpendUsd / posted.length : null,
    firstPassRate: firstPassApprovalRate(drafts),
    calibration: posted
      .filter((draft) => draft.metrics.length > 0)
      .map((draft) => ({
        draftId: draft.id,
        title: draft.title,
        predicted: draft.trend.viralityScore,
        views: latestViews(draft),
      })),
    editsCount: drafts.reduce((sum, draft) => sum + draft.edits.length, 0),
  };
}

/** The most recent reading per platform (metrics are stored at every checkpoint). */
export function latestMetrics(draft: Pick<Draft, "metrics">): Metrics[] {
  const latest = new Map<string, Metrics>();
  for (const metric of draft.metrics) {
    const current = latest.get(metric.platform);
    if (!current || metric.checkedAt > current.checkedAt) latest.set(metric.platform, metric);
  }
  return [...latest.values()];
}

/** Total views across platforms, counting each platform's latest reading once. */
export function latestViews(draft: Pick<Draft, "metrics">): number {
  return latestMetrics(draft).reduce((sum, metric) => sum + metric.views, 0);
}
