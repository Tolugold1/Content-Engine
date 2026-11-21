import type { Draft } from "@content-engine/core";
import { mediaUrl } from "@/lib/media";
import { DraftPoster } from "./draft-card";

/** The finished video in a tilted 3D phone; it straightens when you hover or play. */
export function PhoneFrame({ draft }: { draft: Draft }) {
  const video = mediaUrl(draft, "video");
  return (
    <div className="phone-stage mx-auto w-full max-w-[230px] sm:max-w-[320px]">
      <div className="phone">
        <div className="phone-screen">
          <span className="phone-notch" aria-hidden />
          {video ? (
            <video
              key={video}
              src={video}
              poster={mediaUrl(draft, "still") ?? undefined}
              controls
              playsInline
              preload="metadata"
              className="h-full w-full object-cover"
            />
          ) : (
            <DraftPoster draft={draft} className="!rounded-none border-0" />
          )}
        </div>
      </div>
      <div className="mx-auto mt-6 h-6 w-3/4 rounded-[50%] bg-gold/25 blur-2xl" aria-hidden />
    </div>
  );
}
