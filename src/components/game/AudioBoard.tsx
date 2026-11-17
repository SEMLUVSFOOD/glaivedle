"use client";
import { useEffect, useRef, useState } from "react";
import { AUDIO_CLIPS, AUDIO_CLIPS_HARD, PREVIEW_SECONDS } from "@/lib/game/logic";
import type { RoundView } from "@/lib/game/types";

const fmt = (s: number) => `0:${String(Math.floor(s)).padStart(2, "0")}`;

/** Styled after the glaivemusic.com video player: a black frame with "▶ Play" in the corner. */
export function AudioBoard({ round }: { round: RoundView }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [pos, setPos] = useState(0);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const limit = round.reveal.clipSeconds ?? 1;
  const clips = round.hard ? AUDIO_CLIPS_HARD : AUDIO_CLIPS;
  const scale = round.finished ? PREVIEW_SECONDS : clips[clips.length - 1];

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    a.pause();
    a.load();
    return () => a.pause();
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
      setPos(0);
      await a.play();
      setPlaying(true);
    } catch {
      setFailed(true);
    }
  };

  return (
    <div>
      <audio
        ref={audioRef}
        src={round.reveal.mediaUrl}
        preload="auto"
        onLoadStart={() => {
          setReady(false);
          setFailed(false);
          setPlaying(false);
          setPos(0);
        }}
        onCanPlay={() => setReady(true)}
        onError={() => setFailed(true)}
        onEnded={() => setPlaying(false)}
      />
      <button
        type="button"
        onClick={toggle}
        disabled={failed}
        className="relative block aspect-video w-full max-w-2xl overflow-hidden bg-ink text-left"
        aria-label={playing ? "Pause" : `Play ${limit} seconds`}
      >
        <span className="absolute inset-0 grid place-items-center">
          <span className="caption text-[clamp(56px,18vw,120px)] font-bold text-[#3a3a3a] tabular-nums">
            {fmt(playing ? pos : round.finished ? 30 : limit)}
          </span>
        </span>
        {/* timeline */}
        <span className="absolute inset-x-3 bottom-10 h-[3px] bg-[#2a2a2a]">
          <span className="absolute inset-y-0 left-0 bg-[#5a5a5a]" style={{ width: `${(limit / scale) * 100}%` }} />
          <span className="absolute inset-y-0 left-0 bg-white" style={{ width: `${(pos / scale) * 100}%` }} />
          {!round.finished &&
            clips.map((c) => <span key={c} className="absolute -top-1 h-[11px] w-px bg-[#444]" style={{ left: `${(c / scale) * 100}%` }} />)}
        </span>
        <span className="small absolute bottom-3 left-3 text-white">
          {failed ? "Preview unavailable" : !ready ? "Loading…" : playing ? "❚❚ Pause" : "▶ Play"}
        </span>
        <span className="small absolute right-3 bottom-3 text-[#9a9a9a]">
          {round.finished ? "Full preview" : `${limit}s unlocked`}
        </span>
      </button>
    </div>
  );
}
