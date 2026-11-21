import { analyseReactions, checkClaims, researchStory, writeScript, type Dossier } from "@content-engine/ai";
import { BRAND, errorMessage } from "@content-engine/core";
import { buildNarration, getStorage, mediaKeys, rangeTimings, synthesizeVoice, wordsFromAlignment } from "@content-engine/media";
import { events, inngest } from "@content-engine/services";
import { searchReactions } from "@content-engine/sources";
import { renderStillFile, renderVideoFile } from "@content-engine/video";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { aiContext, recordUsage, renderOptions, repo } from "../context";
import { buildVideoProps, toNewDraft } from "../pipeline/draft";

/**
 * Draft producer: reactions -> research -> script -> claim check (one revision)
 * -> voice -> render -> ready for review. Each step is retried on its own, so a
 * render hiccup never re-runs (or re-bills) the writing steps.
 */
export const produceDraft = inngest.createFunction(
  {
    id: "produce-draft",
    triggers: [events.storySelected],
    concurrency: 1, // rendering is CPU-heavy; one draft at a time
    retries: 2,
    onFailure: async ({ event, error }) => {
      const title = event.data.event.data.title;
      const stuck = (await repo().listDrafts({ status: "rendering", limit: 20 })).filter((draft) => draft.trend.title === title);
      for (const draft of stuck) {
        await repo().transitionDraft(draft.id, {
          from: ["rendering"],
          to: "failed",
          stage: "failed",
          note: errorMessage(error).slice(0, 300),
        });
      }
    },
  },
  async ({ event, step }) => {
    const story = event.data;

    const trend = await step.run("save-trend", () =>
      repo().saveTrend(
        { title: story.title, sources: story.sources, mood: "debate", reactionSummary: "", topTakes: [], viralityScore: story.score },
        story.relatedNews.map(({ url, title, outlet, snippet }) => ({ url, title, outlet, ...(snippet ? { snippet } : {}) })),
      ),
    );

    const reactions = await step.run("pull-reactions", async () => {
      const result = await searchReactions(story.searchQuery);
      await recordUsage(trend.id, result.usage);
      return result.reactions;
    });

    const analysis = await step.run("analyse-reactions", async () => {
      const result = await analyseReactions(aiContext(trend.id), story, reactions);
      await repo().updateTrend(trend.id, {
        mood: result.mood,
        reactionSummary: result.reactionSummary,
        topTakes: result.topTakes,
        viralityScore: result.viralityScore,
      });
      return result;
    });

    const evidence = await step.run("research", async () => {
      const research = await researchStory(aiContext(trend.id), story);
      await repo().addEvidence(trend.id, research.evidence);
      return repo().listEvidence(trend.id);
    });

    const dossier: Dossier = {
      title: story.title,
      summary: story.summary,
      category: story.category,
      isSerious: story.isSerious,
      tone: analysis.tone,
      mood: analysis.mood,
      reactionSummary: analysis.reactionSummary,
      topTakes: analysis.topTakes,
      angle: analysis.angle,
      evidence,
    };

    let script = await step.run("write-script", () => writeScript(aiContext(trend.id), dossier));
    let check = await step.run("check-claims", () => checkClaims(aiContext(trend.id), script, evidence));
    if (!check.passed) {
      const previous = script;
      const issues = check.issues;
      script = await step.run("revise-script", () => writeScript(aiContext(trend.id), dossier, { previous, issues }));
      check = await step.run("recheck-claims", () => checkClaims(aiContext(trend.id), script, evidence));
    }

    const at = new Date().toISOString();
    const draft = await step.run("create-draft", () =>
      repo().createDraft(
        toNewDraft({
          trendId: trend.id,
          category: story.category,
          script,
          check,
          status: check.passed ? "rendering" : "failed",
          timeline: [
            { stage: "trend_detected", at: trend.detectedAt, note: story.sources.join(", ") },
            { stage: "reactions_summarised", at, note: `${reactions.length} posts · mood ${analysis.mood}` },
            { stage: "script_written", at, note: `${script.scenes.length} scenes` },
            { stage: "claims_checked", at, note: check.passed ? `${check.claims.length} claims supported` : "Blocked" },
            ...(check.passed
              ? []
              : [{ stage: "failed" as const, at, note: `Claim check failed twice: ${check.issues.join(" ")}`.slice(0, 500) }]),
          ],
        }),
      ),
    );
    if (!check.passed) return { draftId: draft.id, status: "failed", issues: check.issues };

    const voice = await step.run("voice", async () => {
      const narration = buildNarration([...draft.scenes.map((scene) => scene.text), BRAND.outro]);
      const result = await synthesizeVoice(narration.text);
      const key = mediaKeys.audio(draft.id);
      await getStorage().put(key, result.audio, "audio/mpeg");
      await recordUsage(trend.id, result.usage);
      await repo().addTimelineEvent(draft.id, "voiced", `${result.durationSec.toFixed(1)}s`);
      const timings = rangeTimings(narration, result.alignment);
      return { key, scenes: timings.slice(0, -1), outro: timings.at(-1)!, words: wordsFromAlignment(result.alignment) };
    });

    const media = await step.run("render", async () => {
      const storage = getStorage();
      const audioUrl = await storage.signedUrl(voice.key, { expiresInSeconds: 3_600 });
      const props = buildVideoProps(draft, voice, audioUrl);
      const dir = await mkdtemp(path.join(tmpdir(), "golden-gist-"));
      try {
        const videoPath = path.join(dir, "video.mp4");
        const stillPath = path.join(dir, "still.png");
        await renderVideoFile(props, videoPath, renderOptions());
        await renderStillFile(props, stillPath, renderOptions());
        await storage.put(mediaKeys.video(draft.id), await readFile(videoPath), "video/mp4");
        await storage.put(mediaKeys.still(draft.id), await readFile(stillPath), "image/png");
        return { video: mediaKeys.video(draft.id), still: mediaKeys.still(draft.id), durationSec: props.durationSec };
      } finally {
        await rm(dir, { recursive: true, force: true });
      }
    });

    await step.run("mark-ready", () =>
      repo().transitionDraft(draft.id, {
        from: ["rendering"],
        to: "pending_review",
        stage: "rendered",
        media: { video: media.video, still: media.still, audio: voice.key },
        durationSec: media.durationSec,
      }),
    );
    await step.sendEvent("announce-draft", { name: "draft/ready", data: { draftId: draft.id } });
    return { draftId: draft.id, status: "pending_review" };
  },
);
