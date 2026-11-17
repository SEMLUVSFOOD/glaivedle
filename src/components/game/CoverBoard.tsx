"use client";
import { useState } from "react";
import type { RoundView } from "@/lib/game/types";

export function CoverBoard({ round }: { round: RoundView }) {
  const [loadedSrc, setLoadedSrc] = useState<string | null>(null);
  const src = round.reveal.mediaUrl!;
  const step = Math.min(round.step + 1, round.maxGuesses ?? 6);
  return (
    <div className="flex items-end gap-3">
      <div className="relative aspect-square w-full max-w-[420px] bg-faint">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          key={src}
          src={src}
          alt={round.finished ? `Cover of ${round.answer?.title}` : "Pixelated mystery cover"}
          onLoad={() => setLoadedSrc(src)}
          className={`size-full object-cover transition-opacity duration-300 ${round.finished ? "" : "pixelated"} ${
            loadedSrc === src ? "opacity-100" : "opacity-0"
          }`}
          draggable={false}
        />
      </div>
      <span className="small flex shrink-0 items-center gap-2 pb-1 tabular-nums">
        {round.finished ? "06 / 06" : `0${step} / 0${round.maxGuesses ?? 6}`}
        <span className="sq" />
      </span>
    </div>
  );
}
