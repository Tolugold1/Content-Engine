import { DraftStatus, TEMPLATE_BY_TONE, Tone } from "@content-engine/core";
import { Search } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { DraftCard } from "@/components/draft-card";
import { dayLabel, STATUS_LABEL } from "@/lib/format";
import { listDrafts } from "@/lib/store";

export const metadata: Metadata = { title: "Library" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const STATUS_FILTERS = ["pending_review", "approved", "posted", "rejected", "failed"] as const;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function LibraryPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const status = DraftStatus.safeParse(first(params.status)).data;
  const tone = Tone.safeParse(first(params.tone)).data;
  const q = first(params.q)?.slice(0, 80) ?? "";

  const drafts = await listDrafts({ status, tone, q });

  const groups = new Map<string, typeof drafts>();
  for (const draft of drafts) {
    const label = dayLabel(draft.createdAt);
    groups.set(label, [...(groups.get(label) ?? []), draft]);
  }

  function href(next: { status?: string | null; tone?: string | null }) {
    const search = new URLSearchParams();
    const s = next.status === undefined ? status : next.status;
    const t = next.tone === undefined ? tone : next.tone;
    if (s) search.set("status", s);
    if (t) search.set("tone", t);
    if (q) search.set("q", q);
    const query = search.toString();
    return query ? `/library?${query}` : "/library";
  }

  return (
    <div className="space-y-8 pt-8 sm:pt-12">
      <header className="rise">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-gold">Library</p>
        <h1 className="mt-2 font-display text-4xl font-extrabold tracking-tight text-white sm:text-5xl">Every video, every day</h1>
        <p className="mt-3 max-w-xl text-muted">Watch, download or reopen anything the engine has made, including the ones you rejected.</p>
      </header>

      <div className="glass space-y-4 rounded-[24px] p-4 sm:p-5">
        <form action="/library" method="get" className="relative">
          {status && <input type="hidden" name="status" value={status} />}
          {tone && <input type="hidden" name="tone" value={tone} />}
          <label htmlFor="library-search" className="sr-only">
            Search videos
          </label>
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" aria-hidden />
          <input
            id="library-search"
            name="q"
            defaultValue={q}
            placeholder="Search titles, trends or hashtags"
            className="h-11 w-full rounded-xl border border-white/10 bg-black/40 pl-10 pr-3 text-sm text-cream placeholder:text-faint focus:border-gold/50 focus:outline-none"
          />
        </form>
        <div className="scrollbar-none -mx-1 flex gap-2 overflow-x-auto px-1">
          <FilterChip href={href({ status: null })} active={!status} label="All" />
          {STATUS_FILTERS.map((value) => (
            <FilterChip key={value} href={href({ status: value })} active={status === value} label={STATUS_LABEL[value]} />
          ))}
        </div>
        <div className="scrollbar-none -mx-1 flex gap-2 overflow-x-auto px-1">
          <FilterChip href={href({ tone: null })} active={!tone} label="Every template" />
          {Tone.options.map((value) => (
            <FilterChip key={value} href={href({ tone: value })} active={tone === value} label={TEMPLATE_BY_TONE[value].name} />
          ))}
        </div>
      </div>

      {drafts.length === 0 ? (
        <div className="glass rounded-[24px] p-10 text-center text-muted">
          No videos match.{" "}
          <Link href="/library" className="text-gold hover:underline">
            Clear filters
          </Link>
        </div>
      ) : (
        [...groups.entries()].map(([label, items]) => (
          <section key={label} aria-label={label}>
            <h2 className="mb-4 flex items-center gap-3 font-display text-lg font-bold text-white">
              {label}
              <span className="h-px flex-1 bg-gradient-to-r from-gold/30 to-transparent" aria-hidden />
              <span className="text-xs font-medium text-muted">{items.length}</span>
            </h2>
            <div className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 lg:grid-cols-5">
              {items.map((draft, index) => (
                <DraftCard key={draft.id} draft={draft} index={index} />
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}

function FilterChip({ href, active, label }: { href: string; active: boolean; label: string }) {
  return (
    <Link
      href={href}
      aria-current={active ? "true" : undefined}
      className={`shrink-0 rounded-full border px-3.5 py-1.5 text-sm transition-colors ${
        active ? "border-gold/60 bg-gold/15 text-gold-light" : "border-white/10 text-muted hover:border-gold/30 hover:text-cream"
      }`}
    >
      {label}
    </Link>
  );
}
