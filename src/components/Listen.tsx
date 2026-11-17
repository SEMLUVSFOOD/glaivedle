"use client";
import { useEffect, useRef, useState } from "react";
import { save } from "@/lib/client/storage";
import { type ListenLinks, PLATFORM_LABEL, type Platform, type PlatformKey } from "@/lib/game/types";
import { useStored } from "./Providers";

export const PLATFORM_CHOICES: PlatformKey[] = ["spotify", "apple", "youtubemusic", "youtube", "deezer", "soundcloud", "tidal", "amazon"];

/** Preferred platform ("ask" = always show the chooser). */
export function usePlatform() {
  const value = useStored<PlatformKey | "ask">("platform", "ask");
  return [value, (v: PlatformKey | "ask") => save("platform", v)] as const;
}

const cache = new Map<string, Promise<ListenLinks | null>>();
function fetchLinks(query: string) {
  if (!cache.has(query)) {
    cache.set(
      query,
      fetch(`/api/listen?${query}`)
        .then((r) => (r.ok ? (r.json() as Promise<ListenLinks>) : null))
        .catch(() => {
          cache.delete(query);
          return null;
        }),
    );
  }
  return cache.get(query)!;
}

const open = (url: string) => window.open(url, "_blank", "noopener,noreferrer");

/**
 * "Listen" button: opens your preferred platform directly, or a sheet to pick one
 * (Spotify, Apple Music, YouTube, …). Picking one can make it your default.
 */
export function ListenButton({
  song,
  release,
  className = "btn",
  label = "Listen",
}: {
  song?: number;
  release?: number;
  className?: string;
  label?: string;
}) {
  const query = song ? `song=${song}` : `release=${release}`;
  const [pref] = usePlatform();
  const [links, setLinks] = useState<ListenLinks | null>(null);
  const [sheet, setSheet] = useState(false);
  const [loading, setLoading] = useState(false);

  // warm up in the background so the tap feels instant (and window.open isn't blocked)
  useEffect(() => {
    let alive = true;
    fetchLinks(query).then((l) => alive && setLinks(l));
    return () => {
      alive = false;
    };
  }, [query]);

  const preferred = pref !== "ask" ? links?.platforms.find((p) => p.key === pref) : undefined;

  const onClick = async () => {
    if (preferred) return open(preferred.url);
    if (!links) {
      setLoading(true);
      const l = await fetchLinks(query);
      setLinks(l);
      setLoading(false);
    }
    setSheet(true);
  };

  return (
    <>
      <span className="inline-flex items-stretch gap-1">
        <button type="button" onClick={() => void onClick()} className={className}>
          {loading ? "Loading…" : preferred ? `${label} on ${PLATFORM_LABEL[preferred.key]}` : `${label} →`}
        </button>
        {preferred && (
          <button type="button" onClick={() => setSheet(true)} className="small hoverable px-2 underline underline-offset-4" aria-label="Other platforms">
            Other
          </button>
        )}
      </span>
      {sheet && <ListenSheet links={links} onClose={() => setSheet(false)} />}
    </>
  );
}

function ListenSheet({ links, onClose }: { links: ListenLinks | null; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [pref, setPref] = usePlatform();
  const [remember, setRemember] = useState(pref !== "ask");

  useEffect(() => {
    ref.current?.showModal();
  }, []);

  const pick = (p: Platform) => {
    if (remember && PLATFORM_CHOICES.includes(p.key)) setPref(p.key);
    open(p.url);
    onClose();
  };

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === e.currentTarget && ref.current?.close()}
      className="sheet box p-0"
      aria-label="Choose where to listen"
    >
      <div className="px-5 pt-5 pb-[max(20px,env(safe-area-inset-bottom))]">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="caption mb-1">LISTEN ON</p>
            <p className="truncate text-[22px] leading-tight tracking-[-0.05em] text-fg-hover">{links?.title ?? "…"}</p>
            <p className="small truncate">{links?.artist}</p>
          </div>
          <button type="button" onClick={() => ref.current?.close()} className="small hoverable underline underline-offset-4">
            Close
          </button>
        </div>
        {!links ? (
          <p className="small">Couldn&apos;t load links right now.</p>
        ) : (
          <ul className="grid grid-cols-2 gap-2">
            {links.platforms.map((p) => (
              <li key={p.key}>
                <button
                  type="button"
                  onClick={() => pick(p)}
                  className={`btn w-full justify-between! px-3! text-left ${p.key === pref ? "btn-fill" : ""}`}
                >
                  <span className="truncate">{PLATFORM_LABEL[p.key]}</span>
                  {p.direct && <span className="caption text-[10px] opacity-70">SONG</span>}
                </button>
              </li>
            ))}
          </ul>
        )}
        <label className="small mt-4 flex items-center gap-2">
          <input
            type="checkbox"
            checked={remember}
            onChange={(e) => {
              setRemember(e.target.checked);
              if (!e.target.checked) setPref("ask");
            }}
            className="size-4 accent-[var(--fg)]"
          />
          Remember my choice (change it any time in Settings)
        </label>
        <p className="small mt-2 text-soft">SONG opens the track itself; the others open a search on that app.</p>
      </div>
    </dialog>
  );
}
