import type { Draft, Platform, ReviewChannel, ReviewInput } from "@content-engine/core";
import { getRepository, type Repository } from "@content-engine/db";
import { sendEvent } from "./inngest";

/**
 * Review actions shared by the dashboard, the REST API and the Telegram bot.
 * Each one is a single atomic repository write followed by one event, so the
 * pipeline and the other channel always hear about it.
 */
export function createReviewService(repo: Repository = getRepository()) {
  return {
    async review(draftId: string, input: ReviewInput): Promise<Draft> {
      const draft = await repo.reviewDraft(draftId, input);
      await sendEvent("draft/reviewed", { draftId, decision: input.decision, channel: input.channel });
      return draft;
    },

    async editCaption(draftId: string, platform: Platform, text: string, channel: ReviewChannel): Promise<Draft> {
      const draft = await repo.editCaption(draftId, platform, text, channel);
      await sendEvent("draft/caption-edited", { draftId, platform, channel });
      return draft;
    },

    async recordPost(draftId: string, platform: Platform, url: string): Promise<Draft> {
      const draft = await repo.recordPost(draftId, platform, url, "manual");
      const post = draft.posts.find((item) => item.platform === platform);
      await sendEvent("draft/posted", { draftId, platform, url: post?.url ?? url });
      return draft;
    },

    async requestScan(requestedBy: "dashboard" | "cli"): Promise<void> {
      await sendEvent("scout/requested", { requestedBy });
    },
  };
}

export type ReviewService = ReturnType<typeof createReviewService>;
