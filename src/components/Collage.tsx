"use client";
import { useEffect, useState } from "react";

// hand-tuned scatter, echoing the glaivemusic.com homepage strip
const W = [150, 118, 176, 132, 164, 112, 150, 126, 170, 120, 158, 136, 146, 116];
const Y = [0, 46, 12, 74, 28, 92, 6, 58, 20, 84, 38, 4, 66, 30];
const X = [0, -18, 30, -26, 8, -34, 44, -10, -22, 36, -14, 18, -30, 10];

export function Collage() {
  const [covers, setCovers] = useState<{ title: string; src: string }[]>([]);
  useEffect(() => {
    let alive = true;
    fetch("/api/covers")
      .then((r) => r.json())
      .then((c) => alive && setCovers(c))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className="-mx-[var(--margin)] h-[230px] overflow-hidden sm:h-[300px]" aria-hidden>
      <div className="flex w-max items-start pl-[var(--margin)]">
        {covers.map((c, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={c.src}
            src={c.src}
            alt=""
            loading="lazy"
            className="arrive block aspect-square object-cover"
            style={{
              width: W[i % W.length],
              marginTop: Y[i % Y.length],
              marginLeft: i === 0 ? 0 : X[i % X.length],
              zIndex: i % 3,
              position: "relative",
              animationDelay: `${i * 40}ms`,
            }}
          />
        ))}
      </div>
    </div>
  );
}
