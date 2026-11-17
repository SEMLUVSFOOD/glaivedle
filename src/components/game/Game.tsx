"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { CalendarDays, Infinity as InfinityIcon, Lock, Skull } from "lucide-react";
import { useRound } from "@/lib/client/useRound";
import { formatPrettyDate } from "@/lib/dates";
import { AUDIO_CLIPS, AUDIO_CLIPS_HARD } from "@/lib/game/logic";
import { type Kind, MODE_INFO, type Mode } from "@/lib/game/types";
import { useApp } from "../Providers";
import { AudioBoard } from "./AudioBoard";
import { ClassicBoard } from "./ClassicBoard";
import { CoverBoard } from "./CoverBoard";
import { EndCard } from "./EndCard";
import { GuessInput } from "./GuessInput";
import { GuessSlots } from "./GuessSlots";
import { LyricsBoard } from "./LyricsBoard";
import { ModeTabs } from "./ModeTabs";

export function Game({ mode }: { mode: Mode }) {
  const params = useSearchParams();
  const { meta } = useApp();
  const d = params.get("d");
  const kind: Kind = params.get("endless") ? "endless" : d && meta && d !== meta.today ? "archive" : "daily";
  const { status, saved, error, busy, guess, restart, hard } = useRound(mode, kind, d);
  const [shakeKey, setShakeKey] = useState(0);

  const round = saved?.round;
  const guesses = useMemo(() => saved?.guesses ?? [], [saved]);
  const exclude = useMemo(() => new Set(guesses.map((g) => g.id).filter((x): x is number => x !== null)), [guesses]);
  const max = MODE_INFO[mode].maxGuesses;

  const onGuess = async (id: number | null) => {
    const entry = await guess(id);
    if (entry && !entry.correct) setShakeKey((k) => k + 1);
  };

  const clips = hard ? AUDIO_CLIPS_HARD : AUDIO_CLIPS;
  const step = round?.step ?? 0;
  const skipLabel = step < clips.length - 1 ? `+${clips[step + 1] - clips[step]}s` : "Give up";

  return (
    <div>
      <ModeTabs current={mode} />

      <div className="mb-4 flex items-center gap-2">
        <div className="min-w-0 flex-1">
          <h1 className="font-serif text-[1.7rem] leading-none font-bold sm:text-3xl">
            {kind === "endless" ? (
              <span className="flex items-center gap-2">
                Endless <InfinityIcon size={24} className="text-gold" aria-hidden />
              </span>
            ) : (
              <>
                {kind === "archive" ? "Archive" : "Daily"}{" "}
                <span className="gold-text">#{round?.number ?? meta?.number ?? "…"}</span>
              </>
            )}
          </h1>
          <p className="mt-1 flex items-center gap-1.5 text-xs text-faint">
            {MODE_INFO[mode].blurb}
            {kind !== "endless" && (round?.date ?? meta?.today) ? ` · ${formatPrettyDate((round?.date ?? meta?.today)!)}` : ""}
            {hard && (
              <span className="inline-flex items-center gap-1 rounded-full bg-gold/15 px-1.5 py-0.5 text-gold-2">
                <Skull size={11} aria-hidden /> hard
              </span>
            )}
          </p>
        </div>
        {kind === "endless" ? (
          <Link href={`/${mode}`} className="btn btn-ghost h-9 min-h-9 px-3 text-xs">
            <CalendarDays size={14} aria-hidden /> Daily
          </Link>
        ) : kind === "daily" ? (
          <Link href={`/${mode}?endless=1`} className="btn btn-ghost h-9 min-h-9 px-3 text-xs">
            <InfinityIcon size={15} aria-hidden /> Endless
          </Link>
        ) : (
          <Link href={`/${mode}`} className="btn btn-ghost h-9 min-h-9 px-3 text-xs">
            Today
          </Link>
        )}
      </div>

      {status === "loading" && <Skeleton />}

      {status === "locked" && (
        <div className="panel arch gilded px-6 pt-14 pb-8 text-center">
          <Lock className="mx-auto mb-3 text-gold" size={30} aria-hidden />
          <h2 className="font-serif text-2xl font-semibold">Endless is locked</h2>
          <p className="mx-auto mt-2 max-w-xs text-sm text-muted">
            Finish today&apos;s {MODE_INFO[mode].title.toLowerCase()} daily{hard ? " (hard)" : ""} first, then play as many rounds as you
            like.
          </p>
          <Link href={`/${mode}`} className="btn btn-gold mt-5">
            Play today&apos;s daily
          </Link>
        </div>
      )}

      {status === "error" && (
        <div className="panel p-6 text-center">
          <p className="text-muted">{error}</p>
          <button type="button" onClick={() => void restart()} className="btn btn-ghost mt-4">
            Try again
          </button>
        </div>
      )}

      {status === "ready" && round && (
        <div className="space-y-4">
          {round.finished && (
            <EndCard round={round} guesses={guesses} onNextEndless={() => void restart()} />
          )}

          {mode === "lyrics" && <LyricsBoard round={round} />}
          {mode === "audio" && <AudioBoard round={round} />}
          {mode === "cover" && <CoverBoard round={round} />}

          {!round.finished && (
            <div key={shakeKey} className={shakeKey ? "shake" : ""}>
              <GuessInput
                mode={mode}
                hard={hard}
                exclude={exclude}
                disabled={busy}
                onGuess={(id) => void onGuess(id)}
                onSkip={mode === "audio" ? () => void onGuess(null) : undefined}
                skipLabel={skipLabel}
              />
              {error && <p className="mt-2 text-center text-sm text-[#e0625a]">{error}</p>}
              {max !== null && (
                <p className="mt-2 text-center text-xs text-faint">
                  Guess {Math.min(guesses.length + 1, max)} of {max}
                </p>
              )}
              {mode === "classic" && guesses.length > 0 && (
                <p className="mt-2 text-center text-xs text-faint">
                  {guesses.length} guess{guesses.length === 1 ? "" : "es"} so far
                </p>
              )}
            </div>
          )}

          {mode === "classic" ? <ClassicBoard guesses={guesses} /> : <GuessSlots guesses={guesses} max={max ?? 6} />}
        </div>
      )}
    </div>
  );
}

function Skeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading">
      <div className="panel arch h-56 animate-pulse" />
      <div className="h-[52px] animate-pulse rounded-xl bg-surface" />
    </div>
  );
}
