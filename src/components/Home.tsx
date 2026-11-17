"use client";
import Link from "next/link";
import { CalendarDays, ChevronRight } from "lucide-react";
import { roundKey, type SavedRound } from "@/lib/client/storage";
import { MODE_INFO, MODES, type Mode } from "@/lib/game/types";
import { Countdown } from "./Countdown";
import { ModeIcon } from "./ModeIcon";
import { useApp, useStored } from "./Providers";

function ModeCard({ mode, i }: { mode: Mode; i: number }) {
  const { meta, hard } = useApp();
  const saved = useStored<SavedRound | null>(roundKey(mode, hard, "daily", meta?.today ?? "x"), null);
  const r = saved?.round;
  const status = r?.finished
    ? r.won
      ? `Solved in ${saved!.guesses.length}`
      : "Missed"
    : saved?.guesses.length
      ? "In progress"
      : "Not played";
  return (
    <Link
      href={`/${mode}`}
      className="panel arch gilded fade-up group flex flex-col items-center px-3 pt-9 pb-4 text-center transition hover:-translate-y-0.5 hover:border-line-strong"
      style={{ animationDelay: `${i * 70}ms` }}
    >
      <span className="mb-2 grid size-12 place-items-center rounded-full border border-line-strong bg-bg/40 text-gold transition group-hover:text-gold-2">
        <ModeIcon mode={mode} size={22} />
      </span>
      <span className="font-serif text-xl font-bold sm:text-2xl">{MODE_INFO[mode].title}</span>
      <span className="mt-0.5 text-[11px] leading-tight text-muted sm:text-xs">{MODE_INFO[mode].blurb}</span>
      <span
        className={`mt-3 rounded-full px-2.5 py-1 text-[10px] font-semibold tracking-wide uppercase ${
          r?.finished ? (r.won ? "bg-ok/25 text-ok-2" : "bg-bad/25 text-[#e0827a]") : "bg-surface-3 text-faint"
        }`}
      >
        {status}
      </span>
    </Link>
  );
}

export function Home() {
  const { meta, hard } = useApp();
  return (
    <div className="space-y-6">
      <section className="pt-4 text-center">
        <p className="text-[11px] tracking-[0.3em] text-faint uppercase">
          {meta ? `Daily #${meta.number}` : "Daily"} {hard && "· hard mode"}
        </p>
        <h1 className="mt-2 font-serif text-4xl leading-[1.05] font-bold text-balance sm:text-5xl">
          Guess the <span className="font-gothic gold-text font-normal">glaive</span> song
        </h1>
        <p className="mx-auto mt-3 max-w-md text-sm text-muted">
          Four new puzzles every day. Beat a daily to unlock endless mode for it.
        </p>
      </section>

      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        {MODES.map((m, i) => (
          <ModeCard key={m} mode={m} i={i} />
        ))}
      </div>

      {meta?.artist && !meta.artist.ready && (
        <p className="panel p-4 text-center text-sm text-muted">
          The song catalog is being imported for the first time — give it a minute and refresh.
        </p>
      )}

      <div className="flex flex-col items-center gap-3 text-sm text-muted sm:flex-row sm:justify-between">
        <p>
          New puzzles in <Countdown className="text-ivory" />
        </p>
        <Link href="/archive" className="btn btn-ghost h-10 min-h-10 text-sm">
          <CalendarDays size={16} aria-hidden /> Play past days <ChevronRight size={14} aria-hidden />
        </Link>
      </div>
    </div>
  );
}
