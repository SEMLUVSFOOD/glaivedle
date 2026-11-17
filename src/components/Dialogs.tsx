"use client";
import { useEffect, useRef } from "react";
import { emptyStats, type Stats, statsKey } from "@/lib/client/storage";
import { MODE_INFO, MODES, type Mode } from "@/lib/game/types";
import { useApp, useStored } from "./Providers";

export function Dialogs() {
  const { dialog, closeDialog } = useApp();
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (dialog && !el.open) el.showModal();
    if (!dialog && el.open) el.close();
  }, [dialog]);

  return (
    <dialog
      ref={ref}
      onClose={closeDialog}
      onClick={(e) => e.target === e.currentTarget && closeDialog()}
      className="box m-auto max-h-[88dvh] w-[min(36rem,calc(100vw-2*var(--margin)))] overflow-y-auto p-0"
    >
      <div className="sticky top-0 flex items-start justify-between bg-bg px-5 pt-5 pb-4">
        <h2 className="title">{dialog === "stats" ? "Stats" : "Help"}</h2>
        <button type="button" onClick={closeDialog} className="small hoverable underline underline-offset-4">
          Close
        </button>
      </div>
      <div className="px-5 pb-6">{dialog === "stats" ? <StatsBody /> : dialog === "help" ? <HelpBody /> : null}</div>
    </dialog>
  );
}

const HELP: Record<Mode, string> = {
  classic: "Guess any song. Each tile compares it with the answer: project, type, year, collabs, length, track number. Unlimited guesses.",
  lyrics: "One lyric line. Every miss reveals the next. Six tries.",
  audio: "One second of the intro. Every miss or skip unlocks more. Six tries.",
  cover: "A pixelated cover that sharpens with every miss. Six tries.",
};

function HelpBody() {
  return (
    <div className="space-y-6">
      <p className="text-[19px] leading-snug tracking-[-0.03em]">
        A new glaive puzzle every day, in four modes. Finish a daily to unlock <i className="font-serif text-[21px]">endless</i> for it.
      </p>
      <ul className="small space-y-3">
        {MODES.map((m, i) => (
          <li key={m} className="grid grid-cols-[2.2rem_5rem_1fr] gap-2">
            <span className="caption pt-[3px]">0{i + 1}</span>
            <span className="text-fg-hover">{MODE_INFO[m].title}</span>
            <span>{HELP[m]}</span>
          </li>
        ))}
      </ul>
      <div className="small grid grid-cols-2 gap-x-4 gap-y-2">
        {[
          ["tile-correct", "Correct"],
          ["tile-partial", "Close / partly right"],
          ["tile-wrong", "Wrong"],
          ["tile-unknown", "No data"],
        ].map(([c, l]) => (
          <span key={c} className="flex items-center gap-2">
            <span className={`tile ${c} size-4! p-0!`} aria-hidden />
            {l}
          </span>
        ))}
        <span className="col-span-2">↑ ↓ – the answer is higher or lower (later year, longer song, later track).</span>
      </div>
      <p className="small">
        <span className="text-fg-hover">Hard</span> adds unreleased songs and features, shortens audio clips and drains the colour
        from covers. It has its own dailies and stats. <span className="text-fg-hover">Covers</span> off hides album art while
        you guess. New puzzles pick themselves at midnight, Amsterdam time.
      </p>
    </div>
  );
}

function StatsBody() {
  const { hard } = useApp();
  return (
    <div className="space-y-8">
      <p className="caption">{hard ? "HARD" : "NORMAL"} – DAILY ONLY</p>
      {MODES.map((m) => (
        <ModeStats key={m} mode={m} hard={hard} />
      ))}
    </div>
  );
}

function ModeStats({ mode, hard }: { mode: Mode; hard: boolean }) {
  const s = useStored<Stats>(statsKey(mode, hard), emptyStats());
  const buckets = mode === "classic" ? ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10+"] : ["1", "2", "3", "4", "5", "6", "X"];
  const max = Math.max(1, ...buckets.map((b) => s.dist[b] ?? 0));
  return (
    <section>
      <h3 className="nav-link mb-3 flex items-center gap-2">
        {MODE_INFO[mode].title}
        <span className="sq" />
      </h3>
      <dl className="small mb-3 grid grid-cols-4">
        {[
          ["Played", s.played],
          ["Win %", s.played ? Math.round((s.won / s.played) * 100) : 0],
          ["Streak", s.streak],
          ["Best", s.maxStreak],
        ].map(([l, v]) => (
          <div key={l}>
            <dd className="text-[26px] leading-none tracking-[-0.06em] text-fg-hover tabular-nums">{v}</dd>
            <dt>{l}</dt>
          </div>
        ))}
      </dl>
      <div className="space-y-[3px]">
        {buckets.map((b) => {
          const v = s.dist[b] ?? 0;
          return (
            <div key={b} className="flex items-center gap-2">
              <span className="caption w-6 text-right">{b}</span>
              <span
                className={`caption flex h-[14px] items-center justify-end rounded-[2px] pr-1 text-[10px] text-bg ${b === "X" ? "bg-bad" : "bg-fg"}`}
                style={{ width: `${Math.max(5, (v / max) * 100)}%` }}
              >
                {v}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
