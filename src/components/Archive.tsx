"use client";
import Link from "next/link";
import { roundKey, type SavedRound } from "@/lib/client/storage";
import { addDays, daysBetween } from "@/lib/dates";
import { MODE_INFO, MODES, type Mode } from "@/lib/game/types";
import { useApp, useStored } from "./Providers";

function Cell({ mode, date }: { mode: Mode; date: string }) {
  const { hard, meta } = useApp();
  const kind = date === meta?.today ? "daily" : "archive";
  const saved = useStored<SavedRound | null>(roundKey(mode, hard, kind, date), null);
  const r = saved?.round;
  const state = r?.finished ? (r.won ? "won" : "lost") : "open";
  return (
    <Link
      href={kind === "daily" ? `/${mode}` : `/${mode}?d=${date}`}
      className={`inline-flex items-center gap-1.5 rounded-[6px] px-1.5 py-1 no-underline ${
        state === "won" ? "pill" : state === "lost" ? "text-bad line-through" : "hoverable underline"
      }`}
      aria-label={`${MODE_INFO[mode].title} ${date} ${state}`}
    >
      <span className="sm:hidden">{MODE_INFO[mode].title.slice(0, 2)}</span>
      <span className="hidden sm:inline">{MODE_INFO[mode].title}</span>
    </Link>
  );
}

export function Archive() {
  const { meta } = useApp();
  if (!meta) return <p className="small">Loading…</p>;
  const n = daysBetween(meta.launchDate, meta.today) + 1;
  const days = Array.from({ length: Math.min(n, 365) }, (_, i) => addDays(meta.today, -i));
  return (
    <ul className="small">
      {days.map((d) => {
        const date = new Date(d + "T12:00:00Z");
        return (
          <li key={d} className="grid grid-cols-[4.2rem_3rem_1fr] items-center gap-x-2 py-[5px] sm:grid-cols-[6rem_4rem_1fr]">
            <span>
              {String(date.getUTCMonth() + 1).padStart(2, "0")}.{String(date.getUTCDate()).padStart(2, "0")}{" "}
              {date.toLocaleDateString("en-GB", { weekday: "short", timeZone: "UTC" })}
            </span>
            <span className="caption">{String(daysBetween(meta.launchDate, d) + 1).padStart(3, "0")}</span>
            <span className="flex flex-wrap justify-end gap-1 sm:justify-start sm:gap-3">
              {MODES.map((m) => (
                <Cell key={m} mode={m} date={d} />
              ))}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
