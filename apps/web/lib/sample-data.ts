import type { Claim, Draft, DraftStatus, Evidence, Metrics, Scene, TimelineEvent, Trend } from "@content-engine/core";

/**
 * Sample drafts so the dashboard runs before the pipeline exists.
 * Every person, club and outlet below is fictional on purpose: sample data
 * must never put invented claims next to real names.
 */

const HOUR = 3_600_000;
const SAMPLE_VIDEO = "/sample/golden-gist-sample.mp4";

function ago(hours: number, now: number) {
  return new Date(now - hours * HOUR).toISOString();
}

interface Seed {
  id: string;
  slug: string;
  title: string;
  hook: string;
  tone: Draft["tone"];
  category: Draft["category"];
  status: DraftStatus;
  hoursAgo: number;
  trend: Omit<Trend, "id" | "detectedAt">;
  scenes: Array<Omit<Scene, "index">>;
  caption: string;
  xText: string;
  ytTitle: string;
  hashtags: string[];
  question: string;
  claims: Array<Omit<Claim, "id">>;
  evidence: Array<Omit<Evidence, "id" | "fetchedAt" | "url"> & { key: string }>;
  costUsd: number;
  review?: { decision: "approved" | "rejected"; channel: "web" | "telegram"; afterHours: number; reason?: string };
  captionEdit?: { platform: "instagram" | "x"; before: string };
  posted?: Array<{ platform: Metrics["platform"]; views: number; likes: number; comments: number; shares: number }>;
  failure?: string;
}

