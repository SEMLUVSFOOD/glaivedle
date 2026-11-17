"use client";
import { useEffect, useRef, useState } from "react";
import { type Track, TRACKS } from "@/lib/client/storage";
import { MODE_INFO, MODES, type Mode } from "@/lib/game/types";
import { useApp } from "./Providers";
import { TRACK_INFO, useDayStreaks, useStreak } from "./Streaks";
import { POOL_HINT, POOL_LABEL, PoolSwitch, Segmented, Switch } from "./ui";

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
        <h2 className="title">{dialog === "stats" ? "Stats" : dialog === "settings" ? "Settings" : "Help"}</h2>
        <button type="button" onClick={closeDialog} className="small hoverable underline underline-offset-4">
          Close
        </button>
      </div>
      <div className="px-5 pb-6">
        {dialog === "stats" ? <StatsBody /> : dialog === "settings" ? <SettingsBody /> : dialog === "help" ? <HelpBody /> : null}
      </div>
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
        <span className="text-fg-hover">Streaks</span> – every mode keeps a daily streak (days in a row solved), an endless streak
        (rounds in a row) and an archive streak, separately for released and unreleased. Your day streak counts the days you finish at
        least one daily.
      </p>
      <p className="small">
        <span className="text-fg-hover">Released</span> uses only officially released songs.{" "}
        <span className="text-fg-hover">Unreleased</span> adds leaks, unreleased songs and features, shortens audio clips and
        drains the colour from covers – the hard way to play. Each has its own dailies, stats and streaks. Switch it and hide album
        covers in{" "}
        <span className="text-fg-hover">Settings</span>. New puzzles pick themselves at midnight, Amsterdam time.
      </p>
    </div>
  );
}

function SettingsBody() {
  const { hard, setHard, covers, setCovers } = useApp();
  return (
    <div className="space-y-7">
      <section className="space-y-3">
        <h3 className="nav-link flex items-center gap-2">
          Song pool
          <span className="sq" />
        </h3>
        <PoolSwitch hard={hard} onChange={setHard} />
        <ul className="small space-y-1">
          <li className={hard ? "" : "text-fg-hover"}>
            <span className="text-fg-hover">{POOL_LABEL.normal}</span> – {POOL_HINT.normal}. 1s audio intro, full-colour covers.
          </li>
          <li className={hard ? "text-fg-hover" : ""}>
            <span className="text-fg-hover">{POOL_LABEL.hard}</span> – {POOL_HINT.hard}. The hard way to play.
          </li>
        </ul>
        <p className="small text-soft">Each pool has its own dailies, stats and streaks – switching never resets anything.</p>
      </section>

      <section className="flex items-start justify-between gap-6">
        <div>
          <h3 className="nav-link mb-2 flex items-center gap-2">
            Album covers
            <span className="sq" />
          </h3>
          <p className="small">Show artwork next to songs while you guess. Turn off for a harder, spoiler-free list.</p>
        </div>
        <Switch checked={covers} onChange={setCovers} label="Show album covers" />
      </section>
    </div>
  );
}

function StatsBody() {
  const app = useApp();
  const [hard, setHard] = useState(app.hard);
  const [track, setTrack] = useState<Track>("daily");
  return (
    <div className="space-y-7">
      <div className="flex flex-wrap gap-2">
        <Segmented<Track>
          label="Game type"
          value={track}
          onChange={setTrack}
          options={TRACKS.map((t) => ({ value: t, label: TRACK_INFO[t].title }))}
        />
        <PoolSwitch hard={hard} onChange={setHard} />
      </div>
      {track === "daily" ? <DayStreaks hard={hard} /> : <p className="caption">STREAK = {TRACK_INFO[track].streakHint.toUpperCase()}</p>}
      {MODES.map((m) => (
        <ModeStats key={m} mode={m} hard={hard} track={track} />
      ))}
    </div>
  );
}

function Num({ v, l, hi = false }: { v: number | string; l: string; hi?: boolean }) {
  return (
    <div>
      <dd className={`text-[26px] leading-none tracking-[-0.06em] tabular-nums ${hi ? "text-ink" : "text-fg-hover"}`}>{v}</dd>
      <dt>{l}</dt>
    </div>
  );
}

function DayStreaks({ hard }: { hard: boolean }) {
  const d = useDayStreaks(hard);
  return (
    <section className="box px-4 py-3">
      <dl className="small grid grid-cols-4 gap-2">
        <Num v={d.days} l="Day streak" hi={d.playedToday && d.days > 0} />
        <Num v={d.bestDays} l="Best" />
        <Num v={d.sweep} l="All-4 streak" hi={d.sweptToday && d.sweep > 0} />
        <Num v={d.bestSweep} l="Best" />
      </dl>
      <p className="small mt-2 text-soft">
        {d.playedToday
          ? d.sweptToday
            ? "All four dailies solved today."
            : "Day streak safe for today. Solve all four to grow your all-4 streak."
          : d.days > 0
            ? "Play a daily today to keep your streak alive."
            : "Finish any daily to start a day streak."}
      </p>
    </section>
  );
}

function ModeStats({ mode, hard, track }: { mode: Mode; hard: boolean; track: Track }) {
  const { stats: s, streak } = useStreak(mode, track, hard);
  const buckets = mode === "classic" ? ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10+"] : ["1", "2", "3", "4", "5", "6", "X"];
  const max = Math.max(1, ...buckets.map((b) => s.dist[b] ?? 0));
  return (
    <section>
      <h3 className="nav-link mb-3 flex items-center gap-2">
        {MODE_INFO[mode].title}
        <span className="sq" />
      </h3>
      <dl className="small mb-3 grid grid-cols-4">
        <Num v={s.played} l="Played" />
        <Num v={s.played ? Math.round((s.won / s.played) * 100) : 0} l="Win %" />
        <Num v={streak} l="Streak" hi={streak > 0 && streak === s.maxStreak} />
        <Num v={s.maxStreak} l="Best" />
      </dl>
      {s.played === 0 ? (
        <p className="small text-soft">
          No {TRACK_INFO[track].title.toLowerCase()} games yet{hard ? " with unreleased songs" : ""}.
        </p>
      ) : (
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
      )}
    </section>
  );
}
