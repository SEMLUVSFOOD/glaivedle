"use client";
import type { GuessEntry } from "@/lib/game/types";
import { useApp } from "../Providers";

const LABELS: Record<string, string> = {
  project: "PROJECT",
  type: "TYPE",
  year: "YEAR",
  collabs: "COLLABS",
  producers: "PROD.",
  length: "LENGTH",
  track: "TRACK",
};

export function ClassicBoard({ guesses }: { guesses: GuessEntry[] }) {
  const { covers } = useApp();
  if (!guesses.length) {
    return (
      <p className="small max-w-md">
        Guess any glaive song. Each tile compares it with today&apos;s answer – green is right, orange is close, red is off, arrows
        point towards the answer.
      </p>
    );
  }
  const keys = guesses[guesses.length - 1].cells?.map((c) => c.key) ?? Object.keys(LABELS);
  const rows = [...guesses].reverse();

  return (
    <div>
      <p className="small mb-2 flex items-center justify-between sm:hidden">
        <span>
          {guesses.length} guess{guesses.length === 1 ? "" : "es"}
        </span>
        <span>Swipe →</span>
      </p>
      <div className="no-scrollbar -mx-[var(--margin)] overflow-x-auto px-[var(--margin)] pb-2" role="table" aria-label="Your guesses">
        <div className="inline-flex flex-col gap-1.5">
          <div className="flex gap-1.5" role="row">
            {["SONG", ...keys.map((k) => LABELS[k] ?? k)].map((l) => (
              <div key={l} role="columnheader" className="caption w-[var(--tile)] pb-1 text-[11px] [--tile:4.1rem] sm:[--tile:5.4rem]">
                {l}
              </div>
            ))}
          </div>
          {rows.map((g, ri) => (
            <div key={`${g.id}-${ri}`} className="flex gap-1.5" role="row">
              <div className={`tile relative p-0! text-left ${covers ? "" : "tile-unknown"}`} role="cell" title={g.title}>
                {covers && g.cover && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={g.cover.replace("1000x1000", "250x250")} alt="" className="absolute inset-0 size-full object-cover" />
                )}
                <span className={`absolute inset-x-0 bottom-0 line-clamp-3 px-1 py-0.5 text-[10px] leading-tight font-medium sm:text-[11px] ${covers ? "bg-black/55 text-white" : "text-fg-hover"}`}>
                  {g.title}
                </span>
              </div>
              {g.cells?.map((c, i) => (
                <div
                  key={c.key}
                  role="cell"
                  className={`tile tile-${c.verdict} ${ri === 0 ? "reveal" : ""}`}
                  style={ri === 0 ? { animationDelay: `${i * 90}ms` } : undefined}
                  title={`${LABELS[c.key] ?? c.key}: ${c.value}`}
                >
                  <span className="line-clamp-3">{c.value}</span>
                  {c.dir && (
                    <span className="mt-0.5 text-[15px] leading-none" aria-label={c.dir === "up" ? "higher" : "lower"}>
                      {c.dir === "up" ? "↑" : "↓"}
                    </span>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
