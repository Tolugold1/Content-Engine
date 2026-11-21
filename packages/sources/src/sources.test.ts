import { describe, expect, it } from "vitest";
import { fixturesToItems } from "./adapters";
import { parseFeed, parseGoogleTrends } from "./feeds";
import { dedupeItems } from "./index";

const now = new Date("2026-11-21T18:00:00Z");

describe("feed parsing", () => {
  it("reads RSS 2.0 items newer than the cutoff", () => {
    const xml = `<?xml version="1.0"?><rss version="2.0"><channel><title>Punch</title>
      <item><title>Fresh story</title><link>https://punchng.com/fresh</link><description><![CDATA[<p>Body &amp; more</p>]]></description><pubDate>Sat, 21 Nov 2026 16:00:00 GMT</pubDate></item>
      <item><title>Old story</title><link>https://punchng.com/old</link><pubDate>Mon, 16 Nov 2026 10:00:00 GMT</pubDate></item>
    </channel></rss>`;
    const items = parseFeed(xml, "https://punchng.com/feed/", new Date(now.getTime() - 24 * 3_600_000));
    expect(items).toEqual([
      expect.objectContaining({
        source: "punchng.com",
        kind: "news",
        title: "Fresh story",
        url: "https://punchng.com/fresh",
        summary: "Body & more",
      }),
    ]);
  });

  it("reads Atom entries", () => {
    const xml = `<feed xmlns="http://www.w3.org/2005/Atom"><entry><title>Atom story</title><link rel="alternate" href="https://example.com/a"/><updated>2026-11-21T17:00:00Z</updated><summary>Short</summary></entry></feed>`;
    expect(parseFeed(xml, "https://example.com/feed", new Date(0))[0]).toMatchObject({ title: "Atom story", url: "https://example.com/a" });
  });

  it("reads Google Trends with traffic and news items", () => {
    const xml = `<rss xmlns:ht="https://trends.google.com/trending/rss"><channel><item><title>wizkid</title><ht:approx_traffic>20,000+</ht:approx_traffic>
      <ht:news_item><ht:news_item_title>Headline one</ht:news_item_title><ht:news_item_url>https://news.example/1</ht:news_item_url></ht:news_item></item></channel></rss>`;
    expect(parseGoogleTrends(xml)[0]).toMatchObject({
      title: "wizkid",
      volume: 20000,
      url: "https://news.example/1",
      summary: "Headline one",
    });
  });
});

describe("fixtures", () => {
  it("keeps followed teams: upcoming today and recent full-time results", () => {
    const items = fixturesToItems(
      [
        {
          utcDate: "2026-11-21T20:00:00Z",
          status: "TIMED",
          competition: { name: "Premier League" },
          homeTeam: { shortName: "Arsenal" },
          awayTeam: { shortName: "Spurs" },
        },
        {
          utcDate: "2026-11-21T15:00:00Z",
          status: "FINISHED",
          homeTeam: { shortName: "Chelsea" },
          awayTeam: { shortName: "Fulham" },
          score: { fullTime: { home: 2, away: 1 } },
        },
        { utcDate: "2026-11-21T20:00:00Z", status: "TIMED", homeTeam: { shortName: "Brentford" }, awayTeam: { shortName: "Wolves" } },
      ],
      now,
      "Fixtures",
    );
    expect(items.map((item) => item.title)).toEqual(["Arsenal vs Spurs today", "Full time: Chelsea 2-1 Fulham"]);
  });
});

describe("dedupe", () => {
  it("drops repeated URLs and repeated titles from the same source", () => {
    const items = dedupeItems([
      { source: "a", kind: "news", title: "One", url: "https://x/1" },
      { source: "b", kind: "news", title: "One again", url: "https://x/1" },
      { source: "a", kind: "trend", title: "Two" },
      { source: "a", kind: "trend", title: "two" },
    ]);
    expect(items).toHaveLength(2);
  });
});
