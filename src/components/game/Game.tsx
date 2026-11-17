"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { useRound } from "@/lib/client/useRound";
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
import { PlayBar } from "./PlayBar";
import { StreakTag } from "../Streaks";

const pad = (n: number) => String(n).padStart(3, "0");

function shortDate(d: string) {
  const date = new Date(d + "T12:00:00Z");
  return `${String(date.getUTCMonth() + 1).padStart(2, "0")}.${String(date.getUTCDate()).padStart(2, "0")} ${date.toLocaleDateString("en-GB", { weekday: "short", timeZone: "UTC" })}`;
}

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
  const skipLabel = step < clips.length - 1 ? `Skip +${clips[step + 1] - clips[step]}s` : "Give up";
  const date = round?.date ?? meta?.today;
  const number = round?.number ?? meta?.number;

  return (
    <div>
      <ModeTabs current={mode} kind={kind} date={kind === "archive" ? d : null} />
      <PlayBar mode={mode} kind={kind} />

      <div className="mb-8 flex items-start justify-between gap-4">
        <h1 className="headline flex items-start gap-2">
          {kind === "endless" ? "Endless" : `${kind === "archive" ? "Archive" : "Daily"} ${number ? pad(number) : "···"}`}
          <span className="sq mt-[0.12em]" />
        </h1>
        <div className="small shrink-0 pt-1 text-right">
          <p>{kind === "endless" ? "∞ rounds" : date ? shortDate(date) : ""}</p>
          {hard && <p className="text-fg-hover">Hard</p>}
          <p>
            <StreakTag mode={mode} track={kind} />
          </p>
        </div>
      </div>

      {status === "loading" && <p className="small blink">Loading</p>}

      {status === "locked" && (
        <div className="max-w-lg space-y-4">
          <p className="script text-[60px] leading-[0.9]">locked</p>
          <p className="text-[19px] leading-snug tracking-[-0.03em]">
            Finish today&apos;s {MODE_INFO[mode].title.toLowerCase()} daily{hard ? " on hard" : ""} first, then play as many rounds as
            you like.
          </p>
          <Link href={`/${mode}`} className="btn btn-fill">
            Play today&apos;s daily
          </Link>
        </div>
      )}

      {status === "error" && (
        <div className="small space-y-3">
          <p>{error}</p>
          <button type="button" onClick={() => void restart()} className="hoverable underline underline-offset-4">
            Try again →
          </button>
        </div>
      )}

      {status === "ready" && round && (
        <div className="space-y-8">
          {round.finished && (
            <EndCard round={round} guesses={guesses} streak={saved.streak} onNextEndless={() => void restart()} />
          )}

          {mode === "lyrics" && <LyricsBoard round={round} />}
          {mode === "audio" && <AudioBoard round={round} />}
          {mode === "cover" && <CoverBoard round={round} />}

          {!round.finished && (
            <div key={shakeKey} className={`max-w-2xl ${shakeKey ? "shake" : ""}`}>
              <GuessInput
                mode={mode}
                hard={hard}
                exclude={exclude}
                disabled={busy}
                onGuess={(id) => void onGuess(id)}
                onSkip={mode === "audio" ? () => void onGuess(null) : undefined}
                skipLabel={skipLabel}
              />
              {error && <p className="small mt-2 text-bad">{error}</p>}
            </div>
          )}

          {mode === "classic" ? (
            <ClassicBoard guesses={guesses} />
          ) : (
            <div className="max-w-2xl">
              <GuessSlots guesses={guesses} max={max ?? 6} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
