import type { GuessEntry } from "@/lib/game/types";

export function GuessSlots({ guesses, max }: { guesses: GuessEntry[]; max: number }) {
  return (
    <ol className="small">
      {Array.from({ length: max }, (_, i) => {
        const g = guesses[i];
        return (
          <li key={i} className={`grid grid-cols-[2rem_1fr_auto] items-baseline gap-3 py-[7px] ${g ? "arrive" : "text-faint"}`}>
            <span className="caption">0{i + 1}</span>
            {g ? (
              <>
                <span className={`truncate text-[17px] tracking-[-0.03em] ${g.correct ? "text-ok" : g.id === null ? "text-soft italic" : "text-fg-hover line-through decoration-bad/70"}`}>
                  {g.title}
                </span>
                <span className={g.correct ? "text-ok" : g.id === null ? "" : "text-bad"}>
                  {g.correct ? "Correct" : g.id === null ? "Skipped" : "Wrong"}
                </span>
              </>
            ) : (
              <>
                <span className="border-b border-dotted border-faint" />
                <span />
              </>
            )}
          </li>
        );
      })}
    </ol>
  );
}
