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
