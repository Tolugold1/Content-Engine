import { isConfigured } from "@content-engine/config";
import { firstPassApprovalRate, latestViews } from "@content-engine/core";
import { ArrowRight, BadgeCheck, CircleDollarSign, Inbox, Radio, Send, TrendingUp } from "lucide-react";
import Link from "next/link";
import { DraftCard } from "@/components/draft-card";
import { HeroCanvas } from "@/components/hero-canvas";
import { StatTile } from "@/components/stat-tile";
import { AutoRefresh } from "@/components/auto-refresh";
import { ScanButton } from "@/components/scan-button";
import { compactNumber, formatUsd, timeAgo } from "@/lib/format";
import { getSourceHealth, listDrafts } from "@/lib/data";

export default async function StudioPage() {
  const [drafts, sources] = await Promise.all([listDrafts(), getSourceHealth()]);
  const now = Date.now();
  const lastScan = sources.reduce<string | null>((latest, s) => (!latest || s.checkedAt > latest ? s.checkedAt : latest), null);
  const telegramConnected = isConfigured("telegram");

  const pending = drafts.filter((d) => d.status === "pending_review");
  const rendering = drafts.filter((d) => d.status === "rendering");
  const ready = drafts.filter((d) => d.status === "approved");
  const posted = drafts.filter((d) => d.status === "posted");
  const weekAgo = now - 7 * 86_400_000;
  const postedThisWeek = posted.filter((d) => d.posts.some((p) => new Date(p.postedAt).getTime() > weekAgo));
  const weekViews = postedThisWeek.reduce((sum, d) => sum + latestViews(d), 0);
  const firstPass = firstPassApprovalRate(drafts);
  const monthStart = new Date(new Date(now).getFullYear(), new Date(now).getMonth(), 1).getTime();
  const spend = drafts.filter((d) => new Date(d.createdAt).getTime() >= monthStart).reduce((sum, d) => sum + d.costUsd, 0);

  return (
    <div className="space-y-12 pt-6 sm:pt-10">
      <AutoRefresh />
      {/* Hero */}
      <section className="glass relative overflow-hidden rounded-[32px]">
        <div className="floor-grid" aria-hidden />
        <div className="relative grid items-center gap-2 p-6 sm:p-10 lg:grid-cols-[1.1fr_1fr]">
          <div className="rise">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-gold">Golden Gist Studio</p>
            <h1 className="mt-3 font-display text-4xl font-extrabold leading-[1.02] tracking-tight text-white sm:text-6xl">
              Today&apos;s gist,
              <br />
              <span className="gold-gradient-text">ready when you are.</span>
            </h1>
            <p className="mt-4 max-w-md text-[15px] leading-relaxed text-muted">
              {pending.length > 0
                ? `${pending.length} ${pending.length === 1 ? "video is" : "videos are"} waiting for you${rendering.length ? `, ${rendering.length} still rendering` : ""}. Review here or on Telegram, whichever is closer.`
                : "Nothing waiting. Telegram will ping you the moment the next video is ready."}
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/review" className="btn btn-gold">
                <Inbox className="h-4 w-4" aria-hidden />
                Review queue{pending.length ? ` (${pending.length})` : ""}
              </Link>
              <Link href="/library" className="btn btn-ghost">
                Open library
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </div>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <p className="inline-flex items-center gap-2 text-xs text-muted">
                <Radio className={`h-3.5 w-3.5 ${lastScan ? "text-ok" : "text-faint"}`} aria-hidden />
                {lastScan ? `Last trend scan ${timeAgo(lastScan, now)}` : "No trend scan yet"}
              </p>
              <ScanButton />
            </div>
          </div>
          <div className="relative -mx-6 h-[280px] sm:mx-0 sm:h-[400px]">
            <div className="absolute inset-x-10 bottom-6 h-16 rounded-[50%] bg-gold/20 blur-3xl" aria-hidden />
            <HeroCanvas />
          </div>
        </div>
      </section>

      {/* Stats */}
      <section aria-label="This week at a glance" className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatTile label="Waiting" value={String(pending.length)} hint={`${ready.length} approved, not yet posted`} icon={Inbox} />
        <StatTile
          label="Posted this week"
          value={String(postedThisWeek.length)}
          hint={weekViews ? `${compactNumber(weekViews)} views so far` : "No views yet"}
          icon={TrendingUp}
        />
        <StatTile
          label="First-pass approval"
          value={firstPass === null ? "—" : `${Math.round(firstPass * 100)}%`}
          hint="Approved with no edits"
          icon={BadgeCheck}
        />
        <StatTile label="Spend this month" value={formatUsd(spend)} hint="LLM, voice and X data" icon={CircleDollarSign} />
      </section>

      {/* Needs review */}
      <section aria-labelledby="needs-review">
        <SectionHeader id="needs-review" title="Waiting for you" href="/review" linkLabel="Open queue" />
        {pending.length + rendering.length === 0 ? (
          <EmptyState text="You're all caught up. New drafts appear here and on Telegram at the same time." />
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 lg:grid-cols-5">
            {[...pending, ...rendering].map((draft, index) => (
              <DraftCard key={draft.id} draft={draft} index={index} />
            ))}
          </div>
        )}
      </section>

      {ready.length > 0 && (
        <section aria-labelledby="ready">
          <SectionHeader id="ready" title="Ready to post" />
          <div className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 lg:grid-cols-5">
            {ready.map((draft, index) => (
              <DraftCard key={draft.id} draft={draft} index={index} />
            ))}
          </div>
        </section>
      )}

      <section aria-labelledby="recent">
        <SectionHeader id="recent" title="Recently posted" href="/library?status=posted" linkLabel="All posts" />
        <div className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 lg:grid-cols-5">
          {posted.slice(0, 5).map((draft, index) => (
            <DraftCard key={draft.id} draft={draft} index={index} />
          ))}
        </div>
      </section>

      {/* Pipeline + Telegram */}
      <section className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
        <div className="glass rounded-[24px] p-5 sm:p-6">
          <h2 className="font-display text-lg font-bold text-white">Trend sources</h2>
          {sources.length === 0 && (
            <p className="mt-4 text-sm text-muted">No scans yet. Press “Scan now” or wait for the next scheduled run.</p>
          )}
          <ul className="mt-4 divide-y divide-white/5">
            {sources.map((source) => (
              <li key={source.name} className="flex items-center justify-between py-2.5 text-sm">
                <span className="flex items-center gap-2.5">
                  <span className={`h-2 w-2 rounded-full ${source.ok ? "bg-ok" : "bg-bad"}`} aria-hidden />
                  <span className="text-cream">{source.name}</span>
                </span>
                <span className="max-w-[55%] truncate text-right text-xs text-muted" title={source.note}>
                  {source.note} · {timeAgo(source.checkedAt, now)}
                </span>
              </li>
            ))}
          </ul>
        </div>
        <div className="glass rounded-[24px] p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl border border-line bg-gold/10">
              <Send className="h-4 w-4 text-gold" aria-hidden />
            </span>
            <h2 className="font-display text-lg font-bold text-white">Telegram stays on</h2>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            Every finished video still goes to Telegram with Approve, Edit and Reject buttons. This dashboard reads the same drafts, so a
            decision in one place shows up in the other, and the first decision wins.
          </p>
          <p className={`mt-4 text-sm font-medium ${telegramConnected ? "text-ok" : "text-warn"}`}>
            {telegramConnected ? "Bot connected" : "Bot not connected yet: add the Telegram keys (docs/SETUP.md)"}
          </p>
        </div>
      </section>
    </div>
  );
}

function SectionHeader({ id, title, href, linkLabel }: { id: string; title: string; href?: string; linkLabel?: string }) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4">
      <h2 id={id} className="font-display text-2xl font-bold text-white">
        {title}
      </h2>
      {href && (
        <Link href={href} className="inline-flex items-center gap-1 text-sm font-medium text-gold hover:text-gold-light">
          {linkLabel}
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      )}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return <div className="glass rounded-[24px] p-8 text-center text-sm text-muted">{text}</div>;
}
