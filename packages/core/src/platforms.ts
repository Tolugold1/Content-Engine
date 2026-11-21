import type { Platform } from "./schemas";

export interface PlatformInfo {
  label: string;
  short: string;
  /** Caption length limit we enforce before handing the posting kit over. */
  captionLimit: number;
  /** What the caption field is used for on that platform. */
  captionField: string;
}

export const PLATFORM_INFO: Record<Platform, PlatformInfo> = {
  tiktok: { label: "TikTok", short: "TT", captionLimit: 4000, captionField: "Caption" },
  instagram: { label: "Instagram Reels", short: "IG", captionLimit: 2200, captionField: "Caption" },
  youtube: { label: "YouTube Shorts", short: "YT", captionLimit: 100, captionField: "Title" },
  x: { label: "X", short: "X", captionLimit: 280, captionField: "Post text" },
  facebook: { label: "Facebook", short: "FB", captionLimit: 63206, captionField: "Post text" },
};

export function captionLength(text: string): number {
  // Count user-perceived characters, not UTF-16 code units (emoji count once).
  return Array.from(new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(text)).length;
}

export function isCaptionWithinLimit(platform: Platform, text: string): boolean {
  return captionLength(text) <= PLATFORM_INFO[platform].captionLimit;
}
