"use client";
import Link from "next/link";
import { roundKey, type SavedRound } from "@/lib/client/storage";
import { MODE_INFO, MODES, type Mode } from "@/lib/game/types";
import { ModeIcon } from "../ModeIcon";
import { useApp, useStored } from "../Providers";

function Dot({ mode }: { mode: Mode }) {
  const { meta, hard } = useApp();
  const saved = useStored<SavedRound | null>(roundKey(mode, hard, "daily", meta?.today ?? "x"), null);
  if (!saved?.round.finished) return null;
  return (
    <span
      className={`absolute top-1.5 right-1.5 size-2 rounded-full ${saved.round.won ? "bg-ok-2" : "bg-bad"}`}
      aria-label={saved.round.won ? "solved" : "failed"}
    />
  );
}

export function ModeTabs({ current }: { current: Mode }) {
  return (
    <nav className="mb-4 grid grid-cols-4 gap-1.5 rounded-2xl border border-line bg-surface/60 p-1.5" aria-label="Game modes">
      {MODES.map((m) => {
        const active = m === current;
        return (
          <Link
            key={m}
            href={`/${m}`}
            aria-current={active ? "page" : undefined}
            className={`relative flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-xl text-[11px] font-semibold transition sm:flex-row sm:gap-2 sm:text-sm ${
              active ? "bg-linear-to-b from-gold-2 to-gold text-[#24170c] shadow" : "text-muted hover:bg-gold/10 hover:text-ivory"
            }`}
          >
            <ModeIcon mode={m} size={18} />
            {MODE_INFO[m].title}
            <Dot mode={m} />
          </Link>
        );
      })}
    </nav>
  );
}
