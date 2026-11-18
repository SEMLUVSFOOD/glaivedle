"use client";
import Link from "next/link";

export type SegOption<T extends string> = {
  value: T;
  label: React.ReactNode;
  tag?: React.ReactNode;
  href?: string;
  disabled?: boolean;
  title?: string;
};

/** Segmented control. Options with `href` render as links (for navigation), the rest as toggle buttons. */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
  className = "",
}: {
  options: SegOption<T>[];
  value: T;
  onChange?: (v: T) => void;
  label: string;
  className?: string;
}) {
  return (
    <div role="group" aria-label={label} className={`seg ${className}`}>
      {options.map((o) => {
        const selected = o.value === value;
        const inner = (
          <>
            {o.label}
            {o.tag !== undefined && <sup className="caption">[{o.tag}]</sup>}
          </>
        );
        if (o.href) {
          return (
            <Link
              key={o.value}
              href={o.href}
              title={o.title}
              aria-current={selected ? "page" : undefined}
              aria-disabled={o.disabled || undefined}
              className={`seg-item ${selected ? "" : "hoverable"}`}
            >
              {inner}
            </Link>
          );
        }
        return (
          <button
            key={o.value}
            type="button"
            title={o.title}
            aria-pressed={selected}
            disabled={o.disabled}
            onClick={() => !selected && onChange?.(o.value)}
            className={`seg-item ${selected ? "" : "hoverable"}`}
          >
            {inner}
          </button>
        );
      })}
    </div>
  );
}

export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)} className="switch" />
  );
}

/** What the two difficulties are called in the UI (internally still "hard"). */
export const POOL_LABEL = { normal: "Released", hard: "Unreleased" } as const;
export const POOL_HINT = {
  normal: "Officially released songs: albums, EPs, singles and features",
  hard: "Adds leaks and unreleased songs – shorter audio clips",
} as const;

/** Released | Unreleased switch, shared by the game pages, archive, settings and stats. */
export function PoolSwitch({ hard, onChange, className }: { hard: boolean; onChange: (hard: boolean) => void; className?: string }) {
  return (
    <Segmented<"normal" | "hard">
      label="Song pool"
      value={hard ? "hard" : "normal"}
      onChange={(v) => onChange(v === "hard")}
      className={className}
      options={[
        { value: "normal", label: POOL_LABEL.normal, title: POOL_HINT.normal },
        { value: "hard", label: POOL_LABEL.hard, title: POOL_HINT.hard },
      ]}
    />
  );
}

/** On/off chip for glaive's alias ovine hall – its own switch, independent of released / unreleased. */
export function OvineToggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={() => onChange(!on)}
      title={on ? "ovine hall songs included" : "ovine hall songs left out"}
      className={`seg-item border border-fg ${on ? "bg-fg text-bg" : "hoverable"}`}
    >
      ovine hall
      <sup className="caption">[{on ? "on" : "off"}]</sup>
    </button>
  );
}
