import type Anthropic from "@anthropic-ai/sdk";
import { domainOf } from "@content-engine/core";
import { getClaude, MODELS } from "./client";
import { fallbackOptions, recordClaudeUsage, type AiContext } from "./run";

export const RESEARCH_PROMPT_VERSION = "research-v1";

export interface ResearchEvidence {
  outlet: string;
  title: string;
  url: string;
  snippet: string;
}

export interface ResearchResult {
  findings: string;
  evidence: ResearchEvidence[];
}

const SYSTEM = `You are a fact-checker for a Nigerian news-and-gist video channel.
Find reporting by news outlets about the story you are given. Search at most three times.
Prefer established Nigerian and international outlets. Social media posts, forums and anonymous blogs are not sources.
Write one short sentence per distinct fact you could verify and cite the source for each.
If you cannot find reporting, say so plainly. Never guess.`;

const MAX_CONTINUATIONS = 2;

/**
 * Searches the web for independent reporting and returns each cited passage as
 * evidence. Citations carry the exact supporting text, which the claim checker uses.
 */
export async function researchStory(ctx: AiContext, story: { title: string; summary: string }): Promise<ResearchResult> {
  const client = ctx.client ?? getClaude();
  const messages: Anthropic.Beta.Messages.BetaMessageParam[] = [
    { role: "user", content: `Story: ${story.title}\n${story.summary}\n\nWhat can be verified, and by which outlets?` },
  ];
  const blocks: Anthropic.Beta.Messages.BetaContentBlock[] = [];

  for (let attempt = 0; attempt <= MAX_CONTINUATIONS; attempt++) {
    const startedAt = Date.now();
    const response = await client.beta.messages.create({
      model: MODELS.research,
      max_tokens: 8_000,
      system: SYSTEM,
      messages,
      tools: [{ type: "web_search_20260209", name: "web_search", max_uses: 3 }],
      output_config: { effort: "medium" },
      ...fallbackOptions(MODELS.research),
    });
    await recordClaudeUsage(ctx, {
      stage: "research",
      model: MODELS.research,
      promptVersion: RESEARCH_PROMPT_VERSION,
      usage: response.usage,
      startedAt,
    });
    blocks.push(...response.content);
    if (response.stop_reason !== "pause_turn") break;
    // Server-side search loop paused: send the turn back so it resumes where it left off.
    messages.push({ role: "assistant", content: response.content });
  }

  return extractEvidence(blocks);
}

/** Pulls cited passages out of the response, one evidence item per URL. */
export function extractEvidence(blocks: Anthropic.Beta.Messages.BetaContentBlock[]): ResearchResult {
  const byUrl = new Map<string, ResearchEvidence>();
  const findings: string[] = [];
  for (const block of blocks) {
    if (block.type !== "text") continue;
    findings.push(block.text);
    for (const citation of block.citations ?? []) {
      if (citation.type !== "web_search_result_location") continue;
      const outlet = domainOf(citation.url);
      if (!outlet) continue;
      const existing = byUrl.get(citation.url);
      const snippet = citation.cited_text.trim();
      if (existing) {
        if (!existing.snippet.includes(snippet)) existing.snippet = `${existing.snippet} … ${snippet}`.slice(0, 1_500);
      } else {
        byUrl.set(citation.url, { outlet, title: citation.title ?? outlet, url: citation.url, snippet: snippet.slice(0, 1_500) });
      }
    }
  }
  return { findings: findings.join("").trim(), evidence: [...byUrl.values()] };
}
