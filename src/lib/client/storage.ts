"use client";
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

export type SavedRound = { round: RoundView; guesses: GuessEntry[] };

const diff = (hard: boolean) => (hard ? "hard" : "normal");

export const roundKey = (mode: Mode, hard: boolean, kind: Kind, date: string | null) =>
  `round:${mode}:${diff(hard)}:${kind === "endless" ? "endless" : date}`;

export const proofKey = (mode: Mode, hard: boolean) => `proof:${mode}:${diff(hard)}`;

// ── Stats (daily only) ──────────────────────────────────────────────────

export type Stats = {
  played: number;
  won: number;
  streak: number;
  maxStreak: number;
  lastDate: string | null;
  lastWonDate: string | null;
  dist: Record<string, number>;
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

export const statsKey = (mode: Mode, hard: boolean) => `stats:${mode}:${diff(hard)}`;

function prevDay(date: string) {
  const d = new Date(date + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

export function recordDaily(mode: Mode, hard: boolean, date: string, won: boolean, guesses: number) {
  const s = load<Stats>(statsKey(mode, hard), emptyStats());
  if (s.lastDate === date) return s; // already counted
  s.played++;
  if (won) {
    s.won++;
    s.streak = s.lastWonDate === prevDay(date) ? s.streak + 1 : 1;
    s.maxStreak = Math.max(s.maxStreak, s.streak);
    s.lastWonDate = date;
    const bucket = guesses >= 10 ? "10+" : String(guesses);
    s.dist[bucket] = (s.dist[bucket] ?? 0) + 1;
  } else {
    s.streak = 0;
    s.dist.X = (s.dist.X ?? 0) + 1;
  }
  s.lastDate = date;
  save(statsKey(mode, hard), s);
  return s;
}

/** Endless answers we've seen recently, so they don't repeat too soon. */
export const recentKey = (mode: Mode, hard: boolean) => `recent:${mode}:${diff(hard)}`;
