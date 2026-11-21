import type { Draft } from "@content-engine/core";

export type MediaKind = "video" | "still";

/** Dashboard URL for a draft's video or still, or null if it has not been rendered. */
export function mediaUrl(draft: Pick<Draft, "id" | "media">, kind: MediaKind, download = false): string | null {
  if (!draft.media[kind]) return null;
  return `/api/drafts/${draft.id}/media/${kind}${download ? "?download=1" : ""}`;
}
