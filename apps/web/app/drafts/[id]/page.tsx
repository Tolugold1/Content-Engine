import {
  POSTING_CHECKLIST,
  blockingClaims,
  channelLabel,
  latestMetrics,
  PLATFORM_INFO,
  PLATFORMS,
  TEMPLATE_BY_TONE,
  type Draft,
} from "@content-engine/core";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Download,
  ExternalLink,
  Flame,
  ImageDown,
  Send,
  ShieldAlert,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ClaimStatusPill, PlatformPill, StatusBadge, ToneChip, VERDICT_LABEL } from "@/components/badges";
import { CaptionCard } from "@/components/caption-card";
import { MarkPosted } from "@/components/mark-posted";
import { PhoneFrame } from "@/components/phone-frame";
import { ReviewActions } from "@/components/review-actions";
import { compactNumber, formatClock, formatDateTime, formatDuration, formatUsd, timeAgo } from "@/lib/format";
import { getDraft } from "@/lib/data";
import { mediaUrl } from "@/lib/media";

type Params = Promise<{ id: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const draft = await getDraft((await params).id);
  return { title: draft?.title ?? "Draft" };
}

export default async function DraftPage({ params }: { params: Params }) {
  const draft = await getDraft((await params).id);
  if (!draft) notFound();

  const blocked = blockingClaims(draft);
  const videoDownload = mediaUrl(draft, "video", true);
  const stillDownload = mediaUrl(draft, "still", true);
  const hasRender = Boolean(videoDownload);
  const captionsEditable = draft.status === "pending_review" || draft.status === "approved";
  const telegramSent = draft.timeline.find((event) => event.stage === "notified_telegram");

  return (
    <div className="pt-6 sm:pt-8">
      <Link href="/library" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-cream">
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Library
      </Link>

      <div className="mt-6 grid gap-10 lg:grid-cols-[340px_1fr] lg:gap-12">
        {/* Player column */}
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <PhoneFrame draft={draft} />
          <div className="mt-6 grid grid-cols-2 gap-3">
            {hasRender ? (
              <>
                <a href={videoDownload ?? undefined} className="btn btn-gold">
                  <Download className="h-4 w-4" aria-hidden />
                  MP4
                </a>
                <a href={stillDownload ?? undefined} className="btn btn-ghost">
                  <ImageDown className="h-4 w-4" aria-hidden />
                  Still
                </a>
              </>
            ) : (
              <p className="col-span-2 text-center text-sm text-muted">Downloads appear when the render finishes.</p>
            )}
          </div>
          <dl className="glass mt-5 grid grid-cols-2 gap-x-4 gap-y-3 rounded-[20px] p-4 text-sm">
            <Fact label="Template" value={TEMPLATE_BY_TONE[draft.tone].name} />
            <Fact label="Length" value={formatDuration(draft.durationSec)} />
            <Fact label="Created" value={formatDateTime(draft.createdAt)} />
            <Fact label="Cost to make" value={formatUsd(draft.costUsd)} />
          </dl>
        </aside>

        {/* Details column */}
        <div className="min-w-0 space-y-6">
          <header className="rise">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={draft.status} />
              <ToneChip tone={draft.tone} />
              <span className="text-xs capitalize text-muted">{draft.category}</span>
            </div>
            <h1 className="mt-3 font-display text-3xl font-extrabold leading-tight tracking-tight text-white sm:text-4xl">{draft.title}</h1>
            <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
              <span className="inline-flex items-center gap-1">
                <Flame className="h-4 w-4 text-gold" aria-hidden />
                <span className="font-semibold text-cream">{draft.trend.viralityScore.toFixed(1)}</span>/10 virality
              </span>
              <span aria-hidden>·</span>
              <span>Trend: {draft.trend.title}</span>
              <span aria-hidden>·</span>
              <span>{timeAgo(draft.createdAt)}</span>
            </p>
          </header>

          <DecisionPanel draft={draft} blockedCount={blocked.length} telegramAt={telegramSent?.at} />

          {hasRender && (
            <Panel title={draft.status === "approved" || draft.status === "posted" ? "Posting kit" : "Captions"}>
              <p className="-mt-1 mb-4 text-sm text-muted">
                {captionsEditable
                  ? "Copy each caption as you post. Edits are saved and used to improve future captions."
                  : "Captions as they were posted."}
              </p>
              <div className="grid gap-3 xl:grid-cols-2">
                {PLATFORMS.map((platform) => (
                  <CaptionCard
                    key={`${platform}-${draft.captions[platform]}`}
                    draftId={draft.id}
                    platform={platform}
                    caption={draft.captions[platform]}
                    editable={captionsEditable}
                  />
                ))}
              </div>
              <div className="mt-4 rounded-2xl border border-gold/20 bg-gold/5 p-4 text-sm text-cream/90">
                <p className="font-semibold text-gold-light">Before you post</p>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-muted">
                  {POSTING_CHECKLIST.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                  <li>Pin the question as the first comment: &ldquo;{draft.engagementQuestion}&rdquo;</li>
                </ul>
              </div>
              {(draft.status === "approved" || draft.status === "posted") && (
                <div className="mt-6">
                  <h3 className="mb-3 text-sm font-semibold text-cream">Where it&apos;s live</h3>
                  <MarkPosted draftId={draft.id} posts={draft.posts} />
                </div>
              )}
            </Panel>
          )}

          {draft.metrics.length > 0 && (
            <Panel title="Performance">
              <div className="grid gap-3 sm:grid-cols-3">
                {latestMetrics(draft).map((metric) => (
                  <div key={metric.platform} className="rounded-2xl border border-white/8 bg-black/30 p-4">
                    <div className="flex items-center justify-between">
                      <PlatformPill platform={metric.platform} />
                      <span className="text-[11px] text-faint">via {metric.source}</span>
                    </div>
                    <p className="mt-3 font-display text-3xl font-bold tabular-nums text-white">{compactNumber(metric.views)}</p>
                    <p className="text-xs text-muted">views</p>
                    <p className="mt-2 text-xs text-muted">
                      {compactNumber(metric.likes)} likes · {compactNumber(metric.comments)} comments · {compactNumber(metric.shares)}{" "}
                      shares
                    </p>
                  </div>
                ))}
              </div>
            </Panel>
          )}

          <Panel title="What people are saying">
            <p className="text-[15px] leading-relaxed text-cream/90">{draft.trend.reactionSummary}</p>
            {draft.trend.topTakes.length > 0 && (
              <ul className="mt-4 space-y-2">
                {draft.trend.topTakes.map((take) => (
                  <li key={take} className="rounded-xl border-l-2 border-gold/60 bg-white/[0.03] px-3 py-2 text-sm text-cream/85">
                    {take}
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-4 text-xs text-muted">
              Mood: <span className="capitalize text-cream">{draft.trend.mood}</span> · Sources: {draft.trend.sources.join(", ")}
            </p>
          </Panel>

          <Panel title="Script">
            <ol className="space-y-3">
              {draft.scenes.map((scene) => (
                <li key={scene.index} className="grid grid-cols-[32px_1fr] gap-3">
                  <span className="grid h-8 w-8 place-items-center rounded-lg border border-line bg-gold/10 text-xs font-bold text-gold">
                    {scene.index + 1}
                  </span>
                  <div>
                    <p className="text-[15px] leading-relaxed text-cream">{scene.text}</p>
                    <p className="mt-0.5 text-xs text-muted">
                      {scene.visual} · {scene.durationSec}s
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </Panel>

          <Panel title="Claim check">
            {draft.claims.length === 0 ? (
              <p className="text-sm text-muted">No factual claims in this script.</p>
            ) : (
              <ul className="space-y-3">
                {draft.claims.map((claim) => {
                  const ok = claim.verdict === "supported";
                  return (
                    <li
                      key={claim.id}
                      className={`rounded-2xl border p-4 ${ok ? "border-white/8 bg-black/25" : "border-warn/40 bg-warn/5"}`}
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <ClaimStatusPill status={claim.status} />
                        <span className={`inline-flex items-center gap-1 text-xs font-medium ${ok ? "text-ok" : "text-warn"}`}>
                          {ok ? <ShieldCheck className="h-3.5 w-3.5" aria-hidden /> : <ShieldAlert className="h-3.5 w-3.5" aria-hidden />}
                          {VERDICT_LABEL[claim.verdict]}
                        </span>
                      </div>
                      <p className="mt-2 text-[15px] text-cream">{claim.text}</p>
                      {claim.note && <p className="mt-1 text-xs text-muted">{claim.note}</p>}
                      {claim.evidenceIds.length > 0 && (
                        <ul className="mt-2 flex flex-wrap gap-2">
                          {claim.evidenceIds.map((id) => {
                            const evidence = draft.evidence.find((item) => item.id === id);
                            if (!evidence) return null;
                            return (
                              <li key={id}>
                                <a
                                  href={evidence.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  title={evidence.title}
                                  className="inline-flex items-center gap-1 rounded-full border border-white/10 px-2.5 py-1 text-xs text-cream/80 hover:border-gold/40 hover:text-cream"
                                >
                                  {evidence.outlet}
                                  <ExternalLink className="h-3 w-3" aria-hidden />
                                </a>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>

          <Panel title="Timeline">
            <ol className="relative space-y-4 border-l border-gold/25 pl-5">
              {draft.timeline.map((event, index) => (
                <li key={`${event.stage}-${index}`} className="relative">
                  <span
                    className={`absolute -left-[26px] top-1 h-3 w-3 rounded-full border-2 ${
                      event.stage === "failed" ? "border-bad bg-bad/30" : "border-gold bg-ink"
                    }`}
                    aria-hidden
                  />
                  <p className="text-sm font-medium capitalize text-cream">{event.stage.replaceAll("_", " ")}</p>
                  <p className="text-xs text-muted">
                    {formatClock(event.at)} · {timeAgo(event.at)}
                    {event.note ? ` · ${event.note}` : ""}
                  </p>
                </li>
              ))}
            </ol>
          </Panel>
        </div>
      </div>
    </div>
  );
}

function DecisionPanel({ draft, blockedCount, telegramAt }: { draft: Draft; blockedCount: number; telegramAt?: string }) {
  if (draft.status === "pending_review") {
    return (
      <section className="glass rounded-[24px] p-5 sm:p-6" aria-labelledby="your-call">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h2 id="your-call" className="font-display text-xl font-bold text-white">
            Your call
          </h2>
          {telegramAt && (
            <span className="inline-flex items-center gap-1.5 text-xs text-muted">
              <Send className="h-3.5 w-3.5 text-gold" aria-hidden />
              Also on Telegram since {formatClock(telegramAt)}
            </span>
          )}
        </div>
        <ReviewActions draftId={draft.id} blocked={blockedCount > 0} />
      </section>
    );
  }

  if (draft.status === "rendering") {
    return (
      <Banner icon={<Clock className="h-5 w-5 text-gold" aria-hidden />} title="Rendering">
        Voice is done and the video is rendering. You&apos;ll get a Telegram message the moment it&apos;s ready.
      </Banner>
    );
  }

  if (draft.status === "failed") {
    const failure = draft.timeline.find((event) => event.stage === "failed");
    return (
      <Banner icon={<XCircle className="h-5 w-5 text-bad" aria-hidden />} title="This one failed">
        {failure?.note ?? "The pipeline stopped before rendering."}
      </Banner>
    );
  }

  const review = draft.review;
  if (!review) return null;
  const approved = review.decision === "approved";
  const posts = draft.posts.map((post) => PLATFORM_INFO[post.platform].label).join(", ");
  return (
    <Banner
      icon={approved ? <CheckCircle2 className="h-5 w-5 text-ok" aria-hidden /> : <XCircle className="h-5 w-5 text-bad" aria-hidden />}
      title={`${approved ? "Approved" : "Rejected"} on ${channelLabel(review.channel)} · ${formatClock(review.at)}`}
    >
      {approved
        ? draft.status === "posted"
          ? `Live on ${posts}.`
          : "Copy the captions below, post the MP4, then paste each link so analytics can follow it."
        : `Reason: ${review.reason ?? "none given"}`}
    </Banner>
  );
}

function Banner({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <section className="glass flex gap-4 rounded-[24px] p-5 sm:p-6">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-line bg-black/40">{icon}</span>
      <div>
        <h2 className="font-display text-lg font-bold text-white">{title}</h2>
        <p className="mt-1 text-sm leading-relaxed text-muted">{children}</p>
      </div>
    </section>
  );
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="glass rounded-[24px] p-5 sm:p-6">
      <h2 className="mb-4 font-display text-xl font-bold text-white">{title}</h2>
      {children}
    </section>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="mt-0.5 font-medium text-cream">{value}</dd>
    </div>
  );
}
