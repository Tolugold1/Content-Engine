/**
 * Engine settings for the Golden Gist brand. Everything a non-developer may
 * want to tune lives here: brand voice, schedule, sources and thresholds.
 */
export const BRAND = {
  name: "Tolugold",
  series: "Golden Gist",
  hashtag: "#GoldenGist",
  gold: "#D4AF37",
  black: "#0D0D0D",
  outro: "That's your Golden Gist. Drop your take below.",
  voice: [
    "Nigerian English with light, natural Pidgin where it fits; never forced.",
    "Warm, quick, a little cheeky. Talks to the viewer like a friend sharing gist.",
    "Short sentences written for the ear. No hashtags or emojis in the spoken script.",
  ],
} as const;

export const SCHEDULE = {
  timezone: "Africa/Lagos",
  /** Trend scan, in the timezone above. */
  scanCron: "TZ=Africa/Lagos 5 7-23 * * *",
  maxDraftsPerDay: 3,
  /** Minimum first-pass virality score (1-10) for a story to get a draft. */
  minScore: 7,
  /** Suggested posting times (HH:mm, local). */
  postingSlots: ["12:30", "18:30", "21:00"],
  reviewReminderAfter: "3h",
  /** Hours after the first post at which performance is checked. */
  metricsCheckpointHours: [24, 72],
} as const;

export const SOURCES = {
  /** Nigeria on X / Yahoo WOEID. */
  xWoeid: 23424908,
  youtubeRegion: "NG",
  googleTrendsGeo: "NG",
  /** News feeds used for discovery and as evidence. Edit freely; broken feeds are skipped and reported. */
  feeds: [
    "https://punchng.com/feed/",
    "https://www.vanguardngr.com/feed/",
    "https://www.premiumtimesng.com/feed",
    "https://guardian.ng/feed/",
    "https://www.legit.ng/rss/all.rss",
    "https://feeds.bbci.co.uk/pidgin/rss.xml",
  ],
  /** football-data.org competition codes (free tier) and teams worth a Matchday Hype video. */
  footballCompetitions: ["PL", "CL"],
  followedTeams: ["Arsenal", "Chelsea", "Manchester United", "Manchester City", "Liverpool", "Real Madrid", "Barcelona"],
  reactionsPerStory: 30,
} as const;

/** Quick reasons offered when rejecting, on Telegram and on the dashboard. */
export const QUICK_REJECT_REASONS = ["Only chatter, can't confirm", "Story is already old", "Tone is off", "Not for our audience"] as const;

/** Shown with every posting kit (dashboard and Telegram). */
export const POSTING_CHECKLIST = [
  "Upload the MP4 from the dashboard, not a re-download from another app (watermarks get Reels buried).",
  "Turn on each app's AI-generated content label (cloned voice).",
  "On TikTok, add a trending sound at low volume.",
] as const;
