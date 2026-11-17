import type { RoundView } from "@/lib/game/types";

export function LyricsBoard({ round }: { round: RoundView }) {
  const lines = round.reveal.lines ?? [];
  const total = round.reveal.totalLines ?? 6;
  return (
    <div className="panel arch gilded px-5 pt-14 pb-7 text-center sm:px-10">
      <div className="mx-auto mb-5 h-px w-24 bg-linear-to-r from-transparent via-gold to-transparent" />
      <div className="space-y-3">
        {Array.from({ length: total }, (_, i) =>
          lines[i] ? (
            <p
              key={i}
              className={`fade-up font-serif text-[1.35rem] leading-snug sm:text-2xl ${
                i === lines.length - 1 && !round.finished ? "text-ivory" : "text-ivory/75"
              } italic`}
            >
              “{lines[i]}”
            </p>
          ) : (
            <div key={i} className="mx-auto h-5 w-3/4 rounded-full bg-surface-3/60" aria-hidden />
          ),
        )}
      </div>
      <div className="mx-auto mt-6 h-px w-24 bg-linear-to-r from-transparent via-gold to-transparent" />
    </div>
  );
}
