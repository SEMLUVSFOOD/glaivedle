/** Pure streak maths — no storage, unit tested. Dates are YYYY-MM-DD in the daily timezone. */

export function addDay(date: string, n: number): string {
  const d = new Date(date + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/**
 * A daily streak is still "alive" while its last win was today or yesterday
 * (you still have today to keep it going). Otherwise it has lapsed to 0.
 */
export function liveDailyStreak(streak: number, lastWonDate: string | null, today: string | null): number {
  if (!lastWonDate || !today || !streak) return 0;
  return lastWonDate === today || lastWonDate === addDay(today, -1) ? streak : 0;
}

/** Counts consecutive days (ending today, or yesterday if today isn't done yet) that pass `ok`. */
export function consecutiveDays(days: Record<string, DayRecord>, today: string | null, ok: (d: DayRecord) => boolean): number {
  if (!today) return 0;
  let day = days[today] && ok(days[today]) ? today : addDay(today, -1);
  let n = 0;
  while (days[day] && ok(days[day])) {
    n++;
    day = addDay(day, -1);
  }
  return n;
}

/** Longest run of consecutive days passing `ok`. */
export function bestDays(days: Record<string, DayRecord>, ok: (d: DayRecord) => boolean): number {
  const dates = Object.keys(days)
    .filter((d) => ok(days[d]))
    .sort();
  let best = 0;
  let run = 0;
  let prev: string | null = null;
  for (const d of dates) {
    run = prev && addDay(prev, 1) === d ? run + 1 : 1;
    best = Math.max(best, run);
    prev = d;
  }
  return best;
}

/** Per-day summary of the dailies: which modes were finished and which were won. */
export type DayRecord = { played: string[]; won: string[] };

export const playedAny = (d: DayRecord) => d.played.length > 0;
export const sweptAll = (total: number) => (d: DayRecord) => d.won.length >= total;
