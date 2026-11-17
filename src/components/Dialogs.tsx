"use client";
import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { emptyStats, type Stats, statsKey } from "@/lib/client/storage";
import { MODE_INFO, MODES, type Mode } from "@/lib/game/types";
import { useApp, useStored } from "./Providers";
import { ModeIcon } from "./ModeIcon";

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
      className="panel m-auto w-[min(34rem,calc(100vw-1.5rem))] max-h-[85dvh] overflow-y-auto p-0 backdrop:bg-black/70"
    >
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-surface-2/95 px-5 py-3 backdrop-blur">
        <h2 className="font-serif text-2xl font-semibold">{dialog === "stats" ? "Your stats" : "How to play"}</h2>
        <button type="button" onClick={closeDialog} className="btn btn-icon -mr-2 text-muted" aria-label="Close">
          <X size={20} />
        </button>
      </div>
      <div className="p-5">{dialog === "stats" ? <StatsBody /> : dialog === "help" ? <HelpBody /> : null}</div>
    </dialog>
  );
}

function Swatch({ cls, label }: { cls: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className={`tile ${cls} h-6! w-6! rounded-md!`} aria-hidden />
      <span>{label}</span>
    </div>
  );
}

function HelpBody() {
  return (
    <div className="space-y-5 text-sm leading-relaxed text-muted">
      <p className="text-ivory">
        A new glaive puzzle every day in four modes. Finish a daily to unlock <b>endless</b> mode for it.
      </p>
      <ul className="space-y-3">
        {MODES.map((m) => (
          <li key={m} className="flex gap-3">
            <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full border border-line-strong text-gold">
              <ModeIcon mode={m} size={16} />
            </span>
            <span>
              <b className="text-ivory">{MODE_INFO[m].title}</b> — {HELP[m]}
            </span>
          </li>
        ))}
      </ul>
      <div className="grid grid-cols-2 gap-2 rounded-xl border border-line p-3 text-xs">
        <Swatch cls="tile-correct" label="Correct" />
        <Swatch cls="tile-partial" label="Close / partly right" />
        <Swatch cls="tile-wrong" label="Wrong" />
        <Swatch cls="tile-unknown" label="Unknown data" />
        <p className="col-span-2 pt-1 text-muted">↑ / ↓ means the answer is higher or lower (later year, longer song…).</p>
      </div>
      <p>
        <b className="text-ivory">Hard mode</b> adds unreleased songs and features to the pool, shortens audio clips and
        drains the colour from covers. It has its own daily puzzles and stats.
      </p>
      <p>New puzzles drop at midnight (Amsterdam time). Past days live in the archive.</p>
    </div>
  );
}

const HELP: Record<Mode, string> = {
  classic: "guess any song and compare its project, year, collabs, length and track number with the answer. Unlimited guesses.",
  lyrics: "one lyric line is shown; every miss reveals the next line. Six tries.",
  audio: "hear the first second; every miss or skip unlocks more of the intro. Six tries.",
  cover: "name the release from a pixelated cover that sharpens with every miss. Six tries.",
};

function StatsBody() {
  const { hard } = useApp();
  return (
    <div className="space-y-4">
      <p className="text-xs uppercase tracking-widest text-faint">{hard ? "Hard mode" : "Normal mode"} · daily puzzles</p>
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
    <section className="rounded-xl border border-line p-3">
      <h3 className="mb-2 flex items-center gap-2 font-serif text-lg font-semibold text-gold-2">
        <ModeIcon mode={mode} size={16} /> {MODE_INFO[mode].title}
      </h3>
      <div className="mb-3 grid grid-cols-4 text-center">
        {[
          ["Played", s.played],
          ["Win %", s.played ? Math.round((s.won / s.played) * 100) : 0],
          ["Streak", s.streak],
          ["Best", s.maxStreak],
        ].map(([l, v]) => (
          <div key={l}>
            <div className="text-xl font-semibold tabular-nums">{v}</div>
            <div className="text-[10px] uppercase tracking-wider text-faint">{l}</div>
          </div>
        ))}
      </div>
      <div className="space-y-1">
        {buckets.map((b) => {
          const v = s.dist[b] ?? 0;
          return (
            <div key={b} className="flex items-center gap-2 text-xs">
              <span className="w-6 text-right tabular-nums text-faint">{b}</span>
              <div
                className={`h-4 rounded-sm px-1 text-right text-[10px] leading-4 tabular-nums ${b === "X" ? "bg-bad/80" : "bg-teal"}`}
                style={{ width: `${Math.max(6, (v / max) * 100)}%` }}
              >
                {v}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
