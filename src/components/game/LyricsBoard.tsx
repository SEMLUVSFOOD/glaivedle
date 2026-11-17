import type { RoundView } from "@/lib/game/types";

export function LyricsBoard({ round }: { round: RoundView }) {
  const lines = round.reveal.lines ?? [];
  const total = round.reveal.totalLines ?? 6;
  return (
    <ol className="space-y-2.5">
      {Array.from({ length: total }, (_, i) => (
        <li key={i} className="grid grid-cols-[2rem_1fr] items-baseline gap-3">
          <span className="caption">0{i + 1}</span>
          {lines[i] ? (
            <p className={`reveal font-serif text-[23px] leading-[1.15] tracking-[-0.03em] italic sm:text-[30px] ${i === lines.length - 1 && !round.finished ? "text-fg-hover" : ""}`}>
              {lines[i]}
            </p>
          ) : (
            <span className="caption text-faint" aria-hidden>
              ········································
            </span>
          )}
        </li>
      ))}
    </ol>
  );
}
