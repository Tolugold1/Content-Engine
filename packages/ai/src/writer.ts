import { BRAND, Tone, type Evidence } from "@content-engine/core";
import { z } from "zod";
import { MODELS } from "./client";
import { runStructured, type AiContext } from "./run";

export const WRITER_PROMPT_VERSION = "writer-v1";

export const ScriptSchema = z.object({
  title: z.string().describe("Headline for the dashboard (max 70 characters)"),
  hook: z.string().describe("The first spoken line, max 12 words; also the on-screen title"),
  tone: Tone,
  scenes: z.array(
    z.object({
      text: z.string().describe("Spoken words for this scene"),
      visual: z.string().describe("Short instruction for the template, e.g. 'Kinetic title', 'Reaction card', 'Poll card', 'Source chips'"),
      durationSec: z.number().describe("Estimated seconds to say this scene"),
    }),
  ),
  captions: z.object({
    tiktok: z.string(),
    instagram: z.string(),
    youtube: z.string().describe("YouTube Shorts title, max 90 characters"),
    x: z.string().describe("Max 260 characters including hashtags"),
    facebook: z.string(),
  }),
  hashtags: z.array(z.string()),
  engagementQuestion: z.string(),
  claims: z.array(
    z.object({
      text: z.string().describe("One factual statement made in the script"),
      evidenceIds: z.array(z.string()).describe("IDs like E1, E2 from the evidence list; empty if only social chatter"),
    }),
  ),
});
export type Script = z.infer<typeof ScriptSchema>;

const SYSTEM = `You write 20 to 40 second vertical-video scripts for "${BRAND.series} by ${BRAND.name}", a Nigerian channel covering celebrity gist, football and trending news.

Voice:
${BRAND.voice.map((line) => `- ${line}`).join("\n")}

Structure:
- 4 to 6 scenes. Scene 1 is the hook: max 12 words, no greetings, no channel intro. The last scene asks the engagement question.
- Do not write the outro; "${BRAND.outro}" is added automatically.
- Tone: comedy for light celebrity gist (playful, punchy), hype for football (fast, energetic), explainer for serious news (calm, neutral, no jokes, mention that sources are on screen).

Accuracy rules (most important):
- Every factual statement in the script must appear in "claims" with the IDs of the evidence that supports it.
- Claims supported by two or more different outlets may be stated plainly.
- Claims supported by one outlet must be attributed in the spoken text ("Punch reports...").
- Claims with no outlet are social chatter: say so ("people on X are claiming...", "this has not been confirmed").
- Never invent facts, quotes, numbers, dates or names. Never present a rumour as fact. No insults about real people; joke about situations, not identities. Do not mention private individuals.

Captions:
- Each platform caption ends with the engagement question (YouTube title excepted) and includes ${BRAND.hashtag}.
- X: at most 260 characters including hashtags. YouTube: a title of at most 90 characters.
- 3 to 6 hashtags in total, always including ${BRAND.hashtag}.`;

export interface Dossier {
  title: string;
  summary: string;
  category: string;
  isSerious: boolean;
  tone: Tone;
  mood: string;
  reactionSummary: string;
  topTakes: string[];
  angle: string;
  evidence: Evidence[];
}

/** Evidence is shown to the model with short labels (E1, E2...) mapped back to real IDs afterwards. */
export function labelEvidence(evidence: Evidence[]): { text: string; idFor: Map<string, string> } {
  const idFor = new Map<string, string>();
  const lines = evidence.map((item, index) => {
    const label = `E${index + 1}`;
    idFor.set(label, item.id);
    return `[${label}] ${item.outlet} — ${item.title}${item.snippet ? `\n    "${item.snippet.slice(0, 600)}"` : ""}`;
  });
  return { text: lines.length ? lines.join("\n") : "(no outlet has reported this; everything is social chatter)", idFor };
}

export function formatDossier(dossier: Dossier, evidenceText: string): string {
  return [
    `Story: ${dossier.title}`,
    dossier.summary,
    `Category: ${dossier.category}${dossier.isSerious ? " (serious: explainer tone, no jokes)" : ""}`,
    `Tone: ${dossier.tone}. Mood on X: ${dossier.mood}.`,
    `What people are saying: ${dossier.reactionSummary}`,
    dossier.topTakes.length ? `Top takes:\n${dossier.topTakes.map((take) => `- ${take}`).join("\n")}` : "",
    `Angle to lead with: ${dossier.angle}`,
    `\nEvidence:\n${evidenceText}`,
  ]
    .filter(Boolean)
    .join("\n");
}

/** Writes the script, captions and claim list. Pass `feedback` to revise after a failed claim check. */
export async function writeScript(ctx: AiContext, dossier: Dossier, feedback?: { previous: Script; issues: string[] }): Promise<Script> {
  const { text, idFor } = labelEvidence(dossier.evidence);
  const revision = feedback
    ? `\n\nYour previous draft failed the claim check. Fix every issue and keep what worked.\nIssues:\n${feedback.issues.map((issue) => `- ${issue}`).join("\n")}\n\nPrevious draft:\n${JSON.stringify(feedback.previous)}`
    : "";
  const script = await runStructured(ctx, {
    stage: feedback ? "script_revision" : "script",
    model: MODELS.writer,
    promptVersion: WRITER_PROMPT_VERSION,
    effort: "medium",
    system: SYSTEM,
    content: formatDossier(dossier, text) + revision,
    schema: ScriptSchema,
  });
  return {
    ...script,
    tone: dossier.isSerious ? "explainer" : script.tone,
    claims: script.claims.map((claim) => ({
      ...claim,
      evidenceIds: claim.evidenceIds.map((label) => idFor.get(label.trim())).filter((id): id is string => Boolean(id)),
    })),
  };
}
