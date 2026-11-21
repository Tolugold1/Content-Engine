import type { Dossier } from "@content-engine/ai";
import type { Evidence, Tone } from "@content-engine/core";

/**
 * Golden set for the script writer. Every person, club and outlet is fictional.
 * Each case pins what a good script must do, not its exact words.
 */
export interface EvalCase {
  id: string;
  dossier: Dossier;
  expect: {
    tone: Tone;
    /** The spoken script must hedge (e.g. "people are claiming", "unconfirmed"). */
    hedges: boolean;
    /** Outlets that must be named when a claim rests on them alone. */
    attributes?: string[];
  };
}

function evidence(id: string, outlet: string, title: string, snippet: string): Evidence {
  return { id, outlet, title, url: `https://${outlet}/${id}`, snippet, fetchedAt: "2026-11-21T10:00:00Z" };
}

function dossier(partial: Partial<Dossier> & Pick<Dossier, "title" | "summary" | "category" | "tone" | "evidence">): Dossier {
  return {
    isSerious: false,
    mood: "jokes",
    reactionSummary: "People are joking about it and arguing in the replies.",
    topTakes: [],
    angle: "What happened and why everyone is talking",
    ...partial,
  };
}

export const CASES: EvalCase[] = [
  {
    id: "celebrity-confirmed",
    dossier: dossier({
      title: "Singer Kezi B shares surprise wedding photos",
      summary: "Afrobeats singer Kezi B posted wedding photos on Friday night with no prior announcement.",
      category: "celebrity",
      tone: "comedy",
      evidence: [
        evidence(
          "e1",
          "lagosledger.example",
          "Kezi B shares wedding photos",
          "Kezi B posted photos from a private wedding on Friday night.",
        ),
        evidence("e2", "naijadailywire.example", "Kezi B is married", "The singer's Instagram shows wedding photos posted late Friday."),
      ],
      topTakes: ["Aunty Bisi found out from Instagram like the rest of us"],
    }),
    expect: { tone: "comedy", hedges: false },
  },
  {
    id: "celebrity-rumour-only",
    dossier: dossier({
      title: "Rumour: actor Femi Dee is quitting Nollywood",
      summary: "A viral post claims actor Femi Dee is retiring from acting. No outlet has reported it.",
      category: "celebrity",
      tone: "comedy",
      mood: "debate",
      evidence: [],
      reactionSummary: "Split between people who believe it and people asking for a source.",
    }),
    expect: { tone: "comedy", hedges: true },
  },
  {
    id: "celebrity-single-source",
    dossier: dossier({
      title: "Comedian Tayo Laffs announces world tour",
      summary: "One outlet reports comedian Tayo Laffs will tour 12 cities next year.",
      category: "celebrity",
      tone: "comedy",
      evidence: [
        evidence(
          "e1",
          "ekogazette.example",
          "Tayo Laffs plans 12-city tour",
          "Tayo Laffs told Eko Gazette he will tour 12 cities next year.",
        ),
      ],
    }),
    expect: { tone: "comedy", hedges: false, attributes: ["Eko Gazette"] },
  },
  {
    id: "football-preview",
    dossier: dossier({
      title: "Eko Stars host Ibadan Lions in tonight's derby",
      summary: "The derby kicks off at 6pm. Captain Tunde Ade may return from injury.",
      category: "football",
      tone: "hype",
      mood: "hype",
      evidence: [
        evidence("e1", "leaguefixtures.example", "Matchweek 12 fixtures", "Eko Stars vs Ibadan Lions, 6pm kickoff."),
        evidence("e2", "ekogazette.example", "Derby preview", "The derby starts at 6pm at the Eko Arena."),
        evidence(
          "e3",
          "matchdayng.example",
          "Ade back in training",
          "Matchday NG understands captain Tunde Ade trained fully on Thursday.",
        ),
      ],
    }),
    expect: { tone: "hype", hedges: false, attributes: ["Matchday NG"] },
  },
  {
    id: "football-result",
    dossier: dossier({
      title: "Full time: Eko Stars 3-1 Ibadan Lions",
      summary: "Eko Stars came from 1-0 down at half time to win 3-1.",
      category: "football",
      tone: "hype",
      mood: "hype",
      evidence: [
        evidence("e1", "leaguefixtures.example", "Full time: Eko Stars 3-1 Ibadan Lions", "Eko Stars 3, Ibadan Lions 1. Half time 0-1."),
        evidence("e2", "matchdayng.example", "Match report", "Three second-half goals completed the comeback."),
      ],
    }),
    expect: { tone: "hype", hedges: false },
  },
  {
    id: "serious-prices",
    dossier: dossier({
      title: "Mobile networks raise data bundle prices",
      summary: "Two networks announced new data prices effective today. Active bundles keep their old price until expiry.",
      category: "news",
      isSerious: true,
      tone: "explainer",
      mood: "outrage",
      evidence: [
        evidence(
          "e1",
          "naijadailywire.example",
          "Networks publish new prices",
          "Two networks announced new bundle prices effective today.",
        ),
        evidence("e2", "ekogazette.example", "What the new prices mean", "Existing bundles keep their price until they expire."),
      ],
    }),
    expect: { tone: "explainer", hedges: false },
  },
  {
    id: "serious-unconfirmed",
    dossier: dossier({
      title: "Claims of a fuel price change spread online",
      summary: "Posts claim pump prices will rise tomorrow. No official statement or outlet confirms it.",
      category: "news",
      isSerious: true,
      tone: "explainer",
      mood: "outrage",
      evidence: [],
    }),
    expect: { tone: "explainer", hedges: true },
  },
  {
    id: "culture-mixed",
    dossier: dossier({
      title: "The suya challenge goes viral",
      summary: "People are posting increasingly odd ways to eat suya. A food blog says it started with one video.",
      category: "culture",
      tone: "comedy",
      evidence: [
        evidence("e1", "lagosledger.example", "Where the suya challenge started", "The trend began with a single video posted on Monday."),
      ],
      topTakes: ["Suya with chopsticks is a hate crime"],
    }),
    expect: { tone: "comedy", hedges: false, attributes: ["Lagos Ledger"] },
  },
];
