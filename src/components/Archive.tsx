"use client";
import Link from "next/link";
import { roundKey, type SavedRound } from "@/lib/client/storage";
import { addDays, daysBetween, formatPrettyDate } from "@/lib/dates";
import { MODES, type Mode } from "@/lib/game/types";
import { ModeIcon } from "./ModeIcon";
import { useApp, useStored } from "./Providers";

function Cell({ mode, date }: { mode: Mode; date: string }) {
  const { hard, meta } = useApp();
  const kind = date === meta?.today ? "daily" : "archive";
  const saved = useStored<SavedRound | null>(roundKey(mode, hard, kind, date), null);
  const r = saved?.round;
  const tone = r?.finished ? (r.won ? "bg-ok/30 border-ok text-ivory" : "bg-bad/25 border-bad/70 text-ivory") : "border-line text-muted";
  return (
    <Link
      href={kind === "daily" ? `/${mode}` : `/${mode}?d=${date}`}
      className={`grid size-11 place-items-center rounded-lg border transition hover:border-gold ${tone}`}
      aria-label={`${mode} ${date}${r?.finished ? (r.won ? " solved" : " missed") : ""}`}
    >
      <ModeIcon mode={mode} size={16} />
    </Link>
  );
}

export function Archive() {
  const { meta } = useApp();
  if (!meta) return <div className="panel h-64 animate-pulse" />;
  const n = daysBetween(meta.launchDate, meta.today) + 1;
  const days = Array.from({ length: Math.min(n, 365) }, (_, i) => addDays(meta.today, -i));
  return (
    <ul className="space-y-2">
      {days.map((d) => (
        <li key={d} className="panel flex items-center gap-3 px-3 py-2.5">
          <div className="min-w-0 flex-1">
            <p className="font-serif text-lg leading-none font-bold">#{daysBetween(meta.launchDate, d) + 1}</p>
            <p className="text-xs text-faint">{d === meta.today ? "Today" : formatPrettyDate(d)}</p>
          </div>
          <div className="flex gap-1.5">
            {MODES.map((m) => (
              <Cell key={m} mode={m} date={d} />
            ))}
          </div>
        </li>
      ))}
    </ul>
  );
}
