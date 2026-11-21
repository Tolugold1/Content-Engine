import { describe, expect, it } from "vitest";
import { chunkWords } from "./remotion/components";
import { visualKind } from "./remotion/scenes";

describe("video helpers", () => {
  it("maps the writer's visual notes to layouts", () => {
    expect(visualKind("Poll card", 4)).toBe("poll");
    expect(visualKind("Reaction card: @someone", 2)).toBe("quote");
    expect(visualKind("Source chips", 1)).toBe("sources");
    expect(visualKind("Scoreboard 2-1", 1)).toBe("score");
    expect(visualKind("anything", 0)).toBe("title");
    expect(visualKind("anything", 3)).toBe("plain");
  });

  it("breaks captions on punctuation or every five words", () => {
    const words = "One two three. Four five six seven eight nine".split(" ").map((text, i) => ({ text, start: i, end: i + 0.9 }));
    expect(chunkWords(words).map((line) => line.map((w) => w.text).join(" "))).toEqual([
      "One two three.",
      "Four five six seven eight",
      "nine",
    ]);
  });
});
