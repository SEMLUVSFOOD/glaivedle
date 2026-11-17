"use client";
import Link from "next/link";
import { useState } from "react";
import { Check, ExternalLink, Infinity as InfinityIcon, RotateCcw, Share2, Sparkles, Users } from "lucide-react";
import { load, roundKey, type SavedRound } from "@/lib/client/storage";
import { shareText } from "@/lib/client/share";
import { MODE_INFO, MODES, type GuessEntry, type RoundView } from "@/lib/game/types";
import { Countdown } from "../Countdown";
import { useApp } from "../Providers";
import { ModeIcon } from "../ModeIcon";

export function EndCard({
  round,
  guesses,
  onNextEndless,
}: {
  round: RoundView;
  guesses: GuessEntry[];
  onNextEndless: () => void;
}) {
  const { meta, hard } = useApp();
  const [copied, setCopied] = useState(false);
  const a = round.answer;

  const share = async () => {
    const text = shareText(round, guesses, typeof window !== "undefined" ? window.location.host : "glaivedle.lol");
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
    meta &&
    MODES.find(
      (m) => m !== round.mode && !load<SavedRound | null>(roundKey(m, hard, "daily", meta.today), null)?.round.finished,
    );

  const heading = round.won
    ? guesses.length === 1
      ? "First try. Blessed."
      : `Got it in ${guesses.length}!`
    : "Not this time.";

  return (
    <section className={`panel fade-up overflow-hidden ${round.won ? "glow-win" : ""}`} aria-live="polite">
      <div className="flex flex-col items-center gap-4 px-5 pt-6 pb-5 text-center sm:flex-row sm:text-left">
        {a?.cover && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={a.cover.replace("1000x1000", "500x500")}
            alt=""
            className="size-36 shrink-0 rounded-lg border border-line-strong object-cover shadow-[var(--shadow)] sm:size-32"
          />
        )}
        <div className="min-w-0 flex-1">
          <p className={`font-serif text-lg italic ${round.won ? "text-gold-2" : "text-muted"}`}>{heading}</p>
          <h2 className="font-serif text-3xl leading-tight font-bold break-words">{a?.title ?? "—"}</h2>
          <p className="mt-1 text-sm text-muted">
            {a?.project !== a?.title && a?.project ? `${a.project} · ` : ""}
            {a?.type}
            {a?.year ? ` · ${a.year}` : ""}
          </p>
          <div className="mt-3 flex flex-wrap justify-center gap-2 sm:justify-start">
            {a?.deezerUrl && (
              <a href={a.deezerUrl} target="_blank" rel="noopener noreferrer" className="btn btn-ghost h-9 min-h-9 px-3 text-xs">
                Listen on Deezer <ExternalLink size={13} aria-hidden />
              </a>
            )}
            {a?.geniusUrl && (
              <a href={a.geniusUrl} target="_blank" rel="noopener noreferrer" className="btn btn-ghost h-9 min-h-9 px-3 text-xs">
                Genius <ExternalLink size={13} aria-hidden />
              </a>
            )}
          </div>
        </div>
      </div>

      {typeof round.solvers === "number" && round.kind === "daily" && (
        <p className="flex items-center justify-center gap-1.5 border-t border-line py-2.5 text-xs text-muted">
          <Users size={14} aria-hidden /> {round.solvers} {round.solvers === 1 ? "person has" : "people have"} solved today&apos;s{" "}
          {MODE_INFO[round.mode].title.toLowerCase()}
        </p>
      )}

      <div className="grid gap-2 border-t border-line p-4 sm:grid-cols-2">
        <button type="button" onClick={share} className="btn btn-gold w-full">
          {copied ? <Check size={17} aria-hidden /> : <Share2 size={17} aria-hidden />}
          {copied ? "Copied!" : "Share result"}
        </button>
        {round.kind === "endless" ? (
          <button type="button" onClick={onNextEndless} className="btn btn-ghost w-full">
            <RotateCcw size={16} aria-hidden /> Next song
          </button>
        ) : round.kind === "daily" ? (
          <Link href={`/${round.mode}?endless=1`} className="btn btn-ghost w-full">
            <InfinityIcon size={17} aria-hidden /> Play endless
          </Link>
        ) : (
          <Link href="/archive" className="btn btn-ghost w-full">
            Back to archive
          </Link>
        )}
        {nextMode && round.kind === "daily" && (
          <Link href={`/${nextMode}`} className="btn btn-ghost w-full sm:col-span-2">
            <ModeIcon mode={nextMode} size={16} /> Next up: {MODE_INFO[nextMode].title}
          </Link>
        )}
      </div>

      {round.kind === "daily" && (
        <p className="border-t border-line py-3 text-center text-xs text-faint">
          Next {MODE_INFO[round.mode].title.toLowerCase()} in <Countdown className="text-ivory" />
        </p>
      )}

      <Link
        href="/suggest"
        className="flex items-center justify-center gap-2 border-t border-line bg-teal/10 px-4 py-3 text-sm text-teal-2 hover:bg-teal/20"
      >
        <Sparkles size={15} aria-hidden /> Loving this? Suggest the next artist
      </Link>
    </section>
  );
}
