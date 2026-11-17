import { Disc3, Image as ImageIcon, Music, Quote } from "lucide-react";
import type { Mode } from "@/lib/game/types";

export function ModeIcon({ mode, size = 20 }: { mode: Mode; size?: number }) {
  const P = { size, "aria-hidden": true } as const;
  if (mode === "classic") return <Disc3 {...P} />;
  if (mode === "lyrics") return <Quote {...P} />;
  if (mode === "audio") return <Music {...P} />;
  return <ImageIcon {...P} />;
}
