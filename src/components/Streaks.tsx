"use client";
import { daysKey, emptyStats, shownStreak, type Stats, statsKey, type Track } from "@/lib/client/storage";
import { bestDays, consecutiveDays, type DayRecord, playedAny, sweptAll } from "@/lib/game/streaks";
import { type Kind, MODES, type Mode } from "@/lib/game/types";
import { useApp, useStored } from "./Providers";

export const trackOf = (kind: Kind): Track => kind;

export const TRACK_INFO: Record<Track, { title: string; streakHint: string }> = {
  daily: { title: "Daily", streakHint: "days in a row solved" },
  endless: { title: "Endless", streakHint: "rounds in a row solved" },
  archive: { title: "Archive", streakHint: "past days in a row solved" },
};

/** Current + best streak for one mode/track/difficulty. */
export function useStreak(mode: Mode, track: Track, hard?: boolean) {
  const app = useApp();
  const h = hard ?? app.hard;
  const s = useStored<Stats>(statsKey(mode, h, track), emptyStats());
  return { stats: s, streak: shownStreak(s, track, app.meta?.today ?? null), best: s.maxStreak };
}

/** Cross-mode daily streaks: days with at least one daily finished, and days with all four won. */
export function useDayStreaks(hard?: boolean) {
  const app = useApp();
  const h = hard ?? app.hard;
  const days = useStored<Record<string, DayRecord>>(daysKey(h), {});
  const today = app.meta?.today ?? null;
  const sweep = sweptAll(MODES.length);
  const todayRec = today ? days[today] : undefined;
  return {
    days: consecutiveDays(days, today, playedAny),
    bestDays: bestDays(days, playedAny),
    sweep: consecutiveDays(days, today, sweep),
    bestSweep: bestDays(days, sweep),
    playedToday: !!todayRec && playedAny(todayRec),
    sweptToday: !!todayRec && sweep(todayRec),
  };
}

/** Compact "Streak [3]" label used in headers. */
export function StreakTag({ mode, track, className = "" }: { mode: Mode; track: Track; className?: string }) {
  const { streak, best } = useStreak(mode, track);
  return (
    <span className={`whitespace-nowrap ${className}`} title={`${TRACK_INFO[track].title} streak – ${TRACK_INFO[track].streakHint}. Best: ${best}`}>
      Streak
      <sup className="caption">[{streak}]</sup>
      {best > 0 && <span className="text-soft"> best {best}</span>}
    </span>
  );
}
