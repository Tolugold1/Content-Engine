import { blockingClaims } from "@content-engine/core";
import { ArrowRight, Flame, MessageCircle, ShieldCheck, ShieldAlert } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { ToneChip } from "@/components/badges";
import { DraftCard, DraftPoster } from "@/components/draft-card";
import { TiltCard } from "@/components/tilt-card";
import { timeAgo } from "@/lib/format";
import { listDrafts } from "@/lib/store";

export const metadata: Metadata = { title: "Review queue" };

export default async function ReviewPage() {
  const [pending, rendering, ready] = await Promise.all([
    listDrafts({ status: "pending_review" }),
    listDrafts({ status: "rendering" }),
    listDrafts({ status: "approved" }),
  ]);

  return (
    <div className="space-y-12 pt-8 sm:pt-12">
      <header className="rise">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-gold">Review queue</p>
        <h1 className="mt-2 font-display text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
          {pending.length === 0 ? "All caught up" : `${pending.length} waiting for you`}
        </h1>
        <p className="mt-3 max-w-xl text-muted">
          These are the same drafts your Telegram bot sent. Approve here or there; the other side updates automatically.
        </p>
      </header>

      <section className="space-y-4" aria-label="Drafts waiting for review">
        {pending.map((draft, index) => {
          const blocked = blockingClaims(draft).length;
          const counts = {
            confirmed: draft.claims.filter((c) => c.status === "confirmed").length,
            reported: draft.claims.filter((c) => c.status === "reported").length,
            chatter: draft.claims.filter((c) => c.status === "chatter").length,
          };
          return (
            <div key={draft.id} className="rise" style={{ animationDelay: `${index * 70}ms` }}>
              <TiltCard className="glass rounded-[26px] p-3 sm:p-4">
                <div className="grid gap-4 sm:grid-cols-[150px_1fr] sm:gap-6">
                  <Link href={`/drafts/${draft.id}`} className="mx-auto block w-36 sm:w-full">
                    <DraftPoster draft={draft} />
                  </Link>
                  <div className="flex min-w-0 flex-col">
                    <div className="flex flex-wrap items-center gap-2">
                      <ToneChip tone={draft.tone} />
                      <span className="inline-flex items-center gap-1 text-xs text-muted">
                        <Flame className="h-3.5 w-3.5 text-gold" aria-hidden />
                        <span className="font-semibold text-cream">{draft.trend.viralityScore.toFixed(1)}</span> virality
                      </span>
                      <span className="text-xs text-faint">{timeAgo(draft.createdAt)}</span>
                    </div>
                    <h2 className="pop mt-2 font-display text-xl font-bold leading-snug text-white sm:text-2xl">{draft.title}</h2>
                    <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted">{draft.trend.reactionSummary}</p>
                    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
                      <span className={`inline-flex items-center gap-1.5 ${blocked ? "text-warn" : "text-ok"}`}>
                        {blocked ? <ShieldAlert className="h-4 w-4" aria-hidden /> : <ShieldCheck className="h-4 w-4" aria-hidden />}
                        {blocked ? `${blocked} claim${blocked > 1 ? "s" : ""} need fixing` : "All claims supported"}
                      </span>
                      <span className="text-muted">
                        {counts.confirmed} confirmed · {counts.reported} reported · {counts.chatter} chatter
                      </span>
                      <span className="inline-flex items-center gap-1.5 text-muted">
                        <MessageCircle className="h-3.5 w-3.5" aria-hidden />
                        {draft.engagementQuestion}
                      </span>
                    </div>
                    <div className="mt-auto pt-4">
                      <Link href={`/drafts/${draft.id}`} className="btn btn-gold">
                        Review now
                        <ArrowRight className="h-4 w-4" aria-hidden />
                      </Link>
                    </div>
                  </div>
                </div>
              </TiltCard>
            </div>
          );
        })}
        {pending.length === 0 && (
          <div className="glass rounded-[24px] p-10 text-center text-muted">
            Nothing to review. Telegram will ping you when the next video is ready.
          </div>
        )}
      </section>

      {rendering.length > 0 && (
        <section aria-labelledby="rendering">
          <h2 id="rendering" className="mb-4 font-display text-2xl font-bold text-white">
            Still rendering
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-4 lg:grid-cols-5">
            {rendering.map((draft) => (
              <DraftCard key={draft.id} draft={draft} />
            ))}
          </div>
        </section>
      )}

      {ready.length > 0 && (
        <section aria-labelledby="ready">
          <h2 id="ready" className="mb-4 font-display text-2xl font-bold text-white">
            Approved, ready to post
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-4 lg:grid-cols-5">
            {ready.map((draft) => (
              <DraftCard key={draft.id} draft={draft} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
