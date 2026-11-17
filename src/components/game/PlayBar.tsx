"use client";
import { proofKey } from "@/lib/client/storage";
import type { Kind, Mode } from "@/lib/game/types";
import { useApp, useStored } from "../Providers";
import { OvineToggle, PoolSwitch, Segmented } from "../ui";

/** Switch between daily / endless / archive and released / unreleased songs without leaving the mode. */
export function PlayBar({ mode, kind }: { mode: Mode; kind: Kind }) {
  const { hard, setHard, ovine, setOvine, meta } = useApp();
  const proof = useStored<{ date: string } | null>(proofKey(mode, hard, ovine), null);
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
      <div className="flex flex-wrap items-center gap-2">
        <PoolSwitch hard={hard} onChange={setHard} />
        {hard && <OvineToggle on={ovine} onChange={setOvine} />}
      </div>
    </div>
  );
}
