import { isCaptionWithinLimit, PLATFORM_INFO } from "./platforms";
import type { Draft, Platform, Review, ReviewChannel } from "./schemas";

/**
 * Review rules shared by every channel (web dashboard and Telegram bot).
 *
 * Both channels call these pure functions against the same database row, so:
 * - the first decision wins, whichever channel it came from;
 * - the losing channel gets a ReviewConflictError it can show ("already
 *   approved on Telegram at 10:42") instead of double-posting;
 * - every edit is recorded for the feedback loop.
 */

export class ReviewConflictError extends Error {
  constructor(readonly existing: Review) {
    super(`Already ${existing.decision} via ${existing.channel} at ${existing.at}`);
    this.name = "ReviewConflictError";
  }
}

export class ReviewRuleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ReviewRuleError";
  }
}

export interface ReviewInput {
  decision: "approved" | "rejected";
  channel: ReviewChannel;
  reason?: string;
  at?: string;
}

/** Claims that block approval until the script is fixed or the draft is rejected. */
export function blockingClaims(draft: Draft) {
  return draft.claims.filter((claim) => claim.verdict !== "supported");
}

export function applyReview(draft: Draft, input: ReviewInput): Draft {
  if (draft.review) throw new ReviewConflictError(draft.review);
  if (draft.status !== "pending_review") {
    throw new ReviewRuleError(`This draft is ${draft.status.replace("_", " ")}, not waiting for review.`);
  }
  if (input.decision === "approved" && blockingClaims(draft).length > 0) {
    throw new ReviewRuleError("Some claims are not supported by evidence. Fix the script or reject the draft.");
  }
  if (input.decision === "rejected" && !input.reason?.trim()) {
    throw new ReviewRuleError("Give a reason when rejecting, so the writer can learn from it.");
  }

  const at = input.at ?? new Date().toISOString();
  const review: Review = {
    decision: input.decision,
    channel: input.channel,
    at,
    ...(input.reason?.trim() ? { reason: input.reason.trim() } : {}),
  };

  return {
    ...draft,
    status: input.decision,
    review,
    timeline: [
      ...draft.timeline,
      {
        stage: "reviewed",
        at,
        note: `${input.decision === "approved" ? "Approved" : "Rejected"} on ${channelLabel(input.channel)}`,
      },
    ],
  };
}

export function editCaption(
  draft: Draft,
  platform: Platform,
  text: string,
  channel: ReviewChannel,
  at = new Date().toISOString(),
): Draft {
  if (!["pending_review", "approved"].includes(draft.status)) {
    throw new ReviewRuleError("Captions can only be edited before the draft is posted.");
  }
  const next = text.trim();
  if (!next) throw new ReviewRuleError("Caption cannot be empty.");
  if (!isCaptionWithinLimit(platform, next)) {
    throw new ReviewRuleError(
      `${PLATFORM_INFO[platform].label} allows ${PLATFORM_INFO[platform].captionLimit} characters.`,
    );
  }
  const before = draft.captions[platform];
  if (before === next) return draft;

  return {
    ...draft,
    captions: { ...draft.captions, [platform]: next },
    edits: [...draft.edits, { field: `caption.${platform}`, before, after: next, channel, at }],
    timeline: [
      ...draft.timeline,
      { stage: "caption_edited", at, note: `${PLATFORM_INFO[platform].label} caption edited on ${channelLabel(channel)}` },
    ],
  };
}

export function markPosted(
  draft: Draft,
  platform: Platform,
  url: string,
  at = new Date().toISOString(),
): Draft {
  if (!["approved", "posted"].includes(draft.status)) {
    throw new ReviewRuleError("Approve the draft before marking it as posted.");
  }
  let parsed: URL;
  try {
    parsed = new URL(url.trim());
  } catch {
    throw new ReviewRuleError("Paste the full link to the post.");
  }
  if (parsed.protocol !== "https:") throw new ReviewRuleError("Post links should start with https://");

  const posts = [
    ...draft.posts.filter((post) => post.platform !== platform),
    { platform, url: parsed.toString(), postedAt: at, via: "manual" as const },
  ];

  return {
    ...draft,
    status: "posted",
    posts,
    timeline: [...draft.timeline, { stage: "posted", at, note: `Posted on ${PLATFORM_INFO[platform].label}` }],
  };
}

/** Share of reviewed drafts approved with no caption edits: the headline quality metric. */
export function firstPassApprovalRate(drafts: Draft[]): number | null {
  const reviewed = drafts.filter((draft) => draft.review);
  if (reviewed.length === 0) return null;
  const clean = reviewed.filter((draft) => draft.review?.decision === "approved" && draft.edits.length === 0);
  return clean.length / reviewed.length;
}

export function channelLabel(channel: ReviewChannel): string {
  return channel === "web" ? "the dashboard" : "Telegram";
}
