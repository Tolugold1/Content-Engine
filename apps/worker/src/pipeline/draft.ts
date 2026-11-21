import type { ClaimCheck, Script } from "@content-engine/ai";
import {
  BRAND,
  fitCaption,
  PLATFORMS,
  slugify,
  TEMPLATE_BY_TONE,
  type Captions,
  type Category,
  type Draft,
  type NewDraft,
  type TimelineEvent,
} from "@content-engine/core";
import type { TimedWord } from "@content-engine/media";
import type { VideoProps } from "@content-engine/video";
import { randomBytes } from "node:crypto";

/** Turns a checked script into a new draft. Captions are fitted to platform limits here, once. */
export function toNewDraft(input: {
  trendId: string;
  category: Category;
  script: Script;
  check: ClaimCheck;
  status: "rendering" | "failed";
  timeline: TimelineEvent[];
}): NewDraft {
  const { script, check } = input;
  const hashtags = [...new Set([BRAND.hashtag, ...script.hashtags.map((tag) => (tag.startsWith("#") ? tag : `#${tag}`))])].slice(0, 6);
  const captions = Object.fromEntries(PLATFORMS.map((platform) => [platform, fitCaption(platform, script.captions[platform])])) as Captions;
  const spokenSeconds = script.scenes.reduce((sum, scene) => sum + Math.max(1, scene.durationSec), 0);

  return {
    trendId: input.trendId,
    slug: `${slugify(script.title, 48)}-${randomBytes(3).toString("hex")}`,
    title: script.title,
    hook: script.hook,
    tone: script.tone,
    category: input.category,
    status: input.status,
    scenes: script.scenes.map((scene, index) => ({
      index,
      text: scene.text,
      visual: scene.visual,
      durationSec: Math.max(1, scene.durationSec),
    })),
    captions,
    hashtags,
    engagementQuestion: script.engagementQuestion,
    claims: check.claims.map((claim, index) => ({
      id: `c${index + 1}`,
      text: claim.text,
      status: claim.status,
      evidenceIds: claim.evidenceIds,
      verdict: claim.verdict,
      note: claim.note,
    })),
    durationSec: spokenSeconds + 4,
    media: { video: null, still: null, audio: null },
    costUsd: 0,
    timeline: input.timeline,
  };
}

/** Everything the Remotion templates need, from the draft plus the voice timings. */
export function buildVideoProps(
  draft: Draft,
  timing: { scenes: Array<{ start: number; end: number }>; outro: { start: number; end: number }; words: TimedWord[] },
  audioUrl: string | null,
): VideoProps {
  const template = TEMPLATE_BY_TONE[draft.tone];
  const outlets = [...new Set(draft.evidence.map((item) => item.outlet))];
  return {
    tone: draft.tone,
    templateName: template.name,
    accent: template.accent,
    series: BRAND.series,
    handle: `@${BRAND.name}`,
    hashtag: BRAND.hashtag,
    hook: draft.hook,
    question: draft.engagementQuestion,
    outro: BRAND.outro,
    scenes: draft.scenes.map((scene, index) => ({
      text: scene.text,
      visual: scene.visual,
      start: timing.scenes[index]?.start ?? 0,
      end: timing.scenes[index]?.end ?? timing.outro.start,
    })),
    outroStart: timing.outro.start,
    words: timing.words,
    sources: outlets,
    audioUrl,
    durationSec: timing.outro.end + 1.5,
  };
}
