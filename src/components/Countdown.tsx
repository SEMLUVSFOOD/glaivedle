"use client";
import { useEffect, useState } from "react";
import { useApp } from "./Providers";

export function Countdown({ className = "" }: { className?: string }) {
  const { meta } = useApp();
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  if (!meta || now === null) return <span className={className}>--:--:--</span>;
  const left = Math.max(0, meta.msUntilNext - (now - meta.fetchedAt));
  const h = Math.floor(left / 3_600_000);
  const m = Math.floor((left % 3_600_000) / 60_000);
  const s = Math.floor((left % 60_000) / 1000);
  return (
    <span className={`tabular-nums ${className}`}>
      {String(h).padStart(2, "0")}:{String(m).padStart(2, "0")}:{String(s).padStart(2, "0")}
    </span>
  );
}
