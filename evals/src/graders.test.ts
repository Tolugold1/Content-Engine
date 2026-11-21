import type { Script } from "@content-engine/ai";
import { describe, expect, it } from "vitest";
import { CASES } from "./cases";
import { gradeScript } from "./graders";

const good: Script = {
  title: "Femi Dee quitting?",
  hook: "Is Femi Dee really quitting Nollywood?",
  tone: "comedy",
  scenes: [
    { text: "Is Femi Dee really quitting Nollywood?", visual: "Kinetic title", durationSec: 3 },
    {
      text: "A viral post is claiming the actor is done with acting, and the timeline has entered panic mode.",
      visual: "Reaction card",
      durationSec: 6,
    },
    { text: "But no outlet has confirmed it, so for now this is pure gist, not news.", visual: "Source chips", durationSec: 5 },
    { text: "Half of you are already writing tributes, the other half are asking for receipts.", visual: "Reaction card", durationSec: 5 },
    { text: "So what do you think: real retirement or clever promo?", visual: "Poll card", durationSec: 4 },
  ],
  captions: {
    tiktok: "Real or promo? #GoldenGist",
    instagram: "Real or promo? #GoldenGist",
    youtube: "Is Femi Dee quitting?",
    x: "Real or promo? #GoldenGist",
    facebook: "Real or promo? #GoldenGist",
  },
  hashtags: ["#GoldenGist", "#Nollywood", "#NaijaGist"],
  engagementQuestion: "Real retirement or clever promo?",
  claims: [],
};

const rumour = CASES.find((c) => c.id === "celebrity-rumour-only")!;

describe("graders", () => {
  it("passes a well-formed hedged script", () => {
    expect(gradeScript(good, rumour).filter((g) => !g.passed)).toEqual([]);
  });

  it("catches rumours stated as fact, hashtags in speech and missing questions", () => {
    const bad: Script = {
      ...good,
      scenes: good.scenes.map((scene, i) => ({
        ...scene,
        text: i === 1 ? "Femi Dee has quit acting #breaking." : i === 4 ? "Wow." : scene.text.replace(/claiming|confirmed/g, "said"),
      })),
    };
    const failed = gradeScript(bad, rumour)
      .filter((g) => !g.passed)
      .map((g) => g.name);
    expect(failed).toEqual(
      expect.arrayContaining(["hedges unconfirmed claims", "no hashtags or emoji in speech", "ends with the question"]),
    );
  });

  it("requires the single source to be named", () => {
    const single = CASES.find((c) => c.id === "celebrity-single-source")!;
    expect(gradeScript({ ...good, tone: "comedy" }, single).find((g) => g.name.startsWith("attributes"))?.passed).toBe(false);
  });
});
