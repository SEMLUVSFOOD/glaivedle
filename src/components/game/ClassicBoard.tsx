"use client";
import type { GuessEntry } from "@/lib/game/types";
import { useApp } from "../Providers";

const LABELS: Record<string, [string, string]> = {
  // [mobile, desktop]
  project: ["PROJ.", "PROJECT"],
  type: ["TYPE", "TYPE"],
  year: ["YEAR", "YEAR"],
  collabs: ["FEAT.", "COLLABS"],
  producers: ["PROD.", "PRODUCERS"],
  length: ["LEN.", "LENGTH"],
  track: ["#", "TRACK"],
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
  const cols = keys.length + 1;

  return (
    <div
      className="grid w-full gap-[3px] sm:gap-1.5"
      style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, maxWidth: cols * 92 }}
      role="table"
      aria-label={`Your ${guesses.length} guesses`}
    >
      <div className="contents" role="row">
        {[["SONG", "SONG"] as [string, string], ...keys.map((k) => LABELS[k] ?? [k, k])].map(([m, d]) => (
          <div key={d} role="columnheader" className="caption truncate pb-1 text-[9px] sm:text-[11px]">
            <span className="sm:hidden">{m}</span>
            <span className="hidden sm:inline">{d}</span>
          </div>
        ))}
      </div>
      {rows.map((g, ri) => (
        <div key={`${g.id}-${ri}`} className="contents" role="row">
          <div className={`tile tile-fluid relative p-0! ${covers ? "" : "tile-unknown"}`} role="cell" title={g.title}>
            {covers && g.cover && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={g.cover.replace("1000x1000", "250x250")} alt="" className="absolute inset-0 size-full object-cover" />
            )}
            <span
              className={`absolute inset-x-0 bottom-0 line-clamp-3 px-[3px] py-[2px] text-left leading-[1.05] font-medium ${
                covers ? "bg-black/60 text-white" : "text-fg-hover"
              }`}
            >
              {g.title}
            </span>
          </div>
          {g.cells?.map((c, i) => (
            <div
              key={c.key}
              role="cell"
              className={`tile tile-fluid tile-${c.verdict} ${ri === 0 ? "reveal" : ""}`}
              style={ri === 0 ? { animationDelay: `${i * 90}ms` } : undefined}
              title={`${LABELS[c.key]?.[1] ?? c.key}: ${c.value}`}
            >
              <span className="line-clamp-4">{c.value}</span>
              {c.dir && (
                <span className="text-[1.35em] leading-none" aria-label={c.dir === "up" ? "higher" : "lower"}>
                  {c.dir === "up" ? "↑" : "↓"}
                </span>
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
