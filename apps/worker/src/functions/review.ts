import { nextPostingSlot, SCHEDULE } from "@content-engine/core";
import { getStorage } from "@content-engine/media";
import { events, inngest } from "@content-engine/services";
import {
  draftCaption,
  draftReadyMessage,
  postingKitMessages,
  postingReminder,
  reviewOutcomeLine,
  reviewReminder,
} from "@content-engine/telegram";
import { env } from "@content-engine/config";
import { localTime, repo, telegramOrNull } from "../context";

/** Sends every finished draft to Telegram. The dashboard shows the same row; this never depends on it. */
export const notifyDraftReady = inngest.createFunction(
  { id: "notify-draft-ready", triggers: [events.draftReady], retries: 4 },
  async ({ event, step }) => {
    const bot = telegramOrNull();
    if (!bot) return { skipped: "Telegram not configured" };

    return step.run("send-preview", async () => {
      const draft = await repo().getDraft(event.data.draftId);
      if (!draft?.media.video) return { skipped: "Draft has no video" };
      const videoUrl = await getStorage().signedUrl(draft.media.video, { expiresInSeconds: 3_600 });
      const message = draftReadyMessage(draft, env().APP_URL);
      const sent = await bot.client.sendVideo(bot.chatId, videoUrl, message.html, { replyMarkup: message.replyMarkup });
      await repo().setTelegramMessage(draft.id, bot.chatId, sent.message_id);
      await repo().addTimelineEvent(draft.id, "notified_telegram", "Preview sent with Approve / Edit / Reject buttons");
      return { messageId: sent.message_id };
    });
  },
);

/** After a decision from either channel: update the Telegram preview, and send the posting kit on approval. */
export const syncReviewDecision = inngest.createFunction(
  { id: "sync-review-decision", triggers: [events.draftReviewed], retries: 4 },
  async ({ event, step }) => {
    const bot = telegramOrNull();
    if (!bot) return { skipped: "Telegram not configured" };
    const draft = await step.run("load-draft", () => repo().getDraft(event.data.draftId));
    if (!draft) return { skipped: "Draft not found" };

    if (draft.telegram) {
      await step.run("update-preview", () =>
        bot.client.editMessageCaption(
          draft.telegram!.chatId,
          draft.telegram!.messageId,
          draftCaption(draft, reviewOutcomeLine(draft, SCHEDULE.timezone)),
        ),
      );
    }
    if (event.data.decision !== "approved") return { decision: "rejected" };

    await step.run("send-posting-kit", async () => {
      const slot = localTime(nextPostingSlot(SCHEDULE.postingSlots, SCHEDULE.timezone));
      for (const message of postingKitMessages(draft, slot)) {
        await bot.client.sendMessage(bot.chatId, message.html, { replyMarkup: message.replyMarkup });
      }
    });
    return { decision: "approved" };
  },
);

/** Nudges once if a draft waits too long for a decision. */
export const reviewReminderFn = inngest.createFunction(
  { id: "review-reminder", triggers: [events.draftReady] },
  async ({ event, step }) => {
    const decision = await step.waitForEvent("wait-for-review", {
      event: events.draftReviewed,
      match: "data.draftId",
      timeout: SCHEDULE.reviewReminderAfter,
    });
    if (decision) return { reviewed: true };
    const bot = telegramOrNull();
    if (!bot) return { reviewed: false };
    await step.run("send-reminder", async () => {
      const draft = await repo().getDraft(event.data.draftId);
      if (draft?.status === "pending_review") await bot.client.sendMessage(bot.chatId, reviewReminder(draft));
    });
    return { reviewed: false, reminded: true };
  },
);

/** At the next posting slot after approval, reminds you if nothing has been posted yet. */
export const postingReminderFn = inngest.createFunction(
  { id: "posting-reminder", triggers: [events.draftReviewed] },
  async ({ event, step }) => {
    if (event.data.decision !== "approved") return { skipped: "Not approved" };
    const slot = await step.run("pick-slot", () => nextPostingSlot(SCHEDULE.postingSlots, SCHEDULE.timezone));
    await step.sleepUntil("wait-for-slot", slot);
    const bot = telegramOrNull();
    if (!bot) return { skipped: "Telegram not configured" };
    await step.run("remind", async () => {
      const draft = await repo().getDraft(event.data.draftId);
      if (draft?.status === "approved") await bot.client.sendMessage(bot.chatId, postingReminder(draft));
    });
    return { slot };
  },
);
