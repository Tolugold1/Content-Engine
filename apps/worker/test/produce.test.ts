import { MemoryRepository, setRepository } from "@content-engine/db";
import { InngestTestEngine } from "@inngest/test";
import { beforeEach, describe, expect, it, vi } from "vitest";

const script = {
  title: "Derby tonight",
  hook: "Derby day!",
  tone: "hype" as const,
  scenes: [
    { text: "Kickoff is at 6pm.", visual: "Scoreboard", durationSec: 4 },
    { text: "Your prediction?", visual: "Poll card", durationSec: 3 },
  ],
  captions: { tiktok: "a", instagram: "b", youtube: "c", x: "d", facebook: "e" },
  hashtags: ["#GoldenGist"],
  engagementQuestion: "Your prediction?",
  claims: [{ text: "Kickoff is at 6pm.", evidenceIds: [] as string[] }],
};
const passing = {
  claims: [{ text: "Kickoff is at 6pm.", status: "reported", evidenceIds: [], verdict: "supported", note: "ok" }],
  unlistedClaims: [],
  passed: true,
  issues: [],
};
const failing = { ...passing, claims: [{ ...passing.claims[0], verdict: "misframed" }], passed: false, issues: ["misframed"] };

const ai = vi.hoisted(() => ({
  analyseReactions: vi.fn(),
  researchStory: vi.fn(),
  writeScript: vi.fn(),
  checkClaims: vi.fn(),
}));
vi.mock("@content-engine/ai", () => ai);
vi.mock("@content-engine/sources", () => ({ searchReactions: vi.fn(async () => ({ reactions: [], usage: null })) }));
vi.mock("@content-engine/media", () => ({
  getStorage: vi.fn(),
  mediaKeys: {},
  buildNarration: vi.fn(),
  rangeTimings: vi.fn(),
  synthesizeVoice: vi.fn(),
  wordsFromAlignment: vi.fn(),
}));
vi.mock("@content-engine/video", () => ({ renderVideoFile: vi.fn(), renderStillFile: vi.fn() }));

const { produceDraft } = await import("../src/functions/produce");

const event = {
  name: "story/selected" as const,
  data: {
    title: "Derby tonight",
    sources: ["Fixtures feed"],
    summary: "Derby at 6pm",
    searchQuery: "derby",
    category: "football" as const,
    isSerious: false,
    score: 8,
    relatedNews: [{ url: "https://punchng.com/derby", title: "Derby preview", outlet: "punchng.com", snippet: "Kickoff 6pm" }],
  },
};

const mediaSteps = [
  { id: "voice", handler: () => ({ key: "drafts/x/voice.mp3", scenes: [], outro: { start: 7, end: 9 }, words: [] }) },
  { id: "render", handler: () => ({ video: "drafts/x/video.mp4", still: "drafts/x/still.png", durationSec: 10.5 }) },
  { id: "announce-draft", handler: () => ({ ids: ["evt"] }) },
];

describe("produce-draft workflow", () => {
  let repo: MemoryRepository;
  beforeEach(() => {
    repo = new MemoryRepository({ seed: false });
    setRepository(repo);
    ai.analyseReactions.mockResolvedValue({
      mood: "hype",
      tone: "hype",
      reactionSummary: "Fans excited",
      topTakes: [],
      viralityScore: 8.2,
      angle: "Kickoff",
    });
    ai.researchStory.mockResolvedValue({
      findings: "",
      evidence: [{ outlet: "vanguardngr.com", title: "Match day", url: "https://vanguardngr.com/m", snippet: "6pm kickoff" }],
    });
    ai.writeScript.mockResolvedValue(script);
  });

  it("revises once after a failed claim check, then renders and marks the draft ready", async () => {
    ai.checkClaims.mockResolvedValueOnce(failing).mockResolvedValueOnce(passing);
    const t = new InngestTestEngine({ function: produceDraft, events: [event] });
    const { result } = await t.execute({ steps: mediaSteps });

    expect(ai.writeScript).toHaveBeenCalledTimes(2);
    expect(result).toMatchObject({ status: "pending_review" });
    const [draft] = await repo.listDrafts();
    expect(draft?.status).toBe("pending_review");
    expect(draft?.media).toEqual({ video: "drafts/x/video.mp4", still: "drafts/x/still.png", audio: "drafts/x/voice.mp3" });
    expect(draft?.evidence.map((e) => e.outlet).sort()).toEqual(["punchng.com", "vanguardngr.com"]);
    expect(draft?.trend.mood).toBe("hype");
  });

  it("blocks the draft when claims fail twice and never voices it", async () => {
    ai.checkClaims.mockResolvedValue(failing);
    const voice = vi.fn();
    const t = new InngestTestEngine({ function: produceDraft, events: [event] });
    const { result } = await t.execute({ steps: [{ id: "voice", handler: voice }] });

    expect(result).toMatchObject({ status: "failed" });
    expect(voice).not.toHaveBeenCalled();
    const [draft] = await repo.listDrafts();
    expect(draft?.status).toBe("failed");
    expect(draft?.timeline.at(-1)?.note).toContain("Claim check failed twice");
  });
});
