import type { Tone } from "./schemas";

/** One video template per tone; accent colours sit on top of the gold/black brand. */
export const TEMPLATE_BY_TONE: Record<Tone, { name: string; accent: string }> = {
  comedy: { name: "Gist in 30 Seconds", accent: "#FF6FB5" },
  hype: { name: "Matchday Hype", accent: "#FF8A3D" },
  explainer: { name: "Quick Explainer", accent: "#7CC4FF" },
};
