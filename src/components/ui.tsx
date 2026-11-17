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
  normal: "Only officially released songs from albums, EPs and singles",
  hard: "Adds leaks, unreleased songs and features – shorter clips, colourless covers",
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

/** On/off chip for alias projects (ovine hall) in the unreleased pool. */
export function OvineToggle({ on, onChange, disabled }: { on: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      disabled={disabled}
      onClick={() => onChange(!on)}
      title={disabled ? "ovine hall songs are part of the unreleased pool" : on ? "ovine hall songs included" : "ovine hall songs left out"}
      className={`seg-item border border-fg ${on && !disabled ? "bg-fg text-bg" : "hoverable"} ${disabled ? "opacity-45" : ""}`}
    >
      ovine hall
      <sup className="caption">[{disabled ? "–" : on ? "on" : "off"}]</sup>
    </button>
  );
}
