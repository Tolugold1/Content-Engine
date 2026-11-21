import { triageItems } from "@content-engine/ai";
import { SCHEDULE, startOfLocalDay } from "@content-engine/core";
import { events, inngest } from "@content-engine/services";
import { collectTrends } from "@content-engine/sources";
import { cron } from "inngest";
import { aiContext, recordUsage, repo } from "../context";
import { selectStories, toSelectedEvent } from "../pipeline/select";

/**
 * Trend scout: on a schedule (or "Scan now"), pull every source, cluster and
 * score with Haiku, and hand the best new stories to the draft producer.
 */
export const trendScout = inngest.createFunction(
  {
    id: "trend-scout",
    triggers: [cron(SCHEDULE.scanCron), events.scoutRequested],
    concurrency: 1,
    retries: 2,
  },
  async ({ step }) => {
    const collected = await step.run("collect-sources", () => collectTrends());

    await step.run("record-source-health", async () => {
      await repo().recordSourceHealth(collected.health);
      for (const usage of collected.usage) await recordUsage(null, usage);
    });

    const remaining = await step.run("check-daily-quota", async () => {
      const made = await repo().countDraftsSince(startOfLocalDay(SCHEDULE.timezone));
      return SCHEDULE.maxDraftsPerDay - made;
    });
    if (remaining <= 0) return { selected: 0, reason: "Daily quota reached" };
    if (collected.items.length === 0) return { selected: 0, reason: "No items from sources" };

    const stories = await step.run("triage-stories", async () => {
      const recent = await repo().recentTrendTitles(new Date(Date.now() - 48 * 3_600_000).toISOString());
      return triageItems(aiContext(null), collected.items, recent);
    });

    const selected = selectStories(stories, remaining, SCHEDULE.minScore);
    if (selected.length > 0) {
      await step.sendEvent(
        "select-stories",
        selected.map((story) => ({ name: "story/selected" as const, data: toSelectedEvent(story, collected.items) })),
      );
    }
    return { items: collected.items.length, candidates: stories.length, selected: selected.map((story) => story.title) };
  },
);
