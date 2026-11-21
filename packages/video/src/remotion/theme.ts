import type { Tone } from "@content-engine/core";

export const GOLD = "#D4AF37";
export const GOLD_LIGHT = "#F7E7A9";
export const INK = "#0D0D0D";
export const CREAM = "#F7F3E8";
export const FONT = "Inter, 'Helvetica Neue', Arial, sans-serif";

/** Motion personality per template: comedy bounces, hype snaps, explainer glides. */
export const MOTION: Record<Tone, { damping: number; stiffness: number; captionScale: number }> = {
  comedy: { damping: 9, stiffness: 160, captionScale: 1.08 },
  hype: { damping: 14, stiffness: 260, captionScale: 1.1 },
  explainer: { damping: 26, stiffness: 90, captionScale: 1.04 },
};

export const goldGradientText = {
  backgroundImage: `linear-gradient(180deg, ${GOLD_LIGHT} 0%, ${GOLD} 50%, #9C7A26 100%)`,
  WebkitBackgroundClip: "text",
  backgroundClip: "text",
  color: "transparent",
} as const;
