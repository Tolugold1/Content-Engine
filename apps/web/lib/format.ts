import type { Draft, DraftStatus } from "@content-engine/core";

export const TIME_ZONE = process.env.DASHBOARD_TIMEZONE ?? "Africa/Lagos";

export function timeAgo(iso: string, now = Date.now()): string {
  const diff = now - new Date(iso).getTime();
  const future = diff < 0;
  const minutes = Math.round(Math.abs(diff) / 60_000);
  let label: string;
  if (minutes < 1) return "just now";
  if (minutes < 60) label = `${minutes} min`;
  else if (minutes < 60 * 24) label = `${Math.round(minutes / 60)}h`;
  else label = `${Math.round(minutes / (60 * 24))}d`;
  return future ? `in ${label}` : `${label} ago`;
}

export function formatClock(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: TIME_ZONE }).format(new Date(iso));
}

export function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: TIME_ZONE,
  }).format(new Date(iso));
}

function dayKey(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE }).format(date);
}

export function dayLabel(iso: string, now = Date.now()): string {
  const key = dayKey(new Date(iso));
  if (key === dayKey(new Date(now))) return "Today";
  if (key === dayKey(new Date(now - 86_400_000))) return "Yesterday";
  return new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: TIME_ZONE }).format(
    new Date(iso),
  );
}

export function formatUsd(value: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(value);
}

export function compactNumber(value: number): string {
  return new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

export function totalViews(draft: Draft): number {
  return draft.metrics.reduce((sum, metric) => sum + metric.views, 0);
}

export function formatDuration(seconds: number): string {
  const s = Math.round(seconds);
  return `0:${String(s).padStart(2, "0")}`;
}

export const STATUS_LABEL: Record<DraftStatus, string> = {
  rendering: "Rendering",
  pending_review: "Needs review",
  approved: "Ready to post",
  rejected: "Rejected",
  posted: "Posted",
  failed: "Failed",
};
