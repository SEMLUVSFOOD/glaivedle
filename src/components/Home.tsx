"use client";
import Link from "next/link";
import { roundKey, type SavedRound } from "@/lib/client/storage";
import { MODE_INFO, MODES, type Mode } from "@/lib/game/types";
import { Collage } from "./Collage";
import { Countdown } from "./Countdown";
import { useApp, useStored } from "./Providers";

const pad = (n: number) => String(n).padStart(3, "0");

export function useDailyStatus(mode: Mode) {
  const { meta, hard } = useApp();
  const saved = useStored<SavedRound | null>(roundKey(mode, hard, "daily", meta?.today ?? "x"), null);
  const r = saved?.round;
  if (r?.finished) return { tag: r.won ? String(saved!.guesses.length) : "x", label: r.won ? `Solved in ${saved!.guesses.length}` : "Missed", done: true };
  if (saved?.guesses.length) return { tag: "…", label: "In progress", done: false };
  return { tag: "–", label: "Not played", done: false };
}

function ModeLink({ mode }: { mode: Mode }) {
  const s = useDailyStatus(mode);
  return (
    <Link href={`/${mode}`} className="whitespace-nowrap no-underline">
      <span className="u">{MODE_INFO[mode].title}</span>
      <sup className="caption">[{s.tag}]</sup>
    </Link>
  );
}

function Row({ mode, i }: { mode: Mode; i: number }) {
  const s = useDailyStatus(mode);
  return (
    <li className="arrive grid grid-cols-[2rem_1fr_auto] items-baseline gap-x-3 py-[7px] sm:grid-cols-[3rem_9rem_1fr_9rem_6rem]" style={{ animationDelay: `${i * 50}ms` }}>
      <span className="caption">0{i + 1}</span>
      <span className="text-fg-hover">{MODE_INFO[mode].title}</span>
      <span className="hidden sm:block">{MODE_INFO[mode].blurb}</span>
      <span className={`hidden sm:block ${s.done ? "text-fg-hover" : ""}`}>{s.label}</span>
      <Link href={`/${mode}`} className="text-right">
        {s.done ? "View" : "Play"} →
      </Link>
    </li>
  );
}

export function Home() {
  const { meta, hard } = useApp();
  const today = meta?.today ? new Date(meta.today + "T12:00:00Z") : null;
  return (
    <div className="space-y-10 sm:space-y-14">
      <section className="pt-[4vh] sm:pt-[10vh]">
        <p className="script mb-1 text-[50px] leading-[0.9] sm:text-[78px]">guess the glaive song</p>
        <h1 className="headline max-w-[16ch]">
          {MODES.map((m, i) => (
            <span key={m}>
              <ModeLink mode={m} />
              {i < MODES.length - 1 ? " " : ""}
            </span>
          ))}{" "}
          <span className="whitespace-nowrap">– Daily {meta ? pad(meta.number) : "···"}</span>
        </h1>
      </section>

      <Collage />

      <section className="small">
        <div className="mb-2 flex items-baseline justify-between">
          <span>
            {today
              ? today.toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" })
              : " "}
            {hard && " – hard"}
          </span>
          <span className="flex items-center gap-2">
            Next in <Countdown className="caption" />
            <span className="sq" />
          </span>
        </div>
        <ul>
          {MODES.map((m, i) => (
            <Row key={m} mode={m} i={i} />
          ))}
        </ul>
        {meta?.artist && !meta.artist.ready && <p className="mt-4">The song catalog is being imported – refresh in a minute.</p>}
        <p className="mt-6">
          <Link href="/archive">Play past days →</Link>
        </p>
      </section>
    </div>
  );
}
