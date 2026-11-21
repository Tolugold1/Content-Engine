import {
  PLATFORM_INFO,
  PLATFORMS,
  POSTING_CHECKLIST,
  QUICK_REJECT_REASONS,
  TEMPLATE_BY_TONE,
  type Draft,
  type Platform,
} from "@content-engine/core";
import { encodeCallback } from "./callbacks";
import type { InlineButton, ReplyMarkup } from "./client";

/** Message builders: pure functions so they can be unit-tested and reused by the bot and the worker. */

export function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export interface BotMessage {
  html: string;
  replyMarkup?: ReplyMarkup;
}

function studioButton(draft: Draft, appUrl: string): InlineButton[] {
  // Telegram only accepts public https links on buttons.
  return appUrl.startsWith("https://") ? [{ text: "Open in Studio", url: `${appUrl}/drafts/${draft.id}` }] : [];
}

function claimSummary(draft: Draft): string {
  if (draft.claims.length === 0) return "No factual claims";
  const count = (status: string) => draft.claims.filter((claim) => claim.status === status).length;
  return `✅ ${count("confirmed")} confirmed · 📰 ${count("reported")} reported · 💬 ${count("chatter")} chatter`;
}

/** Caption for the video preview. Kept under Telegram's 1024-character caption limit. */
export function draftCaption(draft: Draft, outcome?: string): string {
  const lines = [
    `<b>${escapeHtml(draft.title)}</b>`,
    `${escapeHtml(TEMPLATE_BY_TONE[draft.tone].name)} · 🔥 ${draft.trend.viralityScore.toFixed(1)}/10 · mood: ${escapeHtml(draft.trend.mood)}`,
    claimSummary(draft),
    `❓ ${escapeHtml(draft.engagementQuestion)}`,
  ];
  if (outcome) lines.push("", outcome);
  return lines.join("\n").slice(0, 1020);
}

export function draftReadyMessage(draft: Draft, appUrl: string): BotMessage {
  return {
    html: draftCaption(draft),
    replyMarkup: {
      inline_keyboard: [
        [
          { text: "✅ Approve", callback_data: encodeCallback({ type: "approve", draftId: draft.id }) },
          { text: "❌ Reject", callback_data: encodeCallback({ type: "reject", draftId: draft.id }) },
        ],
        [
          { text: "✏️ Edit caption", callback_data: encodeCallback({ type: "editPick", draftId: draft.id }) },
          ...studioButton(draft, appUrl),
        ],
      ],
    },
  };
}

export function reviewOutcomeLine(draft: Draft, timeZone: string): string {
  if (!draft.review) return "";
  const time = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", timeZone }).format(new Date(draft.review.at));
  const where = draft.review.channel === "web" ? "the dashboard" : "Telegram";
  return draft.review.decision === "approved"
    ? `✅ <b>Approved</b> on ${where} · ${time}`
    : `❌ <b>Rejected</b> on ${where} · ${time}\nReason: ${escapeHtml(draft.review.reason ?? "none")}`;
}

export function rejectPrompt(draft: Draft): BotMessage {
  return {
    html: `Why reject <b>${escapeHtml(draft.title)}</b>? Tap a reason or type your own.`,
    replyMarkup: {
      inline_keyboard: QUICK_REJECT_REASONS.map((reason, reasonIndex) => [
        { text: reason, callback_data: encodeCallback({ type: "quickReject", draftId: draft.id, reasonIndex }) },
      ]),
    },
  };
}

export function captionPlatformPicker(draft: Draft): BotMessage {
  return {
    html: `Which caption do you want to change for <b>${escapeHtml(draft.title)}</b>?`,
    replyMarkup: {
      inline_keyboard: PLATFORMS.map((platform) => [
        { text: PLATFORM_INFO[platform].label, callback_data: encodeCallback({ type: "editPlatform", draftId: draft.id, platform }) },
      ]),
    },
  };
}

export function editCaptionPrompt(draft: Draft, platform: Platform): BotMessage {
  const info = PLATFORM_INFO[platform];
  return {
    html: [
      `Current ${escapeHtml(info.label)} ${info.captionField.toLowerCase()} (max ${info.captionLimit}):`,
      `<pre>${escapeHtml(draft.captions[platform])}</pre>`,
      "Send the new text as a reply.",
    ].join("\n"),
    replyMarkup: { force_reply: true, input_field_placeholder: `New ${info.label} caption` },
  };
}

/** After approval: one message per platform with a tap-to-copy caption and a "posted" button. */
export function postingKitMessages(draft: Draft, postingTime: string): BotMessage[] {
  const checklist: BotMessage = {
    html: [
      `📦 <b>Posting kit: ${escapeHtml(draft.title)}</b>`,
      `Best time to post: <b>${escapeHtml(postingTime)}</b>`,
      ...POSTING_CHECKLIST.map((item) => `• ${escapeHtml(item)}`),
      `• Pin this as the first comment: <i>${escapeHtml(draft.engagementQuestion)}</i>`,
      "Tap a caption below to copy it, then tap the button once it's live.",
    ].join("\n"),
  };
  const perPlatform = PLATFORMS.map((platform) => ({
    html: `<b>${escapeHtml(PLATFORM_INFO[platform].label)}</b>\n<pre>${escapeHtml(draft.captions[platform])}</pre>`,
    replyMarkup: {
      inline_keyboard: [
        [
          {
            text: `Mark ${PLATFORM_INFO[platform].label} as posted`,
            callback_data: encodeCallback({ type: "markPosted", draftId: draft.id, platform }),
          },
        ],
      ],
    },
  }));
  return [checklist, ...perPlatform];
}

export function postLinkPrompt(draft: Draft, platform: Platform): BotMessage {
  return {
    html: `Paste the ${escapeHtml(PLATFORM_INFO[platform].label)} link for <b>${escapeHtml(draft.title)}</b>.`,
    replyMarkup: { force_reply: true, input_field_placeholder: "https://…" },
  };
}

export function metricsRequest(draft: Draft, platforms: Platform[], checkpoint: string): BotMessage {
  const names = platforms.map((platform) => PLATFORM_INFO[platform].label).join(", ");
  return {
    html: `📊 ${escapeHtml(checkpoint)} check for <b>${escapeHtml(draft.title)}</b>: send a screenshot of the analytics on ${escapeHtml(names)}. One photo per app is fine.`,
    replyMarkup: { force_reply: true, input_field_placeholder: "Send screenshots" },
  };
}

export function reviewReminder(draft: Draft): string {
  return `⏰ Still waiting for your call on <b>${escapeHtml(draft.title)}</b>. The story gets older every hour.`;
}

export function postingReminder(draft: Draft): string {
  return `🕒 Good time to post <b>${escapeHtml(draft.title)}</b>. The posting kit is above.`;
}

export const HELP_TEXT = [
  "<b>Golden Gist bot</b>",
  "New videos arrive here with Approve / Reject buttons.",
  "/queue — drafts waiting for you",
  "/cancel — stop what I'm waiting for",
].join("\n");
