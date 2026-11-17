"use client";
import { proofKey } from "@/lib/client/storage";
import type { Kind, Mode } from "@/lib/game/types";
import { useApp, useStored } from "../Providers";
import { Segmented } from "../ui";

/** Switch between daily / endless / archive and normal / hard without leaving the mode. */
export function PlayBar({ mode, kind }: { mode: Mode; kind: Kind }) {
  const { hard, setHard, meta } = useApp();
  const proof = useStored<{ date: string } | null>(proofKey(mode, hard), null);
  const endlessOpen = !!proof && proof.date === meta?.today;

  return (
    <div className="mb-8 flex flex-wrap items-center gap-2 sm:mb-10 sm:gap-3">
      <Segmented<Kind>
        label="Game type"
        value={kind}
        options={[
          { value: "daily", label: "Daily", href: `/${mode}` },
          {
            value: "endless",
            label: "Endless",
            href: `/${mode}?endless=1`,
            disabled: !endlessOpen,
            title: endlessOpen ? "Unlimited rounds" : "Unlocks after today's daily",
          },
          { value: "archive", label: "Archive", href: "/archive" },
        ]}
      />
      <Segmented<"normal" | "hard">
        label="Difficulty"
        value={hard ? "hard" : "normal"}
        onChange={(v) => setHard(v === "hard")}
        options={[
          { value: "normal", label: "Normal", title: "Released songs only" },
          { value: "hard", label: "Hard", title: "Adds leaks, unreleased songs and features; shorter clips, colourless covers" },
        ]}
      />
    </div>
  );
}
