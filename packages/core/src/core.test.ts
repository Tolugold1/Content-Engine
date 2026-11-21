import { describe, expect, it } from "vitest";
import { computeInsights, latestViews } from "./insights";
import { captionLength, fitCaption } from "./platforms";
import { claudeCost } from "./pricing";
import { applyReview, firstPassApprovalRate, ReviewConflictError, ReviewRuleError } from "./review";
import type { Draft, Evidence } from "./schemas";
import { claimStatusFromEvidence, domainOf, nextPostingSlot, slugify, startOfLocalDay } from "./utils";

const base = {
  id: "d1",
  status: "pending_review",
  review: null,
  claims: [],
  edits: [],
  timeline: [],
  metrics: [],
} as unknown as Draft;

describe("review rules", () => {
  it("approves a pending draft once and rejects a second decision", () => {
    const approved = applyReview(base, { decision: "approved", channel: "web", at: "2026-11-21T10:00:00Z" });
    expect(approved.status).toBe("approved");
    expect(() => applyReview(approved, { decision: "approved", channel: "telegram" })).toThrow(ReviewConflictError);
  });

  it("blocks approval while a claim is unsupported and requires a rejection reason", () => {
    const blocked = { ...base, claims: [{ id: "c1", text: "x", status: "chatter", evidenceIds: [], verdict: "misframed" }] } as Draft;
    expect(() => applyReview(blocked, { decision: "approved", channel: "web" })).toThrow(ReviewRuleError);
    expect(() => applyReview(base, { decision: "rejected", channel: "web", reason: "  " })).toThrow(ReviewRuleError);
  });

  it("computes first-pass approval from reviewed drafts only", () => {
    const clean = { ...base, review: { decision: "approved" } } as Draft;
    const edited = { ...clean, edits: [{}] } as Draft;
    expect(firstPassApprovalRate([clean, edited, base])).toBe(0.5);
    expect(firstPassApprovalRate([base])).toBeNull();
  });
});

describe("claims and captions", () => {
  const evidence = [
    { id: "a", outlet: "Punch", url: "https://punchng.com/1" },
    { id: "b", outlet: "Punch again", url: "https://www.punchng.com/2" },
    { id: "c", outlet: "Vanguard", url: "https://vanguardngr.com/3" },
  ] as Evidence[];

  it("needs two different outlets to call a claim confirmed", () => {
    expect(claimStatusFromEvidence(["a", "b"], evidence)).toBe("reported");
    expect(claimStatusFromEvidence(["a", "c"], evidence)).toBe("confirmed");
    expect(claimStatusFromEvidence(["zzz"], evidence)).toBe("chatter");
    expect(domainOf("not a url")).toBeNull();
  });

  it("counts emoji once and trims on a word boundary", () => {
    expect(captionLength("🔥🔥")).toBe(2);
    const fitted = fitCaption("x", `${"word ".repeat(80)}end`);
    expect(captionLength(fitted)).toBeLessThanOrEqual(280);
    expect(fitted.endsWith("…")).toBe(true);
    expect(slugify("Kezi B’s Wedding — Wow!")).toBe("kezi-b-s-wedding-wow");
  });
});

describe("time and money", () => {
  it("picks the next posting slot in Lagos time", () => {
    // 10:00 UTC = 11:00 Lagos, so the next slot is 12:30 Lagos = 11:30 UTC.
    expect(nextPostingSlot(["12:30", "18:30"], "Africa/Lagos", new Date("2026-11-21T10:00:00Z"))).toBe("2026-11-21T11:30:00.000Z");
    // After the last slot it rolls to tomorrow's first.
    expect(nextPostingSlot(["12:30", "18:30"], "Africa/Lagos", new Date("2026-11-21T20:00:00Z"))).toBe("2026-11-22T11:30:00.000Z");
    expect(startOfLocalDay("Africa/Lagos", new Date("2026-11-21T10:00:00Z"))).toBe("2026-11-20T23:00:00.000Z");
  });

  it("prices Claude calls including cache and web search", () => {
    const cost = claudeCost("claude-opus-5-5", {
      inputTokens: 1_000_000,
      outputTokens: 0,
      cacheReadTokens: 1_000_000,
      cacheWriteTokens: 0,
      webSearches: 2,
    });
    expect(cost).toBeCloseTo(4 + 0.2 + 0.02);
  });

  it("counts each platform's latest metrics once", () => {
    const draft = {
      metrics: [
        { platform: "tiktok", views: 100, checkedAt: "2026-11-21T00:00:00Z" },
        { platform: "tiktok", views: 900, checkedAt: "2026-11-23T00:00:00Z" },
        { platform: "x", views: 50, checkedAt: "2026-11-21T00:00:00Z" },
      ],
    } as Draft;
    expect(latestViews(draft)).toBe(950);
    expect(computeInsights([], []).costPerPostedUsd).toBeNull();
  });
});
