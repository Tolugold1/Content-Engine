import { describe, expect, it } from "vitest";
import { sanitiseSearch, toDraft, type DraftRow } from "./mappers";

const row: DraftRow = {
  id: "7c0c2a4e-1d2b-4c55-9a51-2f7d0d5e7a10",
  slug: "derby-tonight-a1b2c3",
  title: "Derby tonight",
  hook: "Derby day!",
  tone: "hype",
  category: "football",
  status: "approved",
  scenes: [{ index: 0, text: "Kickoff at 6pm.", visual: "Scoreboard", durationSec: 4 }],
  captions: { tiktok: "a", instagram: "b", youtube: "c", x: "d", facebook: "e" },
  hashtags: ["#GoldenGist"],
  engagement_question: "Score?",
  duration_sec: "28.5",
  video_key: "drafts/x/video.mp4",
  still_key: "drafts/x/still.png",
  audio_key: null,
  telegram_chat_id: "42",
  telegram_message_id: "77",
  created_at: "2026-11-21T10:00:00+00:00",
  trend: {
    id: "t1",
    title: "Derby",
    sources: ["Fixtures feed"],
    mood: "hype",
    reaction_summary: "Excited",
    top_takes: [],
    virality_score: "8.2",
    detected_at: "2026-11-21T09:50:00+00:00",
    evidence: [
      {
        id: "e1",
        outlet: "punchng.com",
        title: "Preview",
        url: "https://punchng.com/a",
        snippet: null,
        fetched_at: "2026-11-21T09:55:00+00:00",
      },
    ],
    usage: [{ cost_usd: "0.120000" }, { cost_usd: 0.03 }],
  },
  claims: [
    { id: "c2", position: 1, text: "Second", status: "reported", evidence_ids: ["e1"], verdict: "supported", note: null },
    { id: "c1", position: 0, text: "First", status: "chatter", evidence_ids: [], verdict: "supported", note: "framed" },
  ],
  review: [{ decision: "approved", channel: "telegram", reason: null, created_at: "2026-11-21T10:05:00+00:00" }],
  edits: [{ field: "caption.x", before: "a", after: "b", channel: "web", created_at: "2026-11-21T10:04:00+00:00" }],
  posts: [],
  metrics: [],
  events: [
    { id: 2, stage: "reviewed", note: "Approved on Telegram", at: "2026-11-21T10:05:00+00:00" },
    { id: 1, stage: "rendered", note: null, at: "2026-11-21T10:01:00+00:00" },
  ],
};

describe("toDraft", () => {
  it("maps a joined PostgREST row to a valid Draft", () => {
    const draft = toDraft(row);
    expect(draft.durationSec).toBe(28.5);
    expect(draft.trend.viralityScore).toBe(8.2);
    expect(draft.costUsd).toBeCloseTo(0.15);
    expect(draft.claims.map((claim) => claim.text)).toEqual(["First", "Second"]);
    expect(draft.review).toMatchObject({ decision: "approved", channel: "telegram" });
    expect(draft.telegram).toEqual({ chatId: "42", messageId: 77 });
    expect(draft.timeline.map((event) => event.stage)).toEqual(["rendered", "reviewed"]);
    expect(draft.evidence[0]).not.toHaveProperty("snippet");
    expect(draft.media).toEqual({ video: "drafts/x/video.mp4", still: "drafts/x/still.png", audio: null });
  });

  it("accepts a one-to-one review returned as an object or null", () => {
    expect(toDraft({ ...row, review: null }).review).toBeNull();
    expect(toDraft({ ...row, review: row.review && Array.isArray(row.review) ? row.review[0]! : null }).review?.channel).toBe("telegram");
  });

  it("strips PostgREST filter syntax from search text", () => {
    expect(sanitiseSearch("wizkid,(or)*%")).toBe("wizkid  or");
  });
});
