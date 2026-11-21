import { domainOf, type RawItem } from "@content-engine/core";
import { XMLParser } from "fast-xml-parser";
import { plainText } from "./http";

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@", textNodeName: "#text" });

type Node = Record<string, unknown>;

function asArray<T>(value: T | T[] | undefined): T[] {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
}

function text(value: unknown): string | undefined {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  if (value && typeof value === "object" && "#text" in value) return String((value as Node)["#text"]);
  return undefined;
}

/** Parses RSS 2.0 or Atom into raw news items published after `since`. */
export function parseFeed(xml: string, feedUrl: string, since: Date): RawItem[] {
  const doc = parser.parse(xml) as Node;
  const source = domainOf(feedUrl) ?? feedUrl;
  const rss = (doc.rss as Node | undefined)?.channel as Node | undefined;
  const atom = doc.feed as Node | undefined;

  const entries = rss
    ? asArray(rss.item as Node[]).map((item) => ({
        title: text(item.title),
        url: text(item.link),
        summary: plainText(text(item.description)),
        published: text(item.pubDate) ?? text(item["dc:date"]),
      }))
    : asArray(atom?.entry as Node[]).map((entry) => {
        const links = asArray(entry.link as Node[]);
        const link = links.find((l) => !l["@rel"] || l["@rel"] === "alternate") ?? links[0];
        return {
          title: text(entry.title),
          url: link ? text(link["@href"]) : undefined,
          summary: plainText(text(entry.summary) ?? text(entry.content)),
          published: text(entry.published) ?? text(entry.updated),
        };
      });

  return entries
    .filter((entry): entry is typeof entry & { title: string } => Boolean(entry.title))
    .filter((entry) => {
      const time = entry.published ? Date.parse(entry.published) : NaN;
      return Number.isNaN(time) || time >= since.getTime();
    })
    .map((entry) => ({
      source,
      kind: "news" as const,
      title: entry.title.trim(),
      ...(entry.url ? { url: entry.url.trim() } : {}),
      ...(entry.summary ? { summary: entry.summary } : {}),
      ...(entry.published && !Number.isNaN(Date.parse(entry.published)) ? { publishedAt: new Date(entry.published).toISOString() } : {}),
    }));
}

/** Parses the Google Trends "trending now" RSS feed. */
export function parseGoogleTrends(xml: string): RawItem[] {
  const doc = parser.parse(xml) as Node;
  const items = asArray(((doc.rss as Node | undefined)?.channel as Node | undefined)?.item as Node[]);
  return items
    .map((item) => {
      const news = asArray(item["ht:news_item"] as Node[]);
      const traffic = text(item["ht:approx_traffic"])?.replace(/[^0-9]/g, "");
      const summary = news
        .map((n) => text(n["ht:news_item_title"]))
        .filter(Boolean)
        .slice(0, 2)
        .join(" | ");
      return {
        source: "Google Trends NG",
        kind: "trend" as const,
        title: text(item.title)?.trim() ?? "",
        ...(text(news[0]?.["ht:news_item_url"]) ? { url: text(news[0]?.["ht:news_item_url"]) } : {}),
        ...(summary ? { summary: plainText(summary) } : {}),
        ...(traffic ? { volume: Number(traffic) } : {}),
      };
    })
    .filter((item) => item.title);
}
