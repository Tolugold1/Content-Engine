import type Anthropic from "@anthropic-ai/sdk";
import type { Evidence, UsageRecord } from "@content-engine/core";
import { describe, expect, it, vi } from "vitest";
import { checkClaims } from "./judge";
import { extractEvidence } from "./research";
import { AiRefusalError, type AiContext } from "./run";
import { labelEvidence, writeScript, type Dossier, type Script } from "./writer";

const usage = { input_tokens: 1000, output_tokens: 500, cache_read_input_tokens: 0, cache_creation_input_tokens: 0, server_tool_use: null };

function fakeContext(parsed: unknown, stopReason = "end_turn") {
  const records: UsageRecord[] = [];
  const parse = vi.fn(async () => ({ parsed_output: parsed, stop_reason: stopReason, usage }));
  const ctx: AiContext = {
    trendId: "trend-1",
    recordUsage: async (record) => void records.push(record),
    client: { beta: { messages: { parse } } } as unknown as Anthropic,
  };
  return { ctx, records, parse };
}

const evidence: Evidence[] = [
  { id: "ev-a", outlet: "punchng.com", title: "A", url: "https://punchng.com/a", snippet: "Kickoff is at 6pm.", fetchedAt: "" },
  {
    id: "ev-b",
    outlet: "vanguardngr.com",
    title: "B",
    url: "https://www.vanguardngr.com/b",
    snippet: "The match starts at 6pm.",
    fetchedAt: "",
  },
];

const dossier: Dossier = {
  title: "Derby tonight",
  summary: "Derby at 6pm",
  category: "football",
  isSerious: false,
  tone: "hype",
  mood: "hype",
  reactionSummary: "Fans are excited",
  topTakes: [],
  angle: "Kickoff time",
  evidence,
};

const script: Script = {
  title: "Derby tonight",
  hook: "Derby day!",
  tone: "hype",
  scenes: [{ text: "Kickoff is at 6pm.", visual: "Scoreboard", durationSec: 4 }],
  captions: { tiktok: "a", instagram: "b", youtube: "c", x: "d", facebook: "e" },
  hashtags: ["#GoldenGist"],
  engagementQuestion: "Score?",
  claims: [{ text: "Kickoff is at 6pm.", evidenceIds: ["E1", "E2", "E9"] }],
};

describe("writer", () => {
  it("labels evidence for the model and maps labels back to ids", async () => {
    expect(labelEvidence(evidence).text).toContain("[E2] vanguardngr.com");
    const { ctx, records } = fakeContext(script);
    const result = await writeScript(ctx, dossier);
    expect(result.claims[0]?.evidenceIds).toEqual(["ev-a", "ev-b"]);
    expect(records[0]).toMatchObject({ provider: "anthropic", stage: "script", trendId: "trend-1" });
    expect(records[0]?.costUsd).toBeCloseTo((1000 * 4 + 500 * 20) / 1_000_000);
  });

  it("turns refusals into a typed error", async () => {
    const { ctx } = fakeContext(null, "refusal");
    await expect(writeScript(ctx, dossier)).rejects.toBeInstanceOf(AiRefusalError);
  });
});

describe("claim check", () => {
  it("computes sourcing status from outlets and reports judge issues", async () => {
    const mapped = {
      ...script,
      claims: [
        { text: "Kickoff is at 6pm.", evidenceIds: ["ev-a", "ev-b"] },
        { text: "Ade is injured", evidenceIds: [] },
      ],
    };
    const { ctx } = fakeContext({
      verdicts: [
        { claimIndex: 0, verdict: "supported", note: "Two outlets agree." },
        { claimIndex: 1, verdict: "misframed", note: "Chatter stated as fact." },
      ],
      unlistedClaims: [],
    });
    const result = await checkClaims(ctx, mapped, evidence);
    expect(result.claims.map((claim) => claim.status)).toEqual(["confirmed", "chatter"]);
    expect(result.passed).toBe(false);
    expect(result.issues[0]).toContain("misframed");
  });
});

describe("research evidence extraction", () => {
  it("collects one evidence item per cited URL with its passages", () => {
    const blocks = [
      {
        type: "text",
        text: "Kickoff is at 6pm.",
        citations: [
          {
            type: "web_search_result_location",
            url: "https://www.punchng.com/a",
            title: "Derby",
            cited_text: "Kickoff at 6pm",
            encrypted_index: "x",
          },
          {
            type: "web_search_result_location",
            url: "https://www.punchng.com/a",
            title: "Derby",
            cited_text: "at the stadium",
            encrypted_index: "y",
          },
        ],
      },
    ] as unknown as Anthropic.Beta.Messages.BetaContentBlock[];
    const result = extractEvidence(blocks);
    expect(result.evidence).toHaveLength(1);
    expect(result.evidence[0]).toMatchObject({ outlet: "punchng.com", snippet: "Kickoff at 6pm … at the stadium" });
  });
});