const seeds: Seed[] = [
  {
    id: "d_101",
    slug: "kezi-b-surprise-wedding",
    title: "Kezi B's secret wedding has everyone talking",
    hook: "Kezi B got married and NOBODY was invited?",
    tone: "comedy",
    category: "celebrity",
    status: "pending_review",
    hoursAgo: 1.2,
    trend: {
      title: "#KeziBWedding",
      sources: ["X trends (NG)", "Lagos Ledger", "Naija Daily Wire", "Google Trends NG"],
      mood: "jokes",
      reactionSummary:
        "Fans are joking that the guest list was 'family and the photographer'. Most replies are congratulations mixed with memes about uninvited aunties.",
      topTakes: [
        "\"Aunty Bisi found out from Instagram like the rest of us\"",
        "\"Small wedding, big energy. We love to see it\"",
        "\"Who catered? Asking for my jollof standards\"",
      ],
      viralityScore: 8.6,
    },
    scenes: [
      { text: "Kezi B just dropped wedding photos and the internet is in shock.", visual: "Kinetic title + gold confetti", durationSec: 4 },
      { text: "No announcement, no hashtag, no aso-ebi group chat. Just vibes.", visual: "Reaction card: @lagosaunty", durationSec: 6 },
      { text: "Two outlets confirm the photos went up on Friday night.", visual: "Source chips: Lagos Ledger, Naija Daily Wire", durationSec: 5 },
      { text: "Twitter is claiming the party ran till 6am. Nobody has confirmed that one.", visual: "Character side-eye", durationSec: 6 },
      { text: "Secret wedding: romantic or rude to the aunties?", visual: "Poll card", durationSec: 5 },
    ],
    caption: "Kezi B said small wedding, big love 💍 The aunties are NOT okay. Romantic or rude?",
    xText: "Kezi B's secret wedding has Naija Twitter in shambles 😂 Romantic or rude to the aunties? #GoldenGist",
    ytTitle: "Kezi B's SECRET wedding 💍 | Golden Gist",
    hashtags: ["#GoldenGist", "#KeziBWedding", "#NaijaGist", "#Tolugold"],
    question: "Secret wedding: romantic or rude to the aunties?",
    claims: [
      { text: "Kezi B posted wedding photos on Friday night.", status: "confirmed", evidenceIds: ["e1", "e2"], verdict: "supported" },
      { text: "The reception reportedly ran until 6am.", status: "chatter", evidenceIds: [], verdict: "supported", note: "Framed as chatter in scene 4." },
    ],
    evidence: [
      { key: "e1", outlet: "Lagos Ledger", title: "Kezi B shares wedding photos in surprise post" },
      { key: "e2", outlet: "Naija Daily Wire", title: "Singer Kezi B is married, photos show" },
    ],
    costUsd: 0.31,
  },
  {
    id: "d_102",
    slug: "eko-stars-ibadan-lions-preview",
    title: "Eko Stars vs Ibadan Lions: derby day hype",
    hook: "The derby is TONIGHT and Tunde Ade might be back",
    tone: "hype",
    category: "football",
    status: "pending_review",
    hoursAgo: 3.1,
    trend: {
      title: "Eko Stars vs Ibadan Lions",
      sources: ["Fixtures feed", "Matchday NG", "X trends (NG)"],
      mood: "hype",
      reactionSummary: "Supporters are trading predictions; most expect a tight game. The big debate is whether captain Tunde Ade starts.",
      topTakes: ["\"2-1 Eko Stars, Ade scores, I said what I said\"", "\"Lions defence is too slow for this one\""],
      viralityScore: 7.9,
    },
    scenes: [
      { text: "Derby day! Eko Stars host Ibadan Lions at 6pm tonight.", visual: "Scoreboard intro, team colours", durationSec: 4 },
      { text: "Matchday NG reports captain Tunde Ade is back in training.", visual: "Player silhouette card", durationSec: 6 },
      { text: "Last three meetings? One win each and a draw.", visual: "Head-to-head bars", durationSec: 6 },
      { text: "Drop your score prediction below.", visual: "Prediction poll", durationSec: 5 },
    ],
    caption: "DERBY DAY 🔥 Eko Stars vs Ibadan Lions tonight. Is Tunde Ade starting? Drop your score prediction 👇",
    xText: "Derby day 🔥 Eko Stars vs Ibadan Lions, 6pm. Your score prediction? #GoldenGist",
    ytTitle: "Eko Stars vs Ibadan Lions: DERBY preview 🔥",
    hashtags: ["#GoldenGist", "#EkoDerby", "#MatchdayHype"],
    question: "What's your score prediction?",
    claims: [
      { text: "Kickoff is at 6pm tonight.", status: "confirmed", evidenceIds: ["e1", "e2"], verdict: "supported" },
      { text: "Tunde Ade is back in training.", status: "reported", evidenceIds: ["e3"], verdict: "supported", note: "Attributed to Matchday NG on screen." },
      { text: "The last three meetings were one win each and a draw.", status: "confirmed", evidenceIds: ["e1", "e2"], verdict: "supported" },
    ],
    evidence: [
      { key: "e1", outlet: "League fixtures feed", title: "Matchweek 12 fixtures" },
      { key: "e2", outlet: "Eko Gazette", title: "Derby preview: form guide and head-to-head" },
      { key: "e3", outlet: "Matchday NG", title: "Ade returns to full training" },
    ],
    costUsd: 0.27,
  },
  {
    id: "d_103",
    slug: "data-bundle-prices-explainer",
    title: "Why your data bundle just got pricier",
    hook: "Your 2GB plan costs more today. Here's why.",
    tone: "explainer",
    category: "news",
    status: "pending_review",
    hoursAgo: 5.4,
    trend: {
      title: "Data bundle price changes",
      sources: ["X trends (NG)", "Naija Daily Wire", "Eko Gazette", "Pidgin Report"],
      mood: "outrage",
      reactionSummary: "Mostly frustration. Many replies ask whether old bundles keep their price; a few share cheaper plan tips.",
      topTakes: ["\"So my monthly plan is now a weekly plan?\"", "\"Somebody explain this like I'm five\""],
      viralityScore: 7.1,
    },
    scenes: [
      { text: "If your data plan cost more this morning, you're not imagining it.", visual: "Phone + price tag animation", durationSec: 5 },
      { text: "Two networks announced new bundle prices effective today.", visual: "Source chips", durationSec: 6 },
      { text: "Already-active bundles keep their old price until they expire.", visual: "Checklist card", durationSec: 6 },
      { text: "Tip: compare the per-GB price, not the plan name.", visual: "Simple calculator", durationSec: 6 },
      { text: "Will this change how much data you buy?", visual: "Poll card", durationSec: 4 },
    ],
    caption: "Data bundle prices changed today. What it means for you, in 30 seconds 📱 Sources on screen.",
    xText: "Data bundles cost more from today. What changed and what it means for you 👇 #GoldenGist",
    ytTitle: "Why your data bundle costs more now (explained)",
    hashtags: ["#GoldenGist", "#DataPrices", "#QuickExplainer"],
    question: "Will this change how much data you buy?",
    claims: [
      { text: "Two networks announced new bundle prices effective today.", status: "confirmed", evidenceIds: ["e1", "e2"], verdict: "supported" },
      { text: "Active bundles keep their price until expiry.", status: "confirmed", evidenceIds: ["e1", "e3"], verdict: "supported" },
    ],
    evidence: [
      { key: "e1", outlet: "Naija Daily Wire", title: "Networks publish new data bundle prices" },
      { key: "e2", outlet: "Eko Gazette", title: "What the new data prices mean" },
      { key: "e3", outlet: "Pidgin Report", title: "Your old data plan go still work?" },
    ],
    costUsd: 0.38,
  },
  {
    id: "d_104",
    slug: "japa-rant-skit",
    title: "The 'japa' rant skit everyone is quoting",
    hook: "This skit about japa is TOO real",
    tone: "comedy",
    category: "culture",
    status: "rendering",
    hoursAgo: 0.25,
    trend: {
      title: "\"Japa rant\" skit",
      sources: ["X trends (NG)", "YouTube trending NG"],
      mood: "jokes",
      reactionSummary: "People are quoting the punchline and tagging friends who just moved abroad.",
      topTakes: ["\"The 'send me cold weather' line took me out\""],
      viralityScore: 6.8,
    },
    scenes: [
      { text: "This skit has the whole timeline tagging their japa friends.", visual: "Kinetic quote", durationSec: 5 },
      { text: "Who's the first friend you'd tag?", visual: "Poll card", durationSec: 4 },
    ],
    caption: "Tag your japa friend 😂✈️",
    xText: "Tag your japa friend 😂✈️ #GoldenGist",
    ytTitle: "The japa skit that's TOO real 😂",
    hashtags: ["#GoldenGist", "#Japa"],
    question: "Who's the first friend you'd tag?",
    claims: [],
    evidence: [],
    costUsd: 0.12,
  },
  {
    id: "d_108",
    slug: "ride-hailing-fare-rules",
    title: "New ride-hailing fare rules, explained",
    hook: "Your ride fare rules changed. 3 things to know.",
    tone: "explainer",
    category: "news",
    status: "approved",
    hoursAgo: 2.2,
    trend: {
      title: "Ride-hailing fare rules",
      sources: ["Naija Daily Wire", "Eko Gazette", "Google Trends NG"],
      mood: "debate",
      reactionSummary: "Drivers and riders disagree: drivers welcome a minimum fare, riders worry about surge pricing.",
      topTakes: ["\"Minimum fare is fair, fuel isn't free\"", "\"Surge at 7am is already wicked\""],
      viralityScore: 6.9,
    },
    scenes: [
      { text: "New ride-hailing fare rules start Monday. Three things to know.", visual: "Numbered title card", durationSec: 5 },
      { text: "One: a minimum fare per trip.", visual: "Card 1", durationSec: 5 },
      { text: "Two: apps must show the surge multiplier before you book.", visual: "Card 2", durationSec: 6 },
      { text: "Three: drivers can't cancel after accepting without a reason.", visual: "Card 3", durationSec: 6 },
      { text: "Fair to riders or fair to drivers?", visual: "Poll card", durationSec: 4 },
    ],
    caption: "New ride-hailing fare rules start Monday 🚗 3 things you should know. Sources on screen.",
    xText: "Ride-hailing fare rules change Monday 🚗 3 things to know. Fair to riders or drivers? #GoldenGist",
    ytTitle: "New ride-hailing fare rules: 3 things to know",
    hashtags: ["#GoldenGist", "#QuickExplainer", "#Lagos"],
    question: "Fair to riders or fair to drivers?",
    claims: [
      { text: "The rules start on Monday.", status: "confirmed", evidenceIds: ["e1", "e2"], verdict: "supported" },
      { text: "Apps must show the surge multiplier before booking.", status: "confirmed", evidenceIds: ["e1", "e2"], verdict: "supported" },
    ],
    evidence: [
      { key: "e1", outlet: "Naija Daily Wire", title: "Regulator publishes ride-hailing fare rules" },
      { key: "e2", outlet: "Eko Gazette", title: "What changes for riders on Monday" },
    ],
    costUsd: 0.34,
    review: { decision: "approved", channel: "web", afterHours: 1.6 },
  },
  {
    id: "d_105",
    slug: "suya-challenge",
    title: "The suya challenge has gone too far",
    hook: "People are eating suya with CHOPSTICKS now?",
    tone: "comedy",
    category: "culture",
    status: "posted",
    hoursAgo: 26,
    trend: {
      title: "#SuyaChallenge",
      sources: ["X trends (NG)", "YouTube trending NG", "Google Trends NG"],
      mood: "jokes",
      reactionSummary: "Pure comedy: people posting increasingly ridiculous ways to eat suya.",
      topTakes: ["\"Suya with chopsticks is a hate crime\""],
      viralityScore: 8.1,
    },
    scenes: [
      { text: "The suya challenge started innocent. Now people are using chopsticks.", visual: "Kinetic title", durationSec: 5 },
      { text: "Worst suya crime you've seen?", visual: "Poll card", durationSec: 4 },
    ],
    caption: "The suya challenge has gone TOO far 😭🍢 Worst suya crime you've seen?",
    xText: "The #SuyaChallenge has gone too far 😭 Worst suya crime you've seen? #GoldenGist",
    ytTitle: "The suya challenge has gone TOO far 😭",
    hashtags: ["#GoldenGist", "#SuyaChallenge", "#NaijaGist"],
    question: "Worst suya crime you've seen?",
    claims: [],
    evidence: [],
    costUsd: 0.22,
    review: { decision: "approved", channel: "telegram", afterHours: 0.5 },
    posted: [
      { platform: "tiktok", views: 18400, likes: 2310, comments: 412, shares: 190 },
      { platform: "instagram", views: 9200, likes: 1105, comments: 133, shares: 61 },
      { platform: "youtube", views: 4100, likes: 288, comments: 37, shares: 0 },
    ],
  },
  {
    id: "d_106",
    slug: "eko-stars-comeback",
    title: "Eko Stars' 3-1 comeback in 30 seconds",
    hook: "Down 1-0 at half time. Then THIS happened.",
    tone: "hype",
    category: "football",
    status: "posted",
    hoursAgo: 50,
    trend: {
      title: "Eko Stars comeback",
      sources: ["Fixtures feed", "Matchday NG", "Eko Gazette", "X trends (NG)"],
      mood: "hype",
      reactionSummary: "Celebration from Eko fans; Lions fans blaming the referee for the second goal.",
      topTakes: ["\"Second half Eko Stars is a different team\""],
      viralityScore: 8.4,
    },
    scenes: [
      { text: "Down 1-0 at half time. Then Eko Stars woke up.", visual: "Scoreboard 0-1", durationSec: 5 },
      { text: "Three goals in twenty minutes. Final score 3-1.", visual: "Scoreboard animation", durationSec: 6 },
      { text: "Man of the match?", visual: "Poll card", durationSec: 4 },
    ],
    caption: "3 goals in 20 minutes 🔥 Eko Stars came back from 1-0 down. Man of the match?",
    xText: "3 goals in 20 minutes 🔥 Eko Stars 3-1. Man of the match? #GoldenGist",
    ytTitle: "Eko Stars 3-1 comeback in 30 seconds 🔥",
    hashtags: ["#GoldenGist", "#MatchdayHype", "#EkoStars"],
    question: "Man of the match?",
    claims: [
      { text: "Final score was 3-1.", status: "confirmed", evidenceIds: ["e1", "e2"], verdict: "supported" },
    ],
    evidence: [
      { key: "e1", outlet: "League fixtures feed", title: "Full time: Eko Stars 3-1 Ibadan Lions" },
      { key: "e2", outlet: "Matchday NG", title: "Match report: Eko Stars complete comeback" },
    ],
    costUsd: 0.29,
    review: { decision: "approved", channel: "telegram", afterHours: 0.3 },
    captionEdit: { platform: "instagram", before: "Eko Stars won 3-1 after being down at half time. Who was man of the match?" },
    posted: [
      { platform: "tiktok", views: 25100, likes: 3020, comments: 640, shares: 288 },
      { platform: "instagram", views: 11800, likes: 1490, comments: 201, shares: 95 },
      { platform: "x", views: 6400, likes: 380, comments: 52, shares: 44 },
    ],
  },
  {
    id: "d_107",
    slug: "femi-dee-quitting-rumour",
    title: "Is Femi Dee quitting Nollywood?",
    hook: "Femi Dee is quitting acting?!",
    tone: "comedy",
    category: "celebrity",
    status: "rejected",
    hoursAgo: 30,
    trend: {
      title: "Femi Dee retirement rumour",
      sources: ["X trends (NG)"],
      mood: "debate",
      reactionSummary: "A single viral post claims he is retiring; replies are split between belief and 'source?'.",
      topTakes: ["\"Source: trust me bro\""],
      viralityScore: 7.4,
    },
    scenes: [{ text: "Femi Dee is quitting acting.", visual: "Kinetic title", durationSec: 4 }],
    caption: "Femi Dee is quitting Nollywood?! 😱",
    xText: "Femi Dee quitting Nollywood?! #GoldenGist",
    ytTitle: "Femi Dee quitting Nollywood?!",
    hashtags: ["#GoldenGist"],
    question: "Do you believe it?",
    claims: [
      {
        text: "Femi Dee is quitting acting.",
        status: "chatter",
        evidenceIds: [],
        verdict: "misframed",
        note: "Only social posts. The script states it as fact; it must be framed as a claim.",
      },
    ],
    evidence: [],
    costUsd: 0.18,
    review: { decision: "rejected", channel: "telegram", afterHours: 0.4, reason: "Only chatter. No outlet has it yet." },
  },
  {
    id: "d_111",
    slug: "afrobeats-awards-shortlist",
    title: "Afrobeats awards shortlist reactions",
    hook: "The awards shortlist is OUT and fans are angry",
    tone: "comedy",
    category: "celebrity",
    status: "failed",
    hoursAgo: 52,
    trend: {
      title: "Awards shortlist",
      sources: ["X trends (NG)", "Lagos Ledger"],
      mood: "outrage",
      reactionSummary: "Fans of left-out artists are loud; others say the list is fair.",
      topTakes: [],
      viralityScore: 6.2,
    },
    scenes: [{ text: "The shortlist is out and fans have opinions.", visual: "Kinetic title", durationSec: 4 }],
    caption: "Who got snubbed? 👀",
    xText: "Who got snubbed? 👀 #GoldenGist",
    ytTitle: "Awards shortlist: who got snubbed?",
    hashtags: ["#GoldenGist"],
    question: "Who got snubbed?",
    claims: [],
    evidence: [],
    costUsd: 0.09,
    failure: "Voice step timed out twice; skipped after retries.",
  },
  {
    id: "d_109",
    slug: "jollof-showdown",
    title: "The celebrity chef jollof showdown",
    hook: "Two chefs. One pot. Who won the jollof war?",
    tone: "comedy",
    category: "culture",
    status: "posted",
    hoursAgo: 98,
    trend: {
      title: "#JollofShowdown",
      sources: ["X trends (NG)", "YouTube trending NG"],
      mood: "jokes",
      reactionSummary: "Everyone has a jollof opinion; the 'party rice' camp is winning the replies.",
      topTakes: ["\"Party jollof wins every time, no debate\""],
      viralityScore: 7.7,
    },
    scenes: [
      { text: "Two chefs, one pot, and a whole country judging.", visual: "Split screen title", durationSec: 5 },
      { text: "Who won?", visual: "Poll card", durationSec: 4 },
    ],
    caption: "The jollof war nobody asked for but everybody needed 🍛 Who won?",
    xText: "The #JollofShowdown 🍛 Who won? #GoldenGist",
    ytTitle: "The jollof showdown 🍛 who won?",
    hashtags: ["#GoldenGist", "#JollofShowdown"],
    question: "Who won?",
    claims: [],
    evidence: [],
    costUsd: 0.21,
    review: { decision: "approved", channel: "web", afterHours: 0.8 },
    posted: [
      { platform: "tiktok", views: 12900, likes: 1600, comments: 310, shares: 120 },
      { platform: "instagram", views: 7300, likes: 820, comments: 96, shares: 40 },
    ],
  },
  {
    id: "d_110",
    slug: "light-bill-explainer",
    title: "Why your light bill changed this month",
    hook: "Your light bill went up. Here's the simple reason.",
    tone: "explainer",
    category: "news",
    status: "posted",
    hoursAgo: 146,
    trend: {
      title: "Electricity tariff band changes",
      sources: ["Naija Daily Wire", "Eko Gazette", "Google Trends NG"],
      mood: "outrage",
      reactionSummary: "Confusion about which band people are on; many asking how to check.",
      topTakes: ["\"How do I even know my band?\""],
      viralityScore: 7.3,
    },
    scenes: [
      { text: "If your light bill jumped this month, check your tariff band.", visual: "Bill graphic", durationSec: 5 },
      { text: "Did your bill change?", visual: "Poll card", durationSec: 4 },
    ],
    caption: "Light bill went up? Check your tariff band ⚡ Explained in 30 seconds. Sources on screen.",
    xText: "Light bill went up? Check your tariff band ⚡ #GoldenGist",
    ytTitle: "Why your light bill changed (explained) ⚡",
    hashtags: ["#GoldenGist", "#QuickExplainer"],
    question: "Did your bill change?",
    claims: [
      { text: "Tariff bands were reviewed this month.", status: "confirmed", evidenceIds: ["e1", "e2"], verdict: "supported" },
    ],
    evidence: [
      { key: "e1", outlet: "Naija Daily Wire", title: "Tariff band review takes effect" },
      { key: "e2", outlet: "Eko Gazette", title: "How to check your electricity band" },
    ],
    costUsd: 0.33,
    review: { decision: "approved", channel: "telegram", afterHours: 1.1 },
    posted: [
      { platform: "tiktok", views: 9800, likes: 870, comments: 240, shares: 310 },
      { platform: "youtube", views: 5200, likes: 330, comments: 64, shares: 0 },
      { platform: "facebook", views: 3100, likes: 210, comments: 88, shares: 140 },
    ],
  },
];

