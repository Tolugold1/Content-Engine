/** Small fetch helpers with timeouts and clear errors for source adapters. */

export class SourceError extends Error {
  constructor(
    readonly source: string,
    message: string,
  ) {
    super(`${source}: ${message}`);
    this.name = "SourceError";
  }
}

const USER_AGENT = "ContentEngine/1.0 (+trend research)";

export async function fetchText(source: string, url: string, init: RequestInit = {}, timeoutMs = 15_000): Promise<string> {
  const response = await fetch(url, {
    ...init,
    headers: { "user-agent": USER_AGENT, ...init.headers },
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!response.ok) throw new SourceError(source, `HTTP ${response.status} from ${new URL(url).host}`);
  return response.text();
}

export async function fetchJson<T>(source: string, url: string, init: RequestInit = {}, timeoutMs = 15_000): Promise<T> {
  return JSON.parse(await fetchText(source, url, init, timeoutMs)) as T;
}

/** Strips tags and collapses whitespace in feed summaries. */
export function plainText(html: string | undefined, max = 400): string | undefined {
  if (!html) return undefined;
  const text = html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#8217;|&rsquo;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
  return text ? text.slice(0, max) : undefined;
}
