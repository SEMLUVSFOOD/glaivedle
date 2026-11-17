"use client";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { fmtDuration } from "@/lib/game/logic";
import type { CatalogSong } from "@/lib/game/types";
import { normTitle } from "@/lib/normalize";
import { ListenButton } from "./Listen";
import { Segmented } from "./ui";

type Pool = "all" | "released" | "unreleased";
type Sort = "az" | "new" | "old" | "project";

const SORTS: { value: Sort; label: string }[] = [
  { value: "project", label: "Project" },
  { value: "new", label: "Newest" },
  { value: "old", label: "Oldest" },
  { value: "az", label: "A–Z" },
];

const TYPE_ORDER = ["album", "ep", "single", "feature", "alias", "unreleased"];

const year = (s: CatalogSong) => s.date?.slice(0, 4) ?? "?";

export function SongDatabase() {
  const [songs, setSongs] = useState<CatalogSong[] | null>(null);
  const [error, setError] = useState(false);
  const [q, setQ] = useState("");
  const [pool, setPool] = useState<Pool>("all");
  const [types, setTypes] = useState<string[]>([]);
  const [sort, setSort] = useState<Sort>("project");
  const [open, setOpen] = useState<number | null>(null);
  const query = useDeferredValue(q);

  useEffect(() => {
    fetch("/api/songs")
      .then((r) => r.json())
      .then((d: { songs: CatalogSong[] }) => setSongs(d.songs))
      .catch(() => setError(true));
  }, []);

  const counts = useMemo(() => {
    const c = { all: 0, released: 0, unreleased: 0 } as Record<Pool, number>;
    for (const s of songs ?? []) {
      c.all++;
      c[s.pool]++;
    }
    return c;
  }, [songs]);

  // type chips available in the current pool
  const typeChips = useMemo(() => {
    const m = new Map<string, { label: string; n: number }>();
    for (const s of songs ?? []) {
      if (pool !== "all" && s.pool !== pool) continue;
      const e = m.get(s.type) ?? { label: s.type === "unreleased" ? "Leaks" : s.typeLabel, n: 0 };
      e.n++;
      m.set(s.type, e);
    }
    return [...m.entries()].sort((a, b) => TYPE_ORDER.indexOf(a[0]) - TYPE_ORDER.indexOf(b[0]));
  }, [songs, pool]);

  const list = useMemo(() => {
    const nq = normTitle(query);
    const out = (songs ?? []).filter(
      (s) =>
        (pool === "all" || s.pool === pool) &&
        (!types.length || types.includes(s.type)) &&
        (!nq ||
          normTitle(s.title).includes(nq) ||
          normTitle(s.project).includes(nq) ||
          s.collaborators.some((c) => normTitle(c).includes(nq))),
    );
    const byDate = (a: CatalogSong, b: CatalogSong) => (a.date ?? "0").localeCompare(b.date ?? "0");
    const byTitle = (a: CatalogSong, b: CatalogSong) => a.title.localeCompare(b.title, undefined, { sensitivity: "base" });
    if (sort === "az") out.sort(byTitle);
    else if (sort === "new") out.sort((a, b) => byDate(b, a) || byTitle(a, b));
    else if (sort === "old") out.sort((a, b) => byDate(a, b) || byTitle(a, b));
    else {
      // a project's newest date keeps all its songs together, even ones that first came out earlier
      const groupDate = new Map<string, string>();
      for (const s of out) {
        const k = `${s.type}:${s.project}`;
        if ((s.date ?? "0") > (groupDate.get(k) ?? "0")) groupDate.set(k, s.date ?? "0");
      }
      const gd = (s: CatalogSong) => groupDate.get(`${s.type}:${s.project}`) ?? "0";
      out.sort(
        (a, b) =>
          TYPE_ORDER.indexOf(a.type) - TYPE_ORDER.indexOf(b.type) ||
          gd(b).localeCompare(gd(a)) ||
          a.project.localeCompare(b.project) ||
          (a.track ?? 99) - (b.track ?? 99) ||
          byTitle(a, b),
      );
    }
    return out;
  }, [songs, pool, types, query, sort]);

  // group headings in project view
  const groups = useMemo(() => {
    if (sort !== "project") return [{ key: "all", title: null as string | null, meta: "", songs: list }];
    const g: { key: string; title: string; meta: string; songs: CatalogSong[] }[] = [];
    for (const s of list) {
      const key = `${s.type}:${s.project}`;
      let last = g[g.length - 1];
      if (!last || last.key !== key) {
        last = { key, title: s.project, meta: s.typeLabel, songs: [] };
        g.push(last);
      }
      last.songs.push(s);
    }
    for (const x of g) {
      const newest = x.songs.reduce((m, s) => ((s.date ?? "") > m ? (s.date ?? "") : m), "");
      if (newest) x.meta += ` · ${newest.slice(0, 4)}`;
      x.meta += ` · ${x.songs.length}`;
    }
    return g;
  }, [list, sort]);

  if (error) return <p className="small">Couldn&apos;t load the songs. Refresh to try again.</p>;
  if (!songs) return <p className="small blink">Loading</p>;

  const toggleType = (t: string) => setTypes((ts) => (ts.includes(t) ? ts.filter((x) => x !== t) : [...ts, t]));

  return (
    <div className="space-y-5">
      <div className="sticky top-0 z-10 -mx-[var(--margin)] bg-bg/95 px-[var(--margin)] pt-2 pb-2 backdrop-blur-sm">
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search songs, projects, collabs…"
          className="input"
          aria-label="Search songs"
          enterKeyHint="search"
        />
      </div>
      <div className="-mt-2 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Segmented<Pool>
            label="Song pool"
            value={pool}
            onChange={(p) => {
              setPool(p);
              setTypes([]);
            }}
            options={[
              { value: "all", label: "All", tag: counts.all },
              { value: "released", label: "Released", tag: counts.released },
              { value: "unreleased", label: "Unreleased", tag: counts.unreleased },
            ]}
          />
        </div>
        <div className="no-scrollbar -mx-[var(--margin)] flex gap-1.5 overflow-x-auto px-[var(--margin)]" role="group" aria-label="Filter by type">
          {typeChips.map(([t, { label, n }]) => (
            <button
              key={t}
              type="button"
              aria-pressed={types.includes(t)}
              onClick={() => toggleType(t)}
              className={`small shrink-0 rounded-full border border-fg px-3 py-1 whitespace-nowrap ${types.includes(t) ? "bg-fg text-bg" : "hoverable"}`}
            >
              {label}
              <sup className="caption ml-1 text-[10px]">[{n}]</sup>
            </button>
          ))}
        </div>
        <div className="small flex items-center justify-between gap-3">
          <span className="tabular-nums">
            {list.length} {list.length === 1 ? "song" : "songs"}
          </span>
          <label className="flex items-center gap-2">
            Sort
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as Sort)}
              className="rounded-[6px] border border-fg bg-transparent px-2 py-1 text-fg-hover"
            >
              {SORTS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {list.length === 0 && (
        <div className="small space-y-2">
          <p>No songs match.</p>
          <button
            type="button"
            className="hoverable underline underline-offset-4"
            onClick={() => {
              setQ("");
              setPool("all");
              setTypes([]);
            }}
          >
            Clear filters →
          </button>
        </div>
      )}

      {groups.map((g) => (
        <section key={g.key} className="arrive">
          {g.title && (
            <h2 className="mb-1 flex items-baseline justify-between gap-3 border-b border-faint pb-1">
              <span className="nav-link text-[clamp(20px,5vw,26px)]!">{g.title}</span>
              <span className="small shrink-0 text-soft">{g.meta}</span>
            </h2>
          )}
          <ul>
            {g.songs.map((s) => (
              <Row key={s.id} s={s} open={open === s.id} onToggle={() => setOpen(open === s.id ? null : s.id)} grouped={!!g.title} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function Row({ s, open, onToggle, grouped }: { s: CatalogSong; open: boolean; onToggle: () => void; grouped: boolean }) {
  return (
    <li className="border-b border-faint last:border-0">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="hoverable grid w-full grid-cols-[44px_1fr_auto] items-center gap-3 py-2 text-left"
      >
        {s.cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={s.cover} alt="" loading="lazy" className="size-11 object-cover" />
        ) : (
          <span className="caption grid size-11 place-items-center bg-faint text-[10px] text-soft" aria-hidden>
            {s.pool === "unreleased" ? "LEAK" : "—"}
          </span>
        )}
        <span className="min-w-0">
          <span className="block truncate text-[17px] leading-tight tracking-[-0.03em] text-fg-hover">{s.title}</span>
          <span className="small block truncate">
            {grouped
              ? [s.track ? `#${s.track}` : null, s.collaborators.length ? `w/ ${s.collaborators.join(", ")}` : null, fmtDuration(s.duration)]
                  .filter(Boolean)
                  .join(" · ")
              : `${s.project} · ${year(s)}`}
          </span>
        </span>
        <span className="caption text-[10px] text-soft" aria-hidden>
          {s.pool === "unreleased" ? <span className="text-bad">UNREL</span> : open ? "–" : "+"}
        </span>
      </button>
      {open && (
        <dl className="small arrive grid grid-cols-[6.5rem_1fr] gap-x-3 gap-y-1 pb-3 pl-[56px]">
          <dt>Project</dt>
          <dd className="text-fg-hover">{s.project}</dd>
          <dt>Type</dt>
          <dd className="text-fg-hover">{s.typeLabel}</dd>
          <dt>Released</dt>
          <dd className="text-fg-hover">{s.pool === "unreleased" && s.type === "unreleased" ? `leaked · ${year(s)} era` : (s.date ?? "?")}</dd>
          {s.duration ? (
            <>
              <dt>Length</dt>
              <dd className="text-fg-hover">{fmtDuration(s.duration)}</dd>
            </>
          ) : null}
          {s.track ? (
            <>
              <dt>Track</dt>
              <dd className="text-fg-hover">#{s.track}</dd>
            </>
          ) : null}
          <dt>Collabs</dt>
          <dd className="text-fg-hover">{s.collaborators.length ? s.collaborators.join(", ") : "Solo"}</dd>
          {s.producers.length > 0 && (
            <>
              <dt>Producers</dt>
              <dd className="text-fg-hover">{s.producers.join(", ")}</dd>
            </>
          )}
          <dt>In modes</dt>
          <dd className="text-fg-hover">
            {["Classic", s.lyrics && "Lyrics", s.audio && "Audio"].filter(Boolean).join(", ")}
            {s.pool === "unreleased" && " (Unreleased pool)"}
          </dd>
          <dt className="self-center">Listen</dt>
          <dd>
            <ListenButton song={s.id} className="hoverable text-fg-hover underline underline-offset-4" />
          </dd>
        </dl>
      )}
    </li>
  );
}
