"use client";
import { addDay, type DayRecord, liveDailyStreak } from "../game/streaks";
import type { GuessEntry, Kind, Mode, RoundView } from "../game/types";

const PREFIX = "gd1";

export function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(`${PREFIX}:${key}`);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function save(key: string, value: unknown) {
  try {
    localStorage.setItem(`${PREFIX}:${key}`, JSON.stringify(value));
  } catch {
    /* storage full / private mode */
  }
  window.dispatchEvent(new CustomEvent("gd-storage", { detail: key }));
}

export type SavedRound = { round: RoundView; guesses: GuessEntry[]; streak?: StreakResult };

const diff = (hard: boolean) => (hard ? "hard" : "normal");

/** Rounds and endless unlocks also depend on the ovine hall switch (it changes the unreleased pool). */
const variant = (hard: boolean, ovine: boolean) => (hard && !ovine ? "hard-noalias" : diff(hard));

export const roundKey = (mode: Mode, hard: boolean, kind: Kind, date: string | null, ovine = true) =>
  `round:${mode}:${variant(hard, ovine)}:${kind === "endless" ? "endless" : date}`;

export const proofKey = (mode: Mode, hard: boolean, ovine = true) => `proof:${mode}:${variant(hard, ovine)}`;

// ── Stats & streaks ─────────────────────────────────────────────────────
//
// Every mode keeps three separate stat tracks per difficulty:
//   daily   – one puzzle a day; the streak counts consecutive days won
//   endless – the streak counts consecutive endless rounds won
//   archive – the streak counts consecutive past days won (each date counts once)
// Plus a per-day log of the dailies for the cross-mode day streak and "sweep" streak.

export type Track = "daily" | "endless" | "archive";
export const TRACKS: Track[] = ["daily", "endless", "archive"];

export type Stats = {
  played: number;
  won: number;
  streak: number;
  maxStreak: number;
  lastDate: string | null;
  lastWonDate: string | null;
  dist: Record<string, number>;
  /** archive only: dates already counted */
  seen?: string[];
};

export const emptyStats = (): Stats => ({
  played: 0,
  won: 0,
  streak: 0,
  maxStreak: 0,
  lastDate: null,
  lastWonDate: null,
  dist: {},
});

/** Daily keeps its original key so existing stats carry over. */
export const statsKey = (mode: Mode, hard: boolean, track: Track = "daily") =>
  track === "daily" ? `stats:${mode}:${diff(hard)}` : `stats:${track}:${mode}:${diff(hard)}`;

export const daysKey = (hard: boolean) => `days:${diff(hard)}`;

const bucketOf = (guesses: number) => (guesses >= 10 ? "10+" : String(guesses));

function tally(s: Stats, won: boolean, guesses: number) {
  s.played++;
  if (won) {
    s.won++;
    s.dist[bucketOf(guesses)] = (s.dist[bucketOf(guesses)] ?? 0) + 1;
  } else {
    s.dist.X = (s.dist.X ?? 0) + 1;
  }
}

/** Result of recording a finished round, for the end card. */
export type StreakResult = { streak: number; best: number; newBest: boolean; track: Track };

export function recordDaily(mode: Mode, hard: boolean, date: string, won: boolean, guesses: number): StreakResult {
  const s = load<Stats>(statsKey(mode, hard), emptyStats());
  if (s.lastDate !== date) {
    tally(s, won, guesses);
    if (won) {
      s.streak = s.lastWonDate === addDay(date, -1) ? s.streak + 1 : 1;
      s.lastWonDate = date;
    } else {
      s.streak = 0;
    }
    const newBest = s.streak > s.maxStreak;
    s.maxStreak = Math.max(s.maxStreak, s.streak);
    s.lastDate = date;
    save(statsKey(mode, hard), s);

    const days = load<Record<string, DayRecord>>(daysKey(hard), {});
    const day = days[date] ?? { played: [], won: [] };
    if (!day.played.includes(mode)) day.played.push(mode);
    if (won && !day.won.includes(mode)) day.won.push(mode);
    days[date] = day;
    const keep = Object.keys(days).sort().slice(-400);
    save(daysKey(hard), Object.fromEntries(keep.map((k) => [k, days[k]])));
    return { streak: s.streak, best: s.maxStreak, newBest: newBest && s.streak > 1, track: "daily" };
  }
  return { streak: s.streak, best: s.maxStreak, newBest: false, track: "daily" };
}

export function recordEndless(mode: Mode, hard: boolean, won: boolean, guesses: number): StreakResult {
  const s = load<Stats>(statsKey(mode, hard, "endless"), emptyStats());
  tally(s, won, guesses);
  s.streak = won ? s.streak + 1 : 0;
  const newBest = s.streak > s.maxStreak;
  s.maxStreak = Math.max(s.maxStreak, s.streak);
  save(statsKey(mode, hard, "endless"), s);
  return { streak: s.streak, best: s.maxStreak, newBest: newBest && s.streak > 1, track: "endless" };
}

export function recordArchive(mode: Mode, hard: boolean, date: string, won: boolean, guesses: number): StreakResult {
  const s = load<Stats>(statsKey(mode, hard, "archive"), emptyStats());
  const seen = s.seen ?? [];
  if (seen.includes(date)) return { streak: s.streak, best: s.maxStreak, newBest: false, track: "archive" };
  tally(s, won, guesses);
  s.streak = won ? s.streak + 1 : 0;
  const newBest = s.streak > s.maxStreak;
  s.maxStreak = Math.max(s.maxStreak, s.streak);
  s.lastDate = date;
  s.seen = [...seen, date].slice(-1000);
  save(statsKey(mode, hard, "archive"), s);
  return { streak: s.streak, best: s.maxStreak, newBest: newBest && s.streak > 1, track: "archive" };
}

/** Streak to show right now for a track (a daily streak lapses after a missed day). */
export function shownStreak(s: Stats, track: Track, today: string | null): number {
  return track === "daily" ? liveDailyStreak(s.streak, s.lastWonDate, today) : s.streak;
}

/** Endless answers we've seen recently, so they don't repeat too soon. */
export const recentKey = (mode: Mode, hard: boolean) => `recent:${mode}:${diff(hard)}`;
