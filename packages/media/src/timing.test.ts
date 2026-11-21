import { describe, expect, it } from "vitest";
import { buildNarration, rangeTimings, wordsFromAlignment, type Alignment } from "./timing";

function fakeAlignment(text: string, secondsPerChar = 0.1): Alignment {
  const characters = Array.from(text);
  return {
    characters,
    character_start_times_seconds: characters.map((_, i) => i * secondsPerChar),
    character_end_times_seconds: characters.map((_, i) => (i + 1) * secondsPerChar),
  };
}

describe("voice timing", () => {
  it("builds narration ranges and maps them to seconds", () => {
    const narration = buildNarration(["Hello  there.", "Second part.", "Outro!"]);
    expect(narration.text).toBe("Hello there. Second part. Outro!");
    const timings = rangeTimings(narration, fakeAlignment(narration.text));
    expect(timings[0]).toEqual({ start: 0, end: expect.closeTo(1.3, 5) });
    expect(timings[2]?.end).toBeCloseTo(3.2, 5);
  });

  it("groups characters into timed words", () => {
    const words = wordsFromAlignment(fakeAlignment("Hi you"));
    expect(words).toEqual([
      { text: "Hi", start: 0, end: expect.closeTo(0.2, 5) },
      { text: "you", start: expect.closeTo(0.3, 5), end: expect.closeTo(0.6, 5) },
    ]);
  });
});
