import type { Tone } from "@content-engine/core";

export const FPS = 30;
export const WIDTH = 1080;
export const HEIGHT = 1920;

export interface TimedWord {
  text: string;
  start: number;
  end: number;
}

export interface VideoScene {
  text: string;
  visual: string;
  start: number;
  end: number;
}

/** Everything a Golden Gist video or still needs. Plain JSON so it can cross into the renderer. */
export type VideoProps = {
  tone: Tone;
  templateName: string;
  accent: string;
  series: string;
  handle: string;
  hashtag: string;
  hook: string;
  question: string;
  outro: string;
  scenes: VideoScene[];
  outroStart: number;
  words: TimedWord[];
  sources: string[];
  audioUrl: string | null;
  durationSec: number;
};

export const SAMPLE_PROPS: VideoProps = {
  tone: "comedy",
  templateName: "Gist in 30 Seconds",
  accent: "#FF6FB5",
  series: "Golden Gist",
  handle: "@Tolugold",
  hashtag: "#GoldenGist",
  hook: "Kezi B got married and NOBODY was invited?",
  question: "Secret wedding: romantic or rude to the aunties?",
  outro: "That's your Golden Gist. Drop your take below.",
  scenes: [
    { text: "Kezi B got married and NOBODY was invited?", visual: "Kinetic title", start: 0, end: 3 },
    { text: "Two outlets confirm the photos went up on Friday night.", visual: "Source chips", start: 3, end: 7 },
    {
      text: "People on X are claiming the party ran till 6am.",
      visual: "Reaction card: Aunty Bisi found out from Instagram",
      start: 7,
      end: 11,
    },
    { text: "Secret wedding: romantic or rude to the aunties?", visual: "Poll card", start: 11, end: 14 },
  ],
  outroStart: 14,
  words: [],
  sources: ["Lagos Ledger", "Naija Daily Wire"],
  audioUrl: null,
  durationSec: 17,
};
