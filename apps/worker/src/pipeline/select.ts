import type { TriagedStory } from "@content-engine/ai";
import { domainOf, type EventPayloads, type RawItem } from "@content-engine/core";

/** Picks the stories worth a draft: new, above the score threshold, within today's remaining quota. */
export function selectStories(stories: TriagedStory[], remaining: number, minScore: number): TriagedStory[] {
  if (remaining <= 0) return [];
  return stories
    .filter((story) => !story.alreadyCovered && story.score >= minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, remaining);
}

/** Builds the story/selected payload, carrying the scout's news items forward as evidence. */
export function toSelectedEvent(story: TriagedStory, items: RawItem[]): EventPayloads["story/selected"] {
  const related = story.itemIndexes.map((index) => items[index]).filter((item): item is RawItem => Boolean(item));
  return {
    title: story.title,
    sources: [...new Set(related.map((item) => item.source))],
    summary: story.summary,
    searchQuery: story.searchQuery,
    category: story.category,
    isSerious: story.isSerious,
    score: story.score,
    relatedNews: related
      .filter((item) => item.kind === "news" && item.url)
      .slice(0, 8)
      .map((item) => ({
        url: item.url!,
        title: item.title,
        outlet: domainOf(item.url!) ?? item.source,
        ...(item.summary ? { snippet: item.summary } : {}),
      })),
  };
}
