import type { Script } from "@content-engine/ai";
import { BRAND, captionLength, PLATFORM_INFO, PLATFORMS } from "@content-engine/core";
import type { EvalCase } from "./cases";

/** Deterministic checks on a script. Each returns a pass flag and a reason, so reports explain failures. */
export interface GradeResult {
  name: string;
  passed: boolean;
  detail: string;
}

const HEDGES = /\b(claim(s|ing|ed)?|saying|rumou?rs?|unconfirmed|not (been )?confirmed|reportedly|alleged(ly)?|according to)\b/i;
const EMOJI = /\p{Extended_Pictographic}/u;

function words(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export function gradeScript(script: Script, testCase: EvalCase): GradeResult[] {
  const spoken = script.scenes.map((scene) => scene.text).join(" ");
  const totalWords = words(spoken);
  const results: GradeResult[] = [
    {
      name: "scene count 4-6",
      passed: script.scenes.length >= 4 && script.scenes.length <= 6,
      detail: `${script.scenes.length} scenes`,
    },
    { name: "hook max 12 words", passed: words(script.hook) <= 12, detail: `${words(script.hook)} words` },
    // ~2.6 spoken words per second: 20-40 seconds before the outro.
    { name: "length 20-40s", passed: totalWords >= 45 && totalWords <= 115, detail: `${totalWords} words` },
    {
      name: "ends with the question",
      passed: (script.scenes.at(-1)?.text.trim().endsWith("?") ?? false) && script.engagementQuestion.trim().endsWith("?"),
      detail: script.scenes.at(-1)?.text ?? "",
    },
    { name: "tone", passed: script.tone === testCase.expect.tone, detail: `${script.tone} (expected ${testCase.expect.tone})` },
    {
      name: "no hashtags or emoji in speech",
      passed: !/#\w/.test(spoken) && !EMOJI.test(spoken),
      detail: "spoken text must be plain",
    },
    {
      name: "captions within limits",
      passed: PLATFORMS.every((platform) => captionLength(script.captions[platform]) <= PLATFORM_INFO[platform].captionLimit),
      detail: PLATFORMS.map((p) => `${p}:${captionLength(script.captions[p])}`).join(" "),
    },
    {
      name: "brand hashtag",
      passed: script.hashtags.includes(BRAND.hashtag) && script.hashtags.length >= 3 && script.hashtags.length <= 6,
      detail: script.hashtags.join(" "),
    },
    {
      name: "no outro in script",
      passed: !spoken.toLowerCase().includes("that's your golden gist"),
      detail: "the outro is added automatically",
    },
  ];

  if (testCase.expect.hedges) {
    results.push({ name: "hedges unconfirmed claims", passed: HEDGES.test(spoken), detail: "needs 'claiming', 'unconfirmed', ..." });
  }
  for (const outlet of testCase.expect.attributes ?? []) {
    const short = outlet.split(" ")[0] ?? outlet;
    results.push({
      name: `attributes ${outlet}`,
      passed: spoken.toLowerCase().includes(short.toLowerCase()),
      detail: `single-source claim must name ${outlet}`,
    });
  }
  return results;
}
