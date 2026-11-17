"use client";
import { useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";
import { AUDIO_CLIPS, AUDIO_CLIPS_HARD, PREVIEW_SECONDS } from "@/lib/game/logic";
import type { RoundView } from "@/lib/game/types";

export function AudioBoard({ round }: { round: RoundView }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [pos, setPos] = useState(0);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const limit = round.reveal.clipSeconds ?? 1;
  const clips = round.hard ? AUDIO_CLIPS_HARD : AUDIO_CLIPS;
  const scale = round.finished ? PREVIEW_SECONDS : clips[clips.length - 1];

  // new clip unlocked → reset player
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    a.pause();
    setPlaying(false);
    setPos(0);
    setReady(false);
    setFailed(false);
    a.load();
  }, [round.reveal.mediaUrl]);

  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    const tick = () => {
      const a = audioRef.current;
      if (!a) return;
      setPos(a.currentTime);
      if (a.currentTime >= limit || a.ended) {
        a.pause();
        setPlaying(false);
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, limit]);

  const toggle = async () => {
    const a = audioRef.current;
    if (!a) return;
    if (playing) {
      a.pause();
      setPlaying(false);
      return;
    }
    try {
      a.currentTime = 0;
      await a.play();
      setPlaying(true);
    } catch {
      setFailed(true);
    }
  };

  const r = 52;
  const C = 2 * Math.PI * r;
  const progress = Math.min(1, pos / limit);

  return (
    <div className="panel arch gilded flex flex-col items-center px-5 pt-12 pb-7">
      <audio
        ref={audioRef}
        src={round.reveal.mediaUrl}
        preload="auto"
        onCanPlay={() => setReady(true)}
        onError={() => setFailed(true)}
        onEnded={() => setPlaying(false)}
      />
      <button
        type="button"
        onClick={toggle}
        disabled={failed}
        className="relative grid size-32 place-items-center rounded-full transition active:scale-95"
        aria-label={playing ? "Pause" : `Play ${limit} seconds`}
      >
        <svg viewBox="0 0 120 120" className="absolute inset-0 -rotate-90">
          <circle cx="60" cy="60" r={r} fill="none" stroke="var(--line)" strokeWidth="6" />
          <circle
            cx="60"
            cy="60"
            r={r}
            fill="none"
            stroke="var(--gold-2)"
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={C}
            strokeDashoffset={C * (1 - progress)}
          />
        </svg>
        <span className="grid size-22 place-items-center rounded-full bg-linear-to-b from-gold-2 to-gold text-[#24170c] shadow-[0_8px_30px_-8px_rgb(201_164_92/0.8)]">
          {playing ? <Pause size={34} fill="currentColor" /> : <Play size={34} fill="currentColor" className="ml-1" />}
        </span>
      </button>
      <p className="mt-4 text-sm text-muted">
        {failed
          ? "Couldn't load the preview. Try refreshing."
          : !ready
            ? "Loading clip…"
            : round.finished
              ? "Full preview unlocked"
              : `${limit} second${limit === 1 ? "" : "s"} unlocked`}
      </p>

      {/* heardle-style timeline */}
      <div className="mt-5 w-full max-w-md">
        <div className="relative h-3 overflow-hidden rounded-full bg-surface-3/70">
          <div className="absolute inset-y-0 left-0 bg-teal/70" style={{ width: `${(limit / scale) * 100}%` }} />
          <div className="absolute inset-y-0 left-0 bg-gold-2" style={{ width: `${(pos / scale) * 100}%` }} />
          {!round.finished &&
            clips.map((c) => (
              <span key={c} className="absolute inset-y-0 w-px bg-bg/80" style={{ left: `${(c / scale) * 100}%` }} />
            ))}
        </div>
        <div className="mt-1 flex justify-between text-[11px] tabular-nums text-faint">
          <span>0:{String(Math.floor(pos)).padStart(2, "0")}</span>
          <span>0:{String(scale).padStart(2, "0")}</span>
        </div>
      </div>
    </div>
  );
}
