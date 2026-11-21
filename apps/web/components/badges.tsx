import { PLATFORM_INFO, TEMPLATE_BY_TONE, type ClaimStatus, type DraftStatus, type JudgeVerdict, type Platform, type Tone } from "@content-engine/core";
import { STATUS_LABEL } from "@/lib/format";

const STATUS_STYLE: Record<DraftStatus, string> = {
  rendering: "border-white/15 bg-white/5 text-cream/80",
  pending_review: "border-gold/50 bg-gold/15 text-gold-light",
  approved: "border-ok/40 bg-ok/10 text-ok",
  rejected: "border-bad/40 bg-bad/10 text-bad",
  posted: "border-gold/30 bg-black/40 text-cream",
  failed: "border-bad/40 bg-bad/10 text-bad",
};

export function StatusBadge({ status }: { status: DraftStatus }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider backdrop-blur ${STATUS_STYLE[status]}`}
    >
      {status === "pending_review" && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-gold" aria-hidden />}
      {status === "rendering" && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-cream/70" aria-hidden />}
      {STATUS_LABEL[status]}
    </span>
  );
}

const TONE_TEXT: Record<Tone, string> = {
  comedy: "text-comedy border-comedy/40 bg-comedy/10",
  hype: "text-hype border-hype/40 bg-hype/10",
  explainer: "text-explainer border-explainer/40 bg-explainer/10",
};

export function ToneChip({ tone }: { tone: Tone }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${TONE_TEXT[tone]}`}>
      {TEMPLATE_BY_TONE[tone].name}
    </span>
  );
}

export function PlatformPill({ platform, muted = false }: { platform: Platform; muted?: boolean }) {
  return (
    <span
      title={PLATFORM_INFO[platform].label}
      className={`inline-grid h-6 min-w-6 place-items-center rounded-md border px-1 text-[10px] font-bold ${
        muted ? "border-white/10 text-faint" : "border-gold/40 bg-gold/10 text-gold-light"
      }`}
    >
      {PLATFORM_INFO[platform].short}
    </span>
  );
}

const CLAIM_STYLE: Record<ClaimStatus, { label: string; className: string; hint: string }> = {
  confirmed: { label: "Confirmed", className: "border-ok/40 bg-ok/10 text-ok", hint: "2+ independent outlets" },
  reported: { label: "Reported", className: "border-explainer/40 bg-explainer/10 text-explainer", hint: "1 outlet, must be attributed" },
  chatter: { label: "Chatter", className: "border-warn/40 bg-warn/10 text-warn", hint: "Social posts only, must be framed as a claim" },
};

export function ClaimStatusPill({ status }: { status: ClaimStatus }) {
  const style = CLAIM_STYLE[status];
  return (
    <span title={style.hint} className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold ${style.className}`}>
      {style.label}
    </span>
  );
}

export const VERDICT_LABEL: Record<JudgeVerdict, string> = {
  supported: "Supported",
  misframed: "Misframed",
  unsupported: "Unsupported",
};
