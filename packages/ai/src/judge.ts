import { claimStatusFromEvidence, JudgeVerdict, type ClaimStatus, type Evidence } from "@content-engine/core";
import { z } from "zod";
import { MODELS } from "./client";
import { runStructured, type AiContext } from "./run";
import type { Script } from "./writer";

export const JUDGE_PROMPT_VERSION = "judge-v1";

const JudgeSchema = z.object({
  verdicts: z.array(
    z.object({
      claimIndex: z.number().int(),
      verdict: JudgeVerdict,
      note: z.string().describe("One sentence explaining the verdict"),
    }),
  ),
  unlistedClaims: z.array(z.string()).describe("Factual statements in the spoken script that are missing from the claims list"),
});

const SYSTEM = `You check short news-video scripts before a human sees them. Be strict; a wrong video is worse than no video.

For each claim you get its sourcing status and the evidence passages.
- supported: the evidence directly supports the claim AND the spoken wording matches the status:
  confirmed (2+ outlets) may be stated plainly; reported (1 outlet) must name or attribute the outlet;
  chatter (no outlet) must be clearly framed as people's claims or as unconfirmed.
- misframed: the content is supported, but the wording overstates it (e.g. chatter or a single report stated as fact).
- unsupported: the evidence does not support the claim, or contradicts it.
Also list factual statements in the spoken script that are not in the claims list. Jokes, opinions and questions are not claims.`;

export interface ClaimCheck {
  claims: Array<{ text: string; status: ClaimStatus; evidenceIds: string[]; verdict: JudgeVerdict; note: string }>;
  unlistedClaims: string[];
  passed: boolean;
  issues: string[];
}

/** Computes each claim's sourcing status from the evidence, then asks the judge for verdicts. */
export async function checkClaims(ctx: AiContext, script: Script, evidence: Evidence[]): Promise<ClaimCheck> {
  const claims = script.claims.map((claim) => ({ ...claim, status: claimStatusFromEvidence(claim.evidenceIds, evidence) }));
  const spoken = script.scenes.map((scene, i) => `${i + 1}. ${scene.text}`).join("\n");
  const claimList = claims.length
    ? claims
        .map((claim, i) => {
          const passages = claim.evidenceIds
            .map((id) => evidence.find((item) => item.id === id))
            .filter((item): item is Evidence => Boolean(item))
            .map((item) => `    - ${item.outlet}: "${(item.snippet ?? item.title).slice(0, 600)}"`)
            .join("\n");
          return `[${i}] (${claim.status}) ${claim.text}\n${passages || "    - (no evidence)"}`;
        })
        .join("\n")
    : "(no claims listed)";

  const result = await runStructured(ctx, {
    stage: "claim_check",
    model: MODELS.judge,
    promptVersion: JUDGE_PROMPT_VERSION,
    effort: "high",
    system: SYSTEM,
    content: `Spoken script:\n${spoken}\n\nClaims:\n${claimList}`,
    schema: JudgeSchema,
  });

  const checked = claims.map((claim, index) => {
    const verdict = result.verdicts.find((item) => item.claimIndex === index);
    return {
      ...claim,
      verdict: verdict?.verdict ?? "unsupported",
      note: verdict?.note ?? "The checker returned no verdict for this claim.",
    };
  });
  const issues = [
    ...checked.filter((claim) => claim.verdict !== "supported").map((claim) => `"${claim.text}" is ${claim.verdict}: ${claim.note}`),
    ...result.unlistedClaims.map(
      (text) => `Unlisted factual statement: "${text}". Add it to claims with evidence, reframe it, or remove it.`,
    ),
  ];
  return { claims: checked, unlistedClaims: result.unlistedClaims, passed: issues.length === 0, issues };
}
