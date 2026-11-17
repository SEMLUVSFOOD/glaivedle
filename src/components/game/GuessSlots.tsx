import { Check, SkipForward, X } from "lucide-react";
import type { GuessEntry } from "@/lib/game/types";

export function GuessSlots({ guesses, max }: { guesses: GuessEntry[]; max: number }) {
  return (
    <ol className="grid gap-1.5">
      {Array.from({ length: max }, (_, i) => {
        const g = guesses[i];
        if (!g) {
          return <li key={i} className="h-11 rounded-lg border border-dashed border-line" aria-label={`Guess ${i + 1} empty`} />;
        }
        const tone = g.correct ? "border-ok bg-ok/20" : g.id === null ? "border-line bg-surface" : "border-bad/70 bg-bad/15";
        return (
          <li key={i} className={`fade-up flex h-11 items-center gap-3 rounded-lg border px-3 text-sm ${tone}`}>
            {g.correct ? (
              <Check size={16} className="shrink-0 text-ok-2" />
            ) : g.id === null ? (
              <SkipForward size={16} className="shrink-0 text-faint" />
            ) : (
              <X size={16} className="shrink-0 text-[#e0625a]" />
            )}
            <span className={`truncate ${g.id === null ? "text-faint italic" : ""}`}>{g.title}</span>
          </li>
        );
      })}
    </ol>
  );
}
