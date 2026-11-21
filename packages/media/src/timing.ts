/** Character-level voice timings -> word and scene timings for captions and cuts. */

export interface Alignment {
  characters: string[];
  character_start_times_seconds: number[];
  character_end_times_seconds: number[];
}

export interface TimedWord {
  text: string;
  start: number;
  end: number;
}

export interface Narration {
  /** The exact text sent to the voice model. */
  text: string;
  /** Character range of each scene within `text` (end exclusive). The outro is the last range. */
  ranges: Array<{ start: number; end: number }>;
}

/** Joins scene texts and the outro into one narration, remembering where each part starts. */
export function buildNarration(parts: string[]): Narration {
  let text = "";
  const ranges = parts.map((part) => {
    const clean = part.replace(/\s+/g, " ").trim();
    if (text) text += " ";
    const start = text.length;
    text += clean;
    return { start, end: text.length };
  });
  return { text, ranges };
}

export function wordsFromAlignment(alignment: Alignment): TimedWord[] {
  const words: TimedWord[] = [];
  let current: TimedWord | null = null;
  alignment.characters.forEach((char, i) => {
    const start = alignment.character_start_times_seconds[i] ?? 0;
    const end = alignment.character_end_times_seconds[i] ?? start;
    if (/\s/.test(char)) {
      if (current) words.push(current);
      current = null;
      return;
    }
    if (current) {
      current.text += char;
      current.end = end;
    } else {
      current = { text: char, start, end };
    }
  });
  if (current) words.push(current);
  return words;
}

/** Start/end seconds for each narration range, based on the aligned characters. */
export function rangeTimings(narration: Narration, alignment: Alignment): Array<{ start: number; end: number }> {
  const total = alignment.character_end_times_seconds.at(-1) ?? 0;
  const at = (index: number, kind: "start" | "end") => {
    const times = kind === "start" ? alignment.character_start_times_seconds : alignment.character_end_times_seconds;
    const clamped = Math.min(Math.max(index, 0), times.length - 1);
    return times[clamped] ?? total;
  };
  return narration.ranges.map((range, i) => {
    const start = i === 0 ? 0 : at(range.start, "start");
    const next = narration.ranges[i + 1];
    const end = next ? at(next.start, "start") : total;
    return { start, end: Math.max(end, start + 0.1) };
  });
}
