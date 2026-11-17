import "server-only";
import { fetchJson } from "./http";
import { normTitle } from "../normalize";

const API = "https://lrclib.net/api";

type LrcRecord = {
  id: number;
  trackName: string;
  artistName: string;
  albumName: string | null;
  duration: number | null;
  instrumental: boolean;
  plainLyrics: string | null;
};

function usable(r: LrcRecord | null): r is LrcRecord & { plainLyrics: string } {
  return !!r && !r.instrumental && !!r.plainLyrics && r.plainLyrics.trim().split("\n").length >= 4;
}

/**
 * Finds plain lyrics for a song. Tries the exact signature lookup first,
 * then falls back to a search and picks the closest title/duration match.
 */
export async function lyricsFor(artist: string, title: string, album?: string | null, duration?: number | null) {
  if (album && duration) {
    const q = new URLSearchParams({ artist_name: artist, track_name: title, album_name: album, duration: String(duration) });
    const exact = await fetchJson<LrcRecord>(`${API}/get?${q}`, { allow404: true, minGapMs: 250 }).catch(() => null);
    if (usable(exact)) return exact.plainLyrics;
  }
  const q = new URLSearchParams({ artist_name: artist, track_name: title });
  const hits = (await fetchJson<LrcRecord[]>(`${API}/search?${q}`, { minGapMs: 250 }).catch(() => null)) ?? [];
  const want = normTitle(title);
  const candidates = hits.filter(
    (h) => usable(h) && normTitle(h.trackName) === want && h.artistName.toLowerCase().includes(artist.toLowerCase()),
  );
  candidates.sort(
    (a, b) => Math.abs((a.duration ?? 0) - (duration ?? 0)) - Math.abs((b.duration ?? 0) - (duration ?? 0)),
  );
  return candidates[0]?.plainLyrics ?? null;
}

export type LrcHit = { trackName: string; artistName: string; albumName: string | null; duration: number | null; lyrics: string };

/**
 * Sweeps LRCLIB for everything uploaded under an artist (search caps at 20 hits per query,
 * so we fan out over title prefixes, keywords and "<release> (Sessions)" album names).
 */
export async function discover(artist: string, releaseTitles: string[]): Promise<LrcHit[]> {
  const queries: Record<string, string>[] = [];
  for (const c of "abcdefghijklmnopqrstuvwxyz0123456789") queries.push({ artist_name: artist, track_name: c });
  for (const w of ["sessions", "unreleased", "leak", "demo", "v1", "v2", "v3", "cut", "og", "ref", "unnamed", "snippet"]) {
    queries.push({ q: `${artist} ${w}` });
  }
  for (const r of releaseTitles) queries.push({ artist_name: artist, album_name: `${r} (Sessions)` });
  for (const a of ["unreleased", "unnamed", "sessions", "leaks"]) queries.push({ artist_name: artist, album_name: a });

  const out = new Map<string, LrcHit>();
  for (const q of queries) {
    const hits = (await fetchJson<LrcRecord[]>(`${API}/search?${new URLSearchParams(q)}`, { minGapMs: 220 }).catch(() => null)) ?? [];
    for (const h of hits) {
      if (!usable(h) || !h.artistName.toLowerCase().includes(artist.toLowerCase())) continue;
      out.set(`${h.artistName}|${h.trackName}|${h.albumName}`.toLowerCase(), {
        trackName: h.trackName,
        artistName: h.artistName,
        albumName: h.albumName,
        duration: h.duration,
        lyrics: h.plainLyrics,
      });
    }
  }
  return [...out.values()];
}
