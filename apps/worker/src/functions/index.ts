import { readScreenshot, trackMetrics } from "./metrics";
import { produceDraft } from "./produce";
import { notifyDraftReady, postingReminderFn, reviewReminderFn, syncReviewDecision } from "./review";
import { trendScout } from "./scout";

export const functions = [
  trendScout,
  produceDraft,
  notifyDraftReady,
  syncReviewDecision,
  reviewReminderFn,
  postingReminderFn,
  trackMetrics,
  readScreenshot,
];
