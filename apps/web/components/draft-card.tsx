import { latestViews, type Draft } from "@content-engine/core";
import { Download, Eye, Flame } from "lucide-react";
import Link from "next/link";
import { compactNumber, formatDuration, timeAgo } from "@/lib/format";
import { mediaUrl } from "@/lib/media";
import { PlatformPill, StatusBadge, ToneChip } from "./badges";
import { TiltCard } from "./tilt-card";

export function DraftPoster({ draft, className = "", aspect = "aspect-[9/16]" }: { draft: Draft; className?: string; aspect?: string }) {
  const still = mediaUrl(draft, "still");
  if (!still) {
    return (
      <div className={`shimmer grid place-items-center rounded-[18px] border border-line ${aspect} ${className}`}>
        <div className="px-4 text-center">
          <div className="coin mx-auto mb-3 h-10 w-10 text-lg">G</div>
          <p className="text-sm font-semibold text-cream/80">{draft.status === "failed" ? "Render failed" : "Rendering…"}</p>
          <p className="mt-1 text-xs text-muted">
            {draft.status === "failed" ? "See the timeline" : "Telegram will ping you when it's ready"}
          </p>
        </div>
      </div>
    );
  }
  return (
    <img
      src={still}
      alt={`Still for ${draft.title}`}
      loading="lazy"
      decoding="async"
      className={`w-full rounded-[18px] object-cover object-center ${aspect} ${className}`}
    />
  );
}

export function DraftCard({ draft, index = 0 }: { draft: Draft; index?: number }) {
  const views = latestViews(draft);
  const download = mediaUrl(draft, "video", true);

  return (
    <div className="rise" style={{ animationDelay: `${Math.min(index, 8) * 60}ms` }}>
      <TiltCard className="glass group rounded-[24px] p-2.5">
        <Link href={`/drafts/${draft.id}`} className="block rounded-[18px]" aria-label={`Open ${draft.title}`}>
          <div className="relative overflow-hidden rounded-[18px]">
            {/* 4:5 crop of the 9:16 still keeps the hook visible without the poster's own header and footer. */}
            <DraftPoster draft={draft} aspect="aspect-[4/5]" />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/90 to-transparent" />
            <span className="absolute right-2.5 top-2.5 hidden rounded-md bg-black/70 px-1.5 py-0.5 text-[11px] font-semibold tabular-nums text-cream/90 sm:block">
              {formatDuration(draft.durationSec)}
            </span>
            <div className="pop absolute bottom-2.5 left-2.5">
              <StatusBadge status={draft.status} />
            </div>
          </div>
          <div className="px-1.5 pt-3">
            <ToneChip tone={draft.tone} />
            <h3 className="mt-2 line-clamp-2 min-h-[2.6em] font-display text-[15px] font-bold leading-snug text-white">{draft.title}</h3>
          </div>
        </Link>
        <div className="flex items-center justify-between gap-2 px-1.5 pb-1 pt-2 text-xs text-muted">
          <div className="flex min-w-0 items-center gap-2">
            {draft.status === "posted" ? (
              <>
                <span className="inline-flex items-center gap-1 font-semibold text-cream">
                  <Eye className="h-3.5 w-3.5 text-gold" aria-hidden />
                  {views > 0 ? compactNumber(views) : "—"}
                </span>
                <span className="flex gap-1">
                  {draft.posts.map((post) => (
                    <PlatformPill key={post.platform} platform={post.platform} />
                  ))}
                </span>
              </>
            ) : (
              <span className="inline-flex items-center gap-1">
                <Flame className="h-3.5 w-3.5 text-gold" aria-hidden />
                <span className="font-semibold text-cream">{draft.trend.viralityScore.toFixed(1)}</span>
                <span aria-hidden>·</span>
                {timeAgo(draft.createdAt)}
              </span>
            )}
          </div>
          {download && (
            <a
              href={download}
              className="btn btn-ghost btn-sm !min-h-8 !px-2"
              aria-label={`Download video for ${draft.title}`}
              title="Download MP4"
            >
              <Download className="h-4 w-4" aria-hidden />
            </a>
          )}
        </div>
      </TiltCard>
    </div>
  );
}
