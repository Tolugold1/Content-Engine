import { ReviewConflictError, ReviewRuleError } from "@content-engine/core";
import { describe, expect, it } from "vitest";
import { MemoryRepository } from "./memory";

async function pendingDraft() {
  const repo = new MemoryRepository();
  const [draft] = await repo.listDrafts({ status: "pending_review" });
  if (!draft) throw new Error("sample data has no pending draft");
  return { repo, draft };
}

describe("MemoryRepository review rules", () => {
  it("lets the first decision win and rejects the second channel", async () => {
    const { repo, draft } = await pendingDraft();
    const approved = await repo.reviewDraft(draft.id, { decision: "approved", channel: "telegram" });
    expect(approved.status).toBe("approved");
    await expect(repo.reviewDraft(draft.id, { decision: "rejected", channel: "web", reason: "late" })).rejects.toBeInstanceOf(
      ReviewConflictError,
    );
  });

  it("requires a reason to reject", async () => {
    const { repo, draft } = await pendingDraft();
    await expect(repo.reviewDraft(draft.id, { decision: "rejected", channel: "web" })).rejects.toBeInstanceOf(ReviewRuleError);
  });

  it("records caption edits once and enforces platform limits", async () => {
    const { repo, draft } = await pendingDraft();
    const edited = await repo.editCaption(draft.id, "x", "Short and sharp #GoldenGist", "web");
    expect(edited.captions.x).toBe("Short and sharp #GoldenGist");
    expect(edited.edits).toHaveLength(1);
    const again = await repo.editCaption(draft.id, "x", "Short and sharp #GoldenGist", "web");
    expect(again.edits).toHaveLength(1);
    await expect(repo.editCaption(draft.id, "x", "a".repeat(281), "web")).rejects.toBeInstanceOf(ReviewRuleError);
  });

  it("only records posts for approved drafts and replaces the link per platform", async () => {
    const { repo, draft } = await pendingDraft();
    await expect(repo.recordPost(draft.id, "tiktok", "https://tiktok.com/@a/video/1")).rejects.toBeInstanceOf(ReviewRuleError);
    await repo.reviewDraft(draft.id, { decision: "approved", channel: "web" });
    await repo.recordPost(draft.id, "tiktok", "https://tiktok.com/@a/video/1");
    const posted = await repo.recordPost(draft.id, "tiktok", "https://tiktok.com/@a/video/2");
    expect(posted.status).toBe("posted");
    expect(posted.posts).toEqual([expect.objectContaining({ platform: "tiktok", url: "https://tiktok.com/@a/video/2" })]);
    await expect(repo.recordPost(draft.id, "x", "http://insecure.example")).rejects.toBeInstanceOf(ReviewRuleError);
  });
});

describe("MemoryRepository pipeline writes", () => {
  it("creates a draft from a saved trend and moves it to review with media", async () => {
    const repo = new MemoryRepository({ seed: false });
    const trend = await repo.saveTrend(
      { title: "Test", sources: ["X"], mood: "jokes", reactionSummary: "", topTakes: [], viralityScore: 8 },
      [{ outlet: "Example", title: "Story", url: "https://example.com/a" }],
    );
    const draft = await repo.createDraft({
      trendId: trend.id,
      slug: "test",
      title: "Test",
      hook: "Hook",
      tone: "comedy",
      category: "celebrity",
      status: "rendering",
      scenes: [{ index: 0, text: "Hello", visual: "Title", durationSec: 4 }],
      captions: { tiktok: "a", instagram: "b", youtube: "c", x: "d", facebook: "e" },
      hashtags: ["#GoldenGist"],
      engagementQuestion: "Q?",
      claims: [],
      durationSec: 6,
      media: { video: null, still: null, audio: null },
      costUsd: 0,
    });
    expect(draft.evidence).toHaveLength(1);
    const ready = await repo.transitionDraft(draft.id, {
      from: ["rendering"],
      to: "pending_review",
      stage: "rendered",
      media: { video: "v.mp4", still: "s.png" },
      durationSec: 28,
    });
    expect(ready.status).toBe("pending_review");
    expect(ready.media.video).toBe("v.mp4");
    await expect(repo.transitionDraft(draft.id, { from: ["rendering"], to: "failed", stage: "failed" })).rejects.toThrow();
    expect(await repo.countDraftsSince(new Date(Date.now() - 60_000).toISOString())).toBe(1);
  });

  it("adds usage cost to the draft it belongs to", async () => {
    const { repo, draft } = await pendingDraft();
    await repo.recordUsage({
      trendId: draft.trend.id,
      provider: "anthropic",
      stage: "script",
      model: "claude-opus-5-5",
      promptVersion: "v1",
      inputTokens: 1,
      outputTokens: 1,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
      units: 0,
      costUsd: 0.5,
      latencyMs: 10,
    });
    const reloaded = await repo.getDraft(draft.id);
    expect(reloaded?.costUsd).toBeCloseTo(draft.costUsd + 0.5);
  });
});
