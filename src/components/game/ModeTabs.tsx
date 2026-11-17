"use client";
import Link from "next/link";
import { useStreak } from "@/components/Streaks";
import { type Kind, MODE_INFO, MODES, type Mode } from "@/lib/game/types";
import { useDailyStatus } from "../Home";

/** Where a mode tab leads: stay in the same kind of game (endless stays endless, archive keeps the date). */
export function modeHref(mode: Mode, kind: Kind = "daily", date?: string | null) {
  if (kind === "endless") return `/${mode}?endless=1`;
  if (kind === "archive" && date) return `/${mode}?d=${date}`;
  return `/${mode}`;
}

function Tab({ mode, active, kind, date }: { mode: Mode; active: boolean; kind: Kind; date?: string | null }) {
  const s = useDailyStatus(mode);
  const { streak } = useStreak(mode, kind);
  // daily: today's result; endless/archive: the running streak for that kind
  const tag = kind === "daily" ? s.tag : String(streak);
  return (
    <Link
      href={modeHref(mode, kind, date)}
      aria-current={active ? "page" : undefined}
      title={kind === "daily" ? `${MODE_INFO[mode].title}: ${s.label}` : `${MODE_INFO[mode].title}: ${kind} streak ${streak}`}
      className={`nav-link inline-flex shrink-0 items-start rounded-[10px] px-1 py-1 text-[clamp(16px,4.7vw,28px)]! no-underline sm:px-2 ${active ? "pill" : "hoverable"}`}
    >
      <span className={active ? "" : "u"}>{MODE_INFO[mode].title}</span>
      <sup className="caption ml-[0.15em]! text-[11px]! sm:ml-[0.3em]! sm:text-[12.5px]!">[{tag}]</sup>
    </Link>
  );
}

export function ModeTabs({ current, kind = "daily", date }: { current: Mode; kind?: Kind; date?: string | null }) {
  return (
    <nav
      className="no-scrollbar -mx-1 mb-5 flex justify-between gap-x-0.5 overflow-x-auto sm:mb-6 sm:justify-start sm:gap-x-6"
      aria-label="Game modes"
    >
      {MODES.map((m) => (
        <Tab key={m} mode={m} active={m === current} kind={kind} date={date} />
      ))}
    </nav>
  );
}
