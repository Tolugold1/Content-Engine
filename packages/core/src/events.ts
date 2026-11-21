import type { Platform, ReviewChannel } from "./schemas";

/**
 * Event contract between the pipeline, the Telegram bot and the dashboard.
 *
 * draft/ready     pipeline -> Telegram bot (sends the preview + buttons)
 *                          -> dashboard (live "new draft" update)
 *                 Telegram always gets this event; the dashboard is an extra
 *                 consumer and never replaces the notification.
 * draft/reviewed  web or Telegram -> pipeline (resumes the paused workflow)
 *                                -> the other channel (edits its message / UI)
 * draft/posted    web or Telegram -> analytics scheduler (+24h / +72h pulls)
 */
export const EVENTS = {
  draftReady: "draft/ready",
  draftReviewed: "draft/reviewed",
  draftCaptionEdited: "draft/caption-edited",
  draftPosted: "draft/posted",
} as const;

export interface EventPayloads {
  [EVENTS.draftReady]: { draftId: string };
  [EVENTS.draftReviewed]: { draftId: string; decision: "approved" | "rejected"; channel: ReviewChannel };
  [EVENTS.draftCaptionEdited]: { draftId: string; platform: Platform; channel: ReviewChannel };
  [EVENTS.draftPosted]: { draftId: string; platform: Platform; url: string };
}

export type EventName = keyof EventPayloads;
