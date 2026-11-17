"use client";
import Link from "next/link";
import { MODE_INFO, MODES, type Mode } from "@/lib/game/types";
import { useDailyStatus } from "../Home";

function Tab({ mode, active }: { mode: Mode; active: boolean }) {
  const s = useDailyStatus(mode);
  return (
    <Link
      href={`/${mode}`}
      aria-current={active ? "page" : undefined}
      className={`nav-link inline-flex shrink-0 items-start rounded-[10px] px-1.5 py-1 no-underline sm:px-2 ${active ? "pill" : "hoverable"}`}
    >
      <span className={active ? "" : "u"}>{MODE_INFO[mode].title}</span>
      <sup className="caption">[{s.tag}]</sup>
    </Link>
  );
}

export function ModeTabs({ current }: { current: Mode }) {
  return (
    <nav className="no-scrollbar -mx-1.5 mb-8 flex gap-x-1 overflow-x-auto sm:mb-12 sm:gap-x-6" aria-label="Game modes">
      {MODES.map((m) => (
        <Tab key={m} mode={m} active={m === current} />
      ))}
    </nav>
  );
}
