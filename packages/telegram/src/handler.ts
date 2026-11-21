import {
  errorMessage,
  QUICK_REJECT_REASONS,
  ReviewConflictError,
  ReviewRuleError,
  type ChatSession,
  type Platform,
} from "@content-engine/core";
import type { Repository } from "@content-engine/db";
import type { ReviewService } from "@content-engine/services";
import { decodeCallback, type CallbackAction } from "./callbacks";
import type { TelegramClient, TelegramMessage, Update } from "./client";
import { captionPlatformPicker, editCaptionPrompt, escapeHtml, HELP_TEXT, postLinkPrompt, rejectPrompt, type BotMessage } from "./messages";

export interface HandlerDeps {
  repo: Repository;
  telegram: Pick<TelegramClient, "sendMessage" | "answerCallbackQuery">;
  reviews: ReviewService;
  /** Only this chat may control the bot. */
  allowedChatId: string;
  appUrl: string;
  /** Emits metrics/screenshot-received (injected so tests do not need Inngest). */
  onScreenshot: (input: { draftId: string; platform: Platform; fileId: string; chatId: string }) => Promise<void>;
}

const SESSION_MINUTES = 30;

/** Builds the update handler used by the webhook route and the local polling script. */
export function createUpdateHandler(deps: HandlerDeps) {
  const { repo, telegram, reviews, allowedChatId } = deps;

  const reply = (chatId: string, message: BotMessage | string) =>
    typeof message === "string"
      ? telegram.sendMessage(chatId, message)
      : telegram.sendMessage(chatId, message.html, { replyMarkup: message.replyMarkup });

  const startSession = (
    chatId: string,
    action: ChatSession["action"],
    draftId: string,
    platform: Platform | null,
    minutes = SESSION_MINUTES,
  ) => repo.setChatSession({ chatId, action, draftId, platform, expiresAt: new Date(Date.now() + minutes * 60_000).toISOString() });

  /** Turns domain errors into a short, human answer. */
  function describe(error: unknown): string {
    if (error instanceof ReviewConflictError) {
      const where = error.existing.channel === "web" ? "the dashboard" : "Telegram";
      return `Already ${error.existing.decision} on ${where}.`;
    }
    if (error instanceof ReviewRuleError) return error.message;
    console.error("[telegram] handler error", error);
    return `Something went wrong: ${errorMessage(error)}`;
  }

  async function handleCallback(chatId: string, action: CallbackAction): Promise<string> {
    const draft = await repo.getDraft(action.draftId);
    if (!draft) return "That draft no longer exists.";

    switch (action.type) {
      case "approve":
        await reviews.review(draft.id, { decision: "approved", channel: "telegram" });
        return "Approved ✅ Posting kit on its way.";
      case "reject":
        await startSession(chatId, "reject_reason", draft.id, null);
        await reply(chatId, rejectPrompt(draft));
        return "Why reject?";
      case "quickReject":
        await reviews.review(draft.id, { decision: "rejected", channel: "telegram", reason: QUICK_REJECT_REASONS[action.reasonIndex] });
        await repo.clearChatSession(chatId);
        return "Rejected ❌";
      case "editPick":
        await reply(chatId, captionPlatformPicker(draft));
        return "Pick a platform";
      case "editPlatform":
        await startSession(chatId, "edit_caption", draft.id, action.platform);
        await reply(chatId, editCaptionPrompt(draft, action.platform));
        return "Send the new caption";
      case "markPosted":
        await startSession(chatId, "post_link", draft.id, action.platform);
        await reply(chatId, postLinkPrompt(draft, action.platform));
        return "Paste the link";
    }
  }

  async function handleCommand(chatId: string, text: string): Promise<void> {
    const command = text.split(/\s|@/)[0]?.toLowerCase();
    if (command === "/cancel") {
      await repo.clearChatSession(chatId);
      await reply(chatId, "Okay, cancelled.");
      return;
    }
    if (command === "/queue") {
      const pending = await repo.listDrafts({ status: "pending_review", limit: 10 });
      await reply(
        chatId,
        pending.length
          ? ["<b>Waiting for you</b>", ...pending.map((d) => `• ${escapeHtml(d.title)} — ${deps.appUrl}/drafts/${d.id}`)].join("\n")
          : "Nothing waiting. I'll ping you when the next video is ready.",
      );
      return;
    }
    await reply(chatId, HELP_TEXT);
  }

  async function handleSessionReply(chatId: string, session: ChatSession, message: TelegramMessage): Promise<void> {
    const text = message.text?.trim() ?? "";
    switch (session.action) {
      case "reject_reason":
        if (!text) return void (await reply(chatId, "Type the reason as text, or /cancel."));
        await reviews.review(session.draftId, { decision: "rejected", channel: "telegram", reason: text });
        await repo.clearChatSession(chatId);
        await reply(chatId, "Rejected. The reason is saved for the writer.");
        return;
      case "edit_caption":
        if (!text || !session.platform) return void (await reply(chatId, "Send the caption as text, or /cancel."));
        await reviews.editCaption(session.draftId, session.platform, text, "telegram");
        await repo.clearChatSession(chatId);
        await reply(chatId, "Caption saved ✏️");
        return;
      case "post_link":
        if (!text || !session.platform) return void (await reply(chatId, "Paste the link as text, or /cancel."));
        await reviews.recordPost(session.draftId, session.platform, text);
        await repo.clearChatSession(chatId);
        await reply(chatId, "Saved 🔗 I'll check the numbers in 24 hours.");
        return;
      case "metrics_screenshot": {
        const photo = message.photo?.at(-1);
        const fileId = photo?.file_id ?? (message.document?.mime_type?.startsWith("image/") ? message.document.file_id : undefined);
        if (!fileId) return void (await reply(chatId, "Send the analytics screenshot as a photo, or /cancel."));
        // The vision step works out which app the screenshot is from; platform is a hint only.
        await deps.onScreenshot({ draftId: session.draftId, platform: session.platform ?? "tiktok", fileId, chatId });
        await reply(chatId, "Got it 📊 Reading the numbers…");
        return;
      }
    }
  }

  return async function handleUpdate(update: Update): Promise<void> {
    const query = update.callback_query;
    const message = update.message;
    const chatId = String(query?.message?.chat.id ?? message?.chat.id ?? "");
    if (!chatId || chatId !== allowedChatId) return; // ignore strangers silently

    if (query) {
      const action = decodeCallback(query.data);
      let answer = "Unknown action";
      try {
        if (action) answer = await handleCallback(chatId, action);
      } catch (error) {
        answer = describe(error);
      }
      await telegram.answerCallbackQuery(query.id, answer.slice(0, 190));
      return;
    }

    if (!message) return;
    try {
      if (message.text?.startsWith("/")) return await handleCommand(chatId, message.text);
      const session = await repo.getChatSession(chatId);
      if (!session) return void (await reply(chatId, HELP_TEXT));
      await handleSessionReply(chatId, session, message);
    } catch (error) {
      await reply(chatId, escapeHtml(describe(error)));
    }
  };
}
