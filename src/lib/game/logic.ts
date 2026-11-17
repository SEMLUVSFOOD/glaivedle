/** Pure game logic — no I/O, unit tested. */
import type { Cell, Direction, Verdict } from "./types";
import { normName, normTitle } from "../normalize";

export function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ── Classic comparison ───────────────────────────────────────────────────

export type ClassicSong = {
  id: number;
  releaseId: number | null;
  project: string;
  type: string;
  year: number | null;
  collaborators: string[];
  producers: string[];
  duration: number | null;
  trackNumber: number | null;
};

const dir = (guess: number, answer: number): Direction => (answer > guess ? "up" : answer < guess ? "down" : null);

export function compareSets(guess: string[], answer: string[]): Verdict {
  const g = new Set(guess.map(normName));
  const a = new Set(answer.map(normName));
  if (g.size === 0 && a.size === 0) return "correct";
  if (g.size === a.size && [...g].every((x) => a.has(x))) return "correct";
  return [...g].some((x) => a.has(x)) ? "partial" : "wrong";
}

export const fmtDuration = (s: number | null) =>
  s == null ? "?" : `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}`;

const TYPE_LABEL: Record<string, string> = {
  album: "Album",
  ep: "EP",
  single: "Single",
  feature: "Feature",
  unreleased: "Unreleased",
};
export const typeLabel = (t: string) => TYPE_LABEL[t] ?? t;

export function compareClassic(guess: ClassicSong, answer: ClassicSong, opts: { producers: boolean }): Cell[] {
  const cells: Cell[] = [];

  cells.push({
    key: "project",
    label: "Project",
    value: guess.project,
    verdict:
      guess.releaseId !== null && guess.releaseId === answer.releaseId
        ? "correct"
        : guess.releaseId === null && answer.releaseId === null && guess.type === answer.type
          ? guess.project === answer.project
            ? "correct"
            : "partial" // both leaks, different era
          : "wrong",
  });

  cells.push({
    key: "type",
    label: "Type",
    value: typeLabel(guess.type),
    verdict: guess.type === answer.type ? "correct" : "wrong",
  });

  if (guess.year == null || answer.year == null) {
    cells.push({ key: "year", label: "Year", value: guess.year ? String(guess.year) : "?", verdict: "unknown" });
  } else {
    const d = Math.abs(guess.year - answer.year);
    cells.push({
      key: "year",
      label: "Year",
      value: String(guess.year),
      verdict: d === 0 ? "correct" : "wrong",
      dir: dir(guess.year, answer.year),
    });
  }

  cells.push({
    key: "collabs",
    label: "Collabs",
    value: guess.collaborators.length ? guess.collaborators.join(", ") : "Solo",
    verdict: compareSets(guess.collaborators, answer.collaborators),
  });

  if (opts.producers) {
    cells.push({
      key: "producers",
      label: "Producers",
      value: guess.producers.length ? guess.producers.join(", ") : "?",
      verdict:
        !guess.producers.length || !answer.producers.length
          ? "unknown"
          : compareSets(guess.producers, answer.producers),
    });
  }

  if (guess.duration == null || answer.duration == null) {
    cells.push({ key: "length", label: "Length", value: fmtDuration(guess.duration), verdict: "unknown" });
  } else {
    const d = Math.abs(guess.duration - answer.duration);
    cells.push({
      key: "length",
      label: "Length",
      value: fmtDuration(guess.duration),
      verdict: d <= 2 ? "correct" : d <= 15 ? "partial" : "wrong",
      dir: d <= 2 ? null : dir(guess.duration, answer.duration),
    });
  }

  if (guess.trackNumber == null || answer.trackNumber == null) {
    cells.push({ key: "track", label: "Track #", value: guess.trackNumber ? `#${guess.trackNumber}` : "—", verdict: "unknown" });
  } else {
    cells.push({
      key: "track",
      label: "Track #",
      value: `#${guess.trackNumber}`,
      verdict: guess.trackNumber === answer.trackNumber ? "correct" : "wrong",
      dir: dir(guess.trackNumber, answer.trackNumber),
    });
  }

  return cells;
}

// ── Lyrics ───────────────────────────────────────────────────────────────

export const LYRIC_LINES = 6;

/** Picks consecutive, distinct lyric lines that don't give away the title. */
export function selectLyricLines(lyrics: string, title: string, seed: number, count = LYRIC_LINES): string[] {
  const t = normTitle(title);
  const titleWords = t.split(" ").filter((w) => w.length > 2);
  const giveaway = (line: string) => {
    const n = ` ${normTitle(line)} `;
    if (t.length >= 3 && n.includes(` ${t} `)) return true;
    // long titles: a line containing most of the title's words gives it away too
    return titleWords.length >= 3 && titleWords.filter((w) => n.includes(` ${w} `)).length >= Math.ceil(titleWords.length * 0.75);
  };

  const seen = new Set<string>();
  const lines: string[] = [];
  for (const raw of lyrics.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || /^\[.*\]$/.test(line) || /^\(.*\)$/.test(line)) continue;
    const key = normTitle(line);
    if (!key || seen.has(key) || giveaway(line)) continue;
    seen.add(key);
    lines.push(line);
  }
  if (lines.length <= count) return lines;
  const start = Math.floor(rng(seed)() * (lines.length - count + 1));
  return lines.slice(start, start + count);
}

// ── Audio / cover reveal schedules ──────────────────────────────────────

export const AUDIO_CLIPS = [1, 2, 4, 7, 11, 16];
export const AUDIO_CLIPS_HARD = [0.5, 1, 2, 3.5, 6, 10];
export const PREVIEW_SECONDS = 30;

export function clipSeconds(step: number, hard: boolean, finished: boolean): number {
  if (finished) return PREVIEW_SECONDS;
  const list = hard ? AUDIO_CLIPS_HARD : AUDIO_CLIPS;
  return list[Math.min(step, list.length - 1)];
}

/** Number of pixel blocks across the cover per step. */
export const COVER_BLOCKS = [6, 10, 16, 26, 40, 64];

export function coverBlocks(step: number, finished: boolean): number | null {
  if (finished) return null;
  return COVER_BLOCKS[Math.min(step, COVER_BLOCKS.length - 1)];
}

// ── Share text ───────────────────────────────────────────────────────────

export function verdictEmoji(v: Verdict): string {
  return v === "correct" ? "🟩" : v === "partial" ? "🟨" : v === "unknown" ? "⬛" : "🟥";
}
