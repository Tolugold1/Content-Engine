import type { TriagedStory } from "@content-engine/ai";
import { describe, expect, it } from "vitest";
import { toNewDraft } from "../src/pipeline/draft";
import { selectStories, toSelectedEvent } from "../src/pipeline/select";

const story = (title: string, score: number, alreadyCovered = false): TriagedStory => ({
  title,
  summary: `${title} summary`,
  category: "celebrity",
  isSerious: false,
  score,
  searchQuery: title,
  itemIndexes: [0, 1],
  alreadyCovered,
});

describe("story selection", () => {
  it("keeps new stories above the threshold, best first, within quota", () => {
    const picked = selectStories([story("a", 6), story("b", 9), story("c", 8, true), story("d", 7.5)], 2, 7);
    expect(picked.map((s) => s.title)).toEqual(["b", "d"]);
    expect(selectStories([story("a", 9)], 0, 7)).toEqual([]);
  });

  it("carries related news forward as evidence", () => {
    const event = toSelectedEvent(story("a", 9), [
      { source: "punchng.com", kind: "news", title: "Report", url: "https://punchng.com/x", summary: "Body" },
      { source: "X trends (NG)", kind: "trend", title: "#a" },
    ]);
    expect(event.relatedNews).toEqual([{ url: "https://punchng.com/x", title: "Report", outlet: "punchng.com", snippet: "Body" }]);
    expect(event.sources).toEqual(["punchng.com", "X trends (NG)"]);
  });
});

describe("draft assembly", () => {
  it("fits captions, guarantees the brand hashtag and keeps verdicts", () => {
    const draft = toNewDraft({
      trendId: "t1",
      category: "celebrity",
      status: "rendering",
      timeline: [],
      script: {
        title: "A very good title",
        hook: "Hook",
        tone: "comedy",
        scenes: [{ text: "One", visual: "Kinetic title", durationSec: 3 }],
        captions: { tiktok: "t", instagram: "i", youtube: "y".repeat(140), x: "x".repeat(400), facebook: "f" },
        hashtags: ["NaijaGist"],
        engagementQuestion: "Q?",
        claims: [],
      },
      check: {
        claims: [{ text: "c", status: "reported", evidenceIds: ["e"], verdict: "supported", note: "ok" }],
        unlistedClaims: [],
        passed: true,
        issues: [],
      },
    });
    expect(Array.from(draft.captions.x).length).toBeLessThanOrEqual(280);
    expect(Array.from(draft.captions.youtube).length).toBeLessThanOrEqual(100);
    expect(draft.hashtags).toEqual(["#GoldenGist", "#NaijaGist"]);
    expect(draft.slug).toMatch(/^a-very-good-title-[0-9a-f]{6}$/);
    expect(draft.claims[0]).toMatchObject({ status: "reported", verdict: "supported" });
  });
});
