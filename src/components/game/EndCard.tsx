"use client";
import Link from "next/link";
import { useState } from "react";
import { load, roundKey, type SavedRound } from "@/lib/client/storage";
import { shareText } from "@/lib/client/share";
import { MODE_INFO, MODES, type GuessEntry, type RoundView } from "@/lib/game/types";
import { Countdown } from "../Countdown";
import { useApp } from "../Providers";

export function EndCard({ round, guesses, onNextEndless }: { round: RoundView; guesses: GuessEntry[]; onNextEndless: () => void }) {
  const { meta, hard } = useApp();
  const [copied, setCopied] = useState(false);
  const a = round.answer;

  const share = async () => {
    const text = shareText(round, guesses, window.location.host);
    try {
      if (navigator.share && window.matchMedia("(pointer: coarse)").matches) {
        await navigator.share({ text });
        return;
      }
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* cancelled */
    }
  };

  const nextMode =
    meta && MODES.find((m) => m !== round.mode && !load<SavedRound | null>(roundKey(m, hard, "daily", meta.today), null)?.round.finished);

  const verdict = round.won ? (guesses.length === 1 ? "first try, blessed" : `got it in ${guesses.length}`) : "not this time";

  return (
    <section className="arrive space-y-6" aria-live="polite">
      <div className="grid gap-5 sm:grid-cols-[auto_1fr] sm:items-end">
        {a?.cover && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={a.cover.replace("1000x1000", "500x500")} alt="" className="aspect-square w-44 object-cover sm:w-56" />
        )}
        <div className="min-w-0">
          <p className={`script mb-1 text-[52px] leading-[0.9] sm:text-[66px] ${round.won ? "text-ok" : "text-bad"}`}>{verdict}</p>
          <h2 className="headline break-words">{a?.title ?? "—"}</h2>
        </div>
      </div>

      <dl className="small grid grid-cols-[6rem_1fr] gap-y-1">
        {a?.project && a.project !== a.title && (
          <>
            <dt>Project</dt>
            <dd className="text-fg-hover">{a.project}</dd>
          </>
        )}
        <dt>Type</dt>
        <dd className="text-fg-hover">{a?.type}</dd>
        {a?.year && (
          <>
            <dt>Year</dt>
            <dd className="text-fg-hover">{a.year}</dd>
          </>
        )}
        {typeof round.solvers === "number" && round.kind === "daily" && (
          <>
            <dt>Solved by</dt>
            <dd className="text-fg-hover">
              {round.solvers} {round.solvers === 1 ? "person" : "people"} today
            </dd>
          </>
        )}
        <dt>Listen</dt>
        <dd className="flex gap-4">
          {a?.deezerUrl && (
            <a href={a.deezerUrl} target="_blank" rel="noopener noreferrer">
              Deezer →
            </a>
          )}
          {a?.geniusUrl && (
            <a href={a.geniusUrl} target="_blank" rel="noopener noreferrer">
              Genius →
            </a>
          )}
        </dd>
      </dl>

      <div className="grid gap-2 sm:grid-cols-2">
        <button type="button" onClick={share} className="btn btn-fill">
          {copied ? "Copied" : "Share result"}
        </button>
        {round.kind === "endless" ? (
          <button type="button" onClick={onNextEndless} className="btn">
            Next song →
          </button>
        ) : round.kind === "daily" ? (
          <Link href={`/${round.mode}?endless=1`} className="btn">
            Endless {MODE_INFO[round.mode].title.toLowerCase()} →
          </Link>
        ) : (
          <Link href="/archive" className="btn">
            Back to archive
          </Link>
        )}
      </div>

      <div className="small space-y-1">
        {nextMode && round.kind === "daily" && (
          <p>
            <Link href={`/${nextMode}`}>Next up: {MODE_INFO[nextMode].title} →</Link>
          </p>
        )}
        {round.kind === "daily" && (
          <p className="flex items-center gap-2">
            New {MODE_INFO[round.mode].title.toLowerCase()} in <Countdown className="caption" />
          </p>
        )}
        <p>
          <Link href="/suggest">Want this for another artist? Suggest one →</Link>
        </p>
      </div>
    </section>
  );
}