function buildTimeline(seed: Seed, now: number, createdAt: number): TimelineEvent[] {
  const at = (minutesAfter: number) => new Date(createdAt + minutesAfter * 60_000).toISOString();
  const events: TimelineEvent[] = [
    { stage: "trend_detected", at: at(-20), note: seed.trend.sources.join(", ") },
    { stage: "reactions_summarised", at: at(-12), note: `Mood: ${seed.trend.mood}` },
    { stage: "script_written", at: at(-6), note: `${seed.scenes.length} scenes` },
    { stage: "claims_checked", at: at(-4), note: `${seed.claims.length} claims checked` },
  ];
  if (seed.status === "failed") {
    events.push({ stage: "failed", at: at(-1), note: seed.failure });
    return events;
  }
  events.push({ stage: "voiced", at: at(-3) });
  if (seed.status === "rendering") return events;
  events.push(
    { stage: "rendered", at: at(-1) },
    { stage: "notified_telegram", at: at(0), note: "Preview sent with Approve / Edit / Reject buttons" },
  );
  if (seed.review) {
    events.push({
      stage: "reviewed",
      at: new Date(createdAt + seed.review.afterHours * HOUR).toISOString(),
      note: `${seed.review.decision === "approved" ? "Approved" : "Rejected"} on ${seed.review.channel === "web" ? "the dashboard" : "Telegram"}`,
    });
  }
  if (seed.captionEdit) {
    events.push({
      stage: "caption_edited",
      at: new Date(createdAt + (seed.review?.afterHours ?? 0.3) * HOUR - 60_000).toISOString(),
      note: `${seed.captionEdit.platform} caption edited on Telegram`,
    });
  }
  seed.posted?.forEach((post, index) => {
    events.push({ stage: "posted", at: new Date(createdAt + (1.5 + index * 0.2) * HOUR).toISOString(), note: `Posted on ${post.platform}` });
  });
  if (seed.posted && now - createdAt > 24 * HOUR) {
    events.push({ stage: "metrics_pulled", at: new Date(createdAt + 25 * HOUR).toISOString(), note: "24h metrics" });
  }
  return events.sort((a, b) => a.at.localeCompare(b.at));
}

