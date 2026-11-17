import { describe, expect, it } from "vitest";
import { addDay, bestDays, consecutiveDays, type DayRecord, liveDailyStreak, playedAny, sweptAll } from "./streaks";

const rec = (played: string[], won = played): DayRecord => ({ played, won });

describe("liveDailyStreak", () => {
  it("keeps a streak alive through today", () => {
    expect(liveDailyStreak(4, "2026-11-16", "2026-11-17")).toBe(4);
    expect(liveDailyStreak(4, "2026-11-17", "2026-11-17")).toBe(4);
  });
  it("lapses after a missed day", () => expect(liveDailyStreak(4, "2026-11-15", "2026-11-17")).toBe(0));
  it("handles month boundaries", () => expect(addDay("2026-03-01", -1)).toBe("2026-02-28"));
});

describe("day streaks", () => {
  const days: Record<string, DayRecord> = {
    "2026-11-10": rec(["classic"]),
    "2026-11-14": rec(["classic", "lyrics", "audio", "cover"]),
    "2026-11-15": rec(["classic", "lyrics", "audio", "cover"]),
    "2026-11-16": rec(["classic", "lyrics"], ["classic"]),
  };

  it("counts back from yesterday while today is still open", () => {
    expect(consecutiveDays(days, "2026-11-17", playedAny)).toBe(3);
  });
  it("includes today once played", () => {
    expect(consecutiveDays({ ...days, "2026-11-17": rec(["cover"]) }, "2026-11-17", playedAny)).toBe(4);
  });
  it("breaks after a gap", () => expect(consecutiveDays(days, "2026-11-19", playedAny)).toBe(0));
  it("tracks the all-four sweep", () => {
    expect(consecutiveDays(days, "2026-11-16", sweptAll(4))).toBe(2);
    expect(consecutiveDays(days, "2026-11-17", sweptAll(4))).toBe(0);
    expect(bestDays(days, sweptAll(4))).toBe(2);
  });
  it("finds the best run", () => expect(bestDays(days, playedAny)).toBe(3));
});
