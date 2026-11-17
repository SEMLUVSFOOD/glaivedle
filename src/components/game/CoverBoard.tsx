"use client";
import { useState } from "react";
import type { RoundView } from "@/lib/game/types";

export function CoverBoard({ round }: { round: RoundView }) {
  const [loadedSrc, setLoadedSrc] = useState<string | null>(null);
  const src = round.reveal.mediaUrl!;
  const loaded = loadedSrc === src;
  return (
    <div className="panel arch gilded mx-auto w-full max-w-sm px-5 pt-12 pb-6">
      <div className="relative mx-auto aspect-square w-full overflow-hidden rounded-lg border border-line-strong bg-surface-3 shadow-[var(--shadow)]">
        {!loaded && <div className="absolute inset-0 animate-pulse bg-surface-3" />}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          key={src}
          src={src}
          alt={round.finished ? `Cover of ${round.answer?.title}` : "Pixelated mystery cover"}
          onLoad={() => setLoadedSrc(src)}
          className={`size-full object-cover transition-opacity duration-500 ${round.finished ? "" : "pixelated"} ${
            loaded ? "opacity-100" : "opacity-0"
          }`}
          draggable={false}
        />
      </div>
      {!round.finished && (
        <p className="mt-3 text-center text-xs text-faint">Every miss sharpens the image{round.hard ? " (no colour in hard mode)" : ""}.</p>
      )}
    </div>
  );
}
