import type { ClaimStatus, Evidence } from "./schemas";

export function slugify(text: string, maxLength = 60): string {
  return text
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, maxLength)
    .replace(/-+$/g, "");
}

/** "https://www.punchng.com/x" -> "punchng.com". */
export function domainOf(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return null;
  }
}

/**
 * Claim status is computed, not guessed: two or more different outlets make a
 * claim confirmed, one makes it reported, none leaves it as social chatter.
 */
export function claimStatusFromEvidence(evidenceIds: string[], evidence: Evidence[]): ClaimStatus {
  const outlets = new Set(
    evidenceIds
      .map((id) => evidence.find((item) => item.id === id))
      .filter((item): item is Evidence => Boolean(item))
      .map((item) => domainOf(item.url) ?? item.outlet.toLowerCase()),
  );
  if (outlets.size >= 2) return "confirmed";
  if (outlets.size === 1) return "reported";
  return "chatter";
}

/** Next posting slot at least `leadMinutes` from now, as a UTC ISO string. */
export function nextPostingSlot(slots: readonly string[], timeZone: string, now = new Date(), leadMinutes = 15): string {
  const earliest = now.getTime() + leadMinutes * 60_000;
  for (let dayOffset = 0; dayOffset < 3; dayOffset++) {
    const candidates = slots.map((slot) => zonedTimeToUtc(now, dayOffset, slot, timeZone)).sort((a, b) => a - b);
    const found = candidates.find((time) => time >= earliest);
    if (found !== undefined) return new Date(found).toISOString();
  }
  return new Date(earliest).toISOString();
}

function zonedTimeToUtc(reference: Date, dayOffset: number, hhmm: string, timeZone: string): number {
  const [hour = 0, minute = 0] = hhmm.split(":").map(Number);
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" })
    .formatToParts(new Date(reference.getTime() + dayOffset * 86_400_000))
    .reduce<Record<string, string>>((acc, part) => ({ ...acc, [part.type]: part.value }), {});
  const asUtc = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), hour, minute);
  return asUtc - timeZoneOffsetMs(new Date(asUtc), timeZone);
}

function timeZoneOffsetMs(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })
    .formatToParts(date)
    .reduce<Record<string, string>>((acc, part) => ({ ...acc, [part.type]: part.value }), {});
  const local = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second),
  );
  return local - date.getTime();
}

/** Start of "today" in the given timezone, as a UTC ISO string. */
export function startOfLocalDay(timeZone: string, now = new Date()): string {
  return new Date(zonedTimeToUtc(now, 0, "00:00", timeZone)).toISOString();
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
