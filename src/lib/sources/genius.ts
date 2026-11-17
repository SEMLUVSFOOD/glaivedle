import "server-only";
import { parse } from "node-html-parser";
import { env } from "../env";
import { fetchJson, USER_AGENT } from "./http";

const API = "https://api.genius.com";

type GArtist = { id: number; name: string; url: string };
type GSongSummary = {
  id: number;
  title: string;
  url: string;
  lyrics_state: string;
  primary_artist: GArtist;
  release_date_components?: { year: number | null; month: number | null; day: number | null } | null;
  song_art_image_url?: string;
};
type GSong = GSongSummary & {
  release_date: string | null;
  album: { id: number; name: string } | null;
  featured_artists: GArtist[];
  producer_artists: GArtist[];
  media?: { provider: string; url: string }[];
};

export const geniusEnabled = () => !!env.geniusToken;

async function g<T>(path: string): Promise<T | null> {
  if (!env.geniusToken) return null;
  const res = await fetchJson<{ response: T }>(API + path, {
    headers: { Authorization: `Bearer ${env.geniusToken}` },
    minGapMs: 250,
    allow404: true,
  });
  return res?.response ?? null;
}

export async function findArtistId(name: string): Promise<number | null> {
  const res = await g<{ hits: { result: GSongSummary }[] }>(`/search?q=${encodeURIComponent(name)}&per_page=20`);
  const counts = new Map<number, number>();
  for (const h of res?.hits ?? []) {
    if (h.result.primary_artist.name.toLowerCase() === name.toLowerCase()) {
      counts.set(h.result.primary_artist.id, (counts.get(h.result.primary_artist.id) ?? 0) + 1);
    }
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
}

/** Every song where the artist is the primary artist. */
export async function artistSongs(artistId: number): Promise<GSongSummary[]> {
  const out: GSongSummary[] = [];
  for (let page = 1; page && page < 30; ) {
    const res = await g<{ songs: GSongSummary[]; next_page: number | null }>(
      `/artists/${artistId}/songs?per_page=50&page=${page}&sort=title`,
    );
    if (!res) break;
    out.push(...res.songs.filter((s) => s.primary_artist.id === artistId));
    page = res.next_page ?? 0;
  }
  return out;
}

export const song = (id: number) => g<{ song: GSong }>(`/songs/${id}?text_format=plain`).then((r) => r?.song ?? null);

/**
 * Best-effort lyrics scrape from a Genius song page (fallback only).
 * Genius has no lyrics API; this is used when LRCLIB has nothing.
 */
export async function scrapeLyrics(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT, Accept: "text/html" },
      signal: AbortSignal.timeout(15_000),
      cache: "no-store",
    });
    if (!res.ok) return null;
    const root = parse(await res.text(), { blockTextElements: { script: false, style: false } });
    const containers = root.querySelectorAll('[data-lyrics-container="true"]');
    if (!containers.length) return null;
    const text = containers
      .map((c) => {
        c.querySelectorAll('[data-exclude-from-selection="true"]').forEach((n) => n.remove());
        return c.innerHTML.replace(/<br\s*\/?>/gi, "\n");
      })
      .map((html) => parse(html).textContent)
      .join("\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
    return text.split("\n").length >= 4 ? decodeEntities(text) : null;
  } catch {
    return null;
  }
}

function decodeEntities(s: string) {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

export type { GSong, GSongSummary };