function build(seed: Seed, now: number): Draft {
  const createdAtMs = now - seed.hoursAgo * HOUR;
  const createdAt = new Date(createdAtMs).toISOString();
  const evidence: Evidence[] = seed.evidence.map((item) => ({
    id: item.key,
    outlet: item.outlet,
    title: item.title,
    url: `https://example.com/sample/${seed.slug}/${item.key}`,
    fetchedAt: ago(seed.hoursAgo + 0.3, now),
  }));
  const trend: Trend = { ...seed.trend, id: `t_${seed.id.slice(2)}`, detectedAt: ago(seed.hoursAgo + 0.35, now) };
  const hasRender = !["rendering", "failed"].includes(seed.status);
  const instagram = seed.caption;

  return {
    id: seed.id,
    slug: seed.slug,
    title: seed.title,
    hook: seed.hook,
    tone: seed.tone,
    category: seed.category,
    status: seed.status,
    createdAt,
    trend,
    scenes: seed.scenes.map((scene, index) => ({ ...scene, index })),
    captions: {
      tiktok: `${seed.caption} ${seed.hashtags.join(" ")}`,
      instagram: `${instagram}\n\n${seed.hashtags.join(" ")}`,
      youtube: seed.ytTitle,
      x: seed.xText,
      facebook: `${seed.caption}\n\n${seed.hashtags.slice(0, 2).join(" ")}`,
    },
    hashtags: seed.hashtags,
    engagementQuestion: seed.question,
    claims: seed.claims.map((claim, index) => ({ ...claim, id: `c${index + 1}` })),
    evidence,
    durationSec: seed.scenes.reduce((total, scene) => total + scene.durationSec, 2),
    videoUrl: hasRender ? SAMPLE_VIDEO : null,
    stillUrl: hasRender ? `/api/drafts/${seed.id}/poster` : null,
    costUsd: seed.costUsd,
    telegram: hasRender ? { chatId: "sample", messageId: Number(seed.id.slice(2)) } : null,
    review: seed.review
      ? {
          decision: seed.review.decision,
          channel: seed.review.channel,
          at: new Date(createdAtMs + seed.review.afterHours * HOUR).toISOString(),
          ...(seed.review.reason ? { reason: seed.review.reason } : {}),
        }
      : null,
    edits: seed.captionEdit
      ? [
          {
            field: `caption.${seed.captionEdit.platform}`,
            before: seed.captionEdit.before,
            after: seed.caption,
            channel: "telegram",
            at: new Date(createdAtMs + 0.25 * HOUR).toISOString(),
          },
        ]
      : [],
    posts: (seed.posted ?? []).map((post, index) => ({
      platform: post.platform,
      url: `https://example.com/sample/${post.platform}/${seed.slug}`,
      postedAt: new Date(createdAtMs + (1.5 + index * 0.2) * HOUR).toISOString(),
      via: "manual",
    })),
    metrics:
      seed.posted && seed.hoursAgo > 24
        ? seed.posted.map((post) => ({
            platform: post.platform,
            views: post.views,
            likes: post.likes,
            comments: post.comments,
            shares: post.shares,
            checkedAt: new Date(createdAtMs + 25 * HOUR).toISOString(),
            source: post.platform === "tiktok" || post.platform === "instagram" ? "screenshot" : "api",
          }))
        : [],
    timeline: buildTimeline(seed, now, createdAtMs),
  };
}

export function createSampleDrafts(now = Date.now()): Draft[] {
  return seeds.map((seed) => build(seed, now));
}
