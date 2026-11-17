"use client";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Search, SkipForward } from "lucide-react";
import type { Mode, Option } from "@/lib/game/types";

const cache = new Map<string, Promise<Option[]>>();
function fetchOptions(mode: Mode, hard: boolean) {
  const key = `${mode}:${hard}`;
  if (!cache.has(key)) {
    cache.set(
      key,
      fetch(`/api/options?mode=${mode}&hard=${hard ? 1 : 0}`)
        .then((r) => r.json())
        .catch(() => {
          cache.delete(key);
          return [];
        }),
    );
  }
  return cache.get(key)!;
}

const norm = (s: string) =>
  s
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[’'`]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

export function GuessInput({
  mode,
  hard,
  exclude,
  disabled,
  onGuess,
  onSkip,
  skipLabel,
}: {
  mode: Mode;
  hard: boolean;
  exclude: Set<number>;
  disabled?: boolean;
  onGuess: (id: number) => void;
  onSkip?: () => void;
  skipLabel?: string;
}) {
  const [options, setOptions] = useState<Option[]>([]);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const listId = useId();

  useEffect(() => {
    let alive = true;
    fetchOptions(mode, hard).then((o) => alive && setOptions(o));
    return () => {
      alive = false;
    };
  }, [mode, hard]);

  const matches = useMemo(() => {
    const nq = norm(q);
    const pool = options.filter((o) => !exclude.has(o.id));
    if (!nq) return pool.slice(0, 80);
    const scored: [number, Option][] = [];
    for (const o of pool) {
      const t = norm(o.title);
      const sub = norm(o.sub);
      let score = -1;
      if (t === nq) score = 0;
      else if (t.startsWith(nq)) score = 1;
      else if (t.split(" ").some((w) => w.startsWith(nq))) score = 2;
      else if (t.includes(nq)) score = 3;
      else if (t.replace(/ /g, "").includes(nq.replace(/ /g, ""))) score = 4;
      else if (sub.includes(nq)) score = 5;
      if (score >= 0) scored.push([score, o]);
    }
    return scored.sort((a, b) => a[0] - b[0] || a[1].title.localeCompare(b[1].title)).map((s) => s[1]).slice(0, 80);
  }, [q, options, exclude]);

  useEffect(() => {
    listRef.current?.querySelector(`[data-idx="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active]);

  const choose = (o: Option | undefined) => {
    if (!o || disabled) return;
    onGuess(o.id);
    setQ("");
    setOpen(false);
    // on touch devices drop the keyboard so the result is visible
    if (window.matchMedia("(pointer: coarse)").matches) inputRef.current?.blur();
    else inputRef.current?.focus();
  };

  const placeholder = mode === "cover" ? "Which release is this?" : "Type a song title…";

  return (
    <div className="relative">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-faint" size={18} aria-hidden />
          <input
            ref={inputRef}
            className="input pl-10"
            value={q}
            disabled={disabled}
            placeholder={options.length ? placeholder : "Loading songs…"}
            onChange={(e) => {
              setQ(e.target.value);
              setActive(0);
              setOpen(true);
            }}
            onFocus={() => {
              setOpen(true);
              if (window.matchMedia("(max-width: 640px)").matches) {
                setTimeout(() => inputRef.current?.scrollIntoView({ block: "start", behavior: "smooth" }), 250);
              }
            }}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setOpen(true);
                setActive((a) => Math.min(a + 1, matches.length - 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActive((a) => Math.max(a - 1, 0));
              } else if (e.key === "Enter") {
                e.preventDefault();
                if (q.trim()) choose(matches[active]);
              } else if (e.key === "Escape") {
                setOpen(false);
              }
            }}
            role="combobox"
            aria-expanded={open}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={open && matches[active] ? `${listId}-${active}` : undefined}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="none"
            spellCheck={false}
            enterKeyHint="go"
          />
        </div>
        {onSkip && (
          <button type="button" className="btn btn-ghost shrink-0 px-4" onClick={onSkip} disabled={disabled}>
            <SkipForward size={16} aria-hidden />
            <span className="text-sm">{skipLabel ?? "Skip"}</span>
          </button>
        )}
      </div>

      {open && !disabled && (
        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          className="panel no-scrollbar absolute inset-x-0 top-[calc(100%+6px)] z-20 max-h-[min(22rem,45dvh)] overflow-y-auto overscroll-contain p-1.5"
        >
          {matches.length === 0 && <li className="px-3 py-4 text-center text-sm text-faint">No matches</li>}
          {matches.map((o, i) => (
            <li
              key={o.id}
              id={`${listId}-${i}`}
              data-idx={i}
              role="option"
              aria-selected={i === active}
              onPointerDown={(e) => e.preventDefault()}
              onClick={() => choose(o)}
              onMouseEnter={() => setActive(i)}
              className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-lg px-2 py-1.5 ${
                i === active ? "bg-gold/15" : ""
              }`}
            >
              {o.cover ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={o.cover.replace("1000x1000", "120x120")} alt="" className="size-10 shrink-0 rounded-md object-cover" loading="lazy" />
              ) : (
                <span className="grid size-10 shrink-0 place-items-center rounded-md bg-surface-3 font-gothic text-gold">✝</span>
              )}
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{o.title}</span>
                <span className="block truncate text-xs text-faint">
                  {o.sub}
                  {o.year ? ` · ${o.year}` : ""}
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
