"use client";
import Link from "next/link";
import { CalendarDays, ChartColumn, CircleHelp, Skull } from "lucide-react";
import { useApp } from "./Providers";

export function Header() {
  const { hard, setHard, openDialog } = useApp();
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-bg/80 pt-[env(safe-area-inset-top)] backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-3xl items-center gap-1 px-3 sm:px-6">
        <Link href="/" className="mr-auto flex items-baseline gap-2" aria-label="glaivedle home">
          <span className="font-gothic gold-text text-[1.9rem] leading-none">glaivedle</span>
        </Link>
        <button
          type="button"
          onClick={() => setHard(!hard)}
          aria-pressed={hard}
          title="Hard mode: unreleased songs, features & tougher reveals"
          className={`btn h-9 min-h-9 px-3 text-xs ${hard ? "btn-gold" : "btn-ghost text-muted"}`}
        >
          <Skull size={15} aria-hidden />
          <span>{hard ? "Hard" : "Normal"}</span>
        </button>
        <Link href="/archive" className="btn btn-icon text-muted hover:text-ivory" aria-label="Archive">
          <CalendarDays size={20} />
        </Link>
        <button type="button" onClick={() => openDialog("stats")} className="btn btn-icon text-muted hover:text-ivory" aria-label="Statistics">
          <ChartColumn size={20} />
        </button>
        <button type="button" onClick={() => openDialog("help")} className="btn btn-icon text-muted hover:text-ivory" aria-label="How to play">
          <CircleHelp size={20} />
        </button>
      </div>
    </header>
  );
}
