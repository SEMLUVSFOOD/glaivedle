"use client";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { Mode, Option } from "@/lib/game/types";
import { useApp } from "../Providers";

const cache = new Map<string, Promise<Option[]>>();
function fetchOptions(mode: Mode, hard: boolean, noAlias: boolean) {
  const key = `${mode}:${hard}:${noAlias}`;
  if (!cache.has(key)) {
    cache.set(
      key,
      fetch(`/api/options?mode=${mode}&hard=${hard ? 1 : 0}${noAlias ? "&alias=0" : ""}`)
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
  const { covers, ovine } = useApp();
  const noAlias = hard && !ovine;
  const [options, setOptions] = useState<Option[]>([]);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const listId = useId();

  useEffect(() => {
    let alive = true;
    fetchOptions(mode, hard, noAlias).then((o) => alive && setOptions(o));
    return () => {
      alive = false;
    };
  }, [mode, hard, noAlias]);

  const matches = useMemo(() => {
    const nq = norm(q);
    const pool = options.filter((o) => !exclude.has(o.id));
    if (!nq) return pool.slice(0, 80);
    const scored: [number, Option][] = [];
    for (const o of pool) {
      const t = norm(o.title);
      let score = -1;
      if (t === nq) score = 0;
      else if (t.startsWith(nq)) score = 1;
      else if (t.split(" ").some((w) => w.startsWith(nq))) score = 2;
      else if (t.includes(nq)) score = 3;
      else if (t.replace(/ /g, "").includes(nq.replace(/ /g, ""))) score = 4;
      else if (norm(o.sub).includes(nq)) score = 5;
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
    if (window.matchMedia("(pointer: coarse)").matches) inputRef.current?.blur();
    else inputRef.current?.focus();
  };

  return (
    <div className="relative">
      <div className="flex gap-2">
        <input
          ref={inputRef}
          className="input flex-1"
          value={q}
          disabled={disabled}
          placeholder={!options.length ? "Loading…" : mode === "cover" ? "Which release is this?" : "Type a song…"}
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
        {onSkip && (
          <button type="button" className="btn shrink-0" onClick={onSkip} disabled={disabled}>
            {skipLabel ?? "Skip"}
          </button>
        )}
      </div>

      {open && !disabled && (
        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          className="box no-scrollbar absolute inset-x-0 top-[calc(100%+6px)] z-20 max-h-[min(22rem,46dvh)] overflow-y-auto overscroll-contain bg-bg p-1"
        >
          {matches.length === 0 && <li className="small px-3 py-4">No matches</li>}
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
              className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-[6px] px-2 py-1.5 ${i === active ? "pill" : ""}`}
            >
              {covers && o.cover && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={o.cover.replace("1000x1000", "120x120")} alt="" className="size-10 shrink-0 object-cover" loading="lazy" />
              )}
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[17px] tracking-[-0.03em]">{o.title}</span>
                <span className="small block truncate opacity-80">
                  {o.sub}
                  {o.year ? ` – ${o.year}` : ""}
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
