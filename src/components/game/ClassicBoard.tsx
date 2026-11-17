"use client";
import { ArrowDown, ArrowUp } from "lucide-react";
import type { GuessEntry } from "@/lib/game/types";

const LABELS: Record<string, string> = {
  project: "Project",
  type: "Type",
  year: "Year",
  collabs: "Collabs",
  producers: "Producers",
  length: "Length",
  track: "Track #",
};

export function ClassicBoard({ guesses }: { guesses: GuessEntry[] }) {
  if (!guesses.length) {
    return (
      <div className="panel arch gilded px-6 pt-12 pb-8 text-center">
        <p className="font-serif text-2xl italic text-gold-2">Which song is it today?</p>
        <p className="mt-2 text-sm text-muted">
          Guess any glaive song. Each tile shows how close you are — green is right, orange is close, red is off.
        </p>
      </div>
    );
  }
  const keys = guesses[guesses.length - 1].cells?.map((c) => c.key) ?? Object.keys(LABELS);
  const rows = [...guesses].reverse();

  return (
    <div className="relative">
    <p className="mb-1 text-right text-[11px] text-faint sm:hidden" aria-hidden>
      Swipe for more →
    </p>
    <div className="-mx-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0" role="table" aria-label="Your guesses">
      <div className="inline-flex min-w-full flex-col gap-2">
        <div className="flex gap-1.5 sm:gap-2" role="row">
          {["Song", ...keys.map((k) => LABELS[k] ?? k)].map((l) => (
            <div
              key={l}
              role="columnheader"
              className="tile h-auto! rounded-none! border-0! border-b-2 border-gold/60! bg-transparent! pb-1 text-[10px]! uppercase tracking-wider text-muted! shadow-none! sm:text-[11px]!"
            >
              {l}
            </div>
          ))}
        </div>
        {rows.map((g, ri) => (
          <div key={`${g.id}-${ri}`} className="flex gap-1.5 sm:gap-2" role="row">
            <div
              className={`tile relative p-0! ${g.correct ? "ring-2 ring-gold-2" : ""}`}
              role="cell"
              title={g.title}
            >
              {g.cover && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={g.cover.replace("1000x1000", "250x250")} alt="" className="absolute inset-0 size-full object-cover" />
              )}
              <span className="absolute inset-x-0 bottom-0 line-clamp-2 bg-linear-to-t from-black/90 to-black/10 px-1 pt-3 pb-1 text-[10px] leading-tight sm:text-[11px]">
                {g.title}
              </span>
            </div>
            {g.cells?.map((c, i) => (
              <div
                key={c.key}
                role="cell"
                className={`tile tile-${c.verdict} ${ri === 0 ? "flip-in" : ""}`}
                style={ri === 0 ? { animationDelay: `${i * 110}ms` } : undefined}
                title={`${LABELS[c.key] ?? c.key}: ${c.value}`}
              >
                <span className="line-clamp-3">{c.value}</span>
                {c.dir === "up" && <ArrowUp size={16} strokeWidth={3} className="mt-0.5 opacity-90" aria-label="higher" />}
                {c.dir === "down" && <ArrowDown size={16} strokeWidth={3} className="mt-0.5 opacity-90" aria-label="lower" />}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
    </div>
  );
}
