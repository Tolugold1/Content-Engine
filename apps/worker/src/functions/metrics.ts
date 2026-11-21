import { readAnalyticsScreenshot } from "@content-engine/ai";
import { PLATFORM_INFO, SCHEDULE, UNIT_PRICES, type Metrics, type Platform } from "@content-engine/core";
import { events, inngest } from "@content-engine/services";
import { xPostMetrics, youtubeVideoMetrics } from "@content-engine/sources";
import { escapeHtml, metricsRequest } from "@content-engine/telegram";
import { aiContext, recordUsage, repo, telegramOrNull } from "../context";

/** Platforms with free/cheap APIs are read automatically; the rest are read from screenshots. */
const API_PLATFORMS: ReadonlySet<Platform> = new Set(["x", "youtube"]);

/**
 * Metrics tracker: after a draft is first posted, checks performance at each
 * checkpoint (24h, 72h). One run per draft thanks to the idempotency key.
 */
export const trackMetrics = inngest.createFunction(
  { id: "track-metrics", triggers: [events.draftPosted], idempotency: "event.data.draftId" },
  async ({ event, step }) => {
    let waited = 0;
    for (const hours of SCHEDULE.metricsCheckpointHours) {
      const checkpoint = `${hours}h`;
      await step.sleep(`wait-${checkpoint}`, `${hours - waited}h`);
      waited = hours;

      await step.run(`collect-${checkpoint}`, async () => {
        const draft = await repo().getDraft(event.data.draftId);
        if (!draft) return { skipped: "Draft not found" };

        const collected: Array<Omit<Metrics, "checkedAt">> = [];
        for (const post of draft.posts.filter((item) => API_PLATFORMS.has(item.platform))) {
          const numbers = post.platform === "x" ? await xPostMetrics(post.url) : await youtubeVideoMetrics(post.url);
          if (!numbers) continue;
          collected.push({
            platform: post.platform,
            views: numbers.views,
            likes: numbers.likes,
            comments: numbers.comments,
            shares: numbers.shares,
            source: "api",
          });
          if (post.platform === "x") {
            await recordUsage(draft.trend.id, {
              provider: "x",
              stage: "metrics",
              model: "x-post-lookup",
              promptVersion: null,
              inputTokens: 0,
              outputTokens: 0,
              cacheReadTokens: 0,
              cacheWriteTokens: 0,
              units: 1,
              costUsd: UNIT_PRICES.xPostRead,
              latencyMs: 0,
            });
          }
        }
        await repo().addMetrics(draft.id, collected);

        const manual = draft.posts.map((post) => post.platform).filter((platform) => !API_PLATFORMS.has(platform));
        const bot = telegramOrNull();
        if (manual.length && bot) {
          await repo().setChatSession({
            chatId: bot.chatId,
            action: "metrics_screenshot",
            draftId: draft.id,
            platform: null,
            expiresAt: new Date(Date.now() + 12 * 3_600_000).toISOString(),
          });
          const message = metricsRequest(draft, manual, checkpoint);
          await bot.client.sendMessage(bot.chatId, message.html, { replyMarkup: message.replyMarkup });
        }
        return { api: collected.length, requested: manual };
      });
    }
    return { done: true };
  },
);

/** Reads an analytics screenshot sent to the bot and stores the numbers. */
export const readScreenshot = inngest.createFunction(
  { id: "read-analytics-screenshot", triggers: [events.screenshotReceived], retries: 2 },
  async ({ event, step }) => {
    const bot = telegramOrNull();
    if (!bot) return { skipped: "Telegram not configured" };

    return step.run("extract-metrics", async () => {
      const draft = await repo().getDraft(event.data.draftId);
      if (!draft) return { skipped: "Draft not found" };
      const file = await bot.client.downloadFile(event.data.fileId);
      const mediaType = file.path.endsWith(".png") ? "image/png" : file.path.endsWith(".webp") ? "image/webp" : "image/jpeg";
      const reading = await readAnalyticsScreenshot(aiContext(draft.trend.id), { base64: file.bytes.toString("base64"), mediaType });

      const posted = draft.posts.map((post) => post.platform);
      if (!reading.readable || reading.platform === "unknown" || !posted.includes(reading.platform)) {
        await bot.client.sendMessage(
          event.data.chatId,
          "I couldn't match that screenshot to a platform you posted on. Try a clearer screenshot of the post's analytics.",
        );
        return { stored: false };
      }
      const { platform, views, likes, comments, shares } = reading;
      await repo().addMetrics(draft.id, [{ platform, views, likes, comments, shares, source: "screenshot" }]);
      await bot.client.sendMessage(
        event.data.chatId,
        `📊 ${escapeHtml(PLATFORM_INFO[platform].label)}: ${views.toLocaleString("en")} views · ${likes.toLocaleString("en")} likes · ${comments.toLocaleString("en")} comments. Saved for <b>${escapeHtml(draft.title)}</b>.`,
      );
      return { stored: true, platform };
    });
  },
);
