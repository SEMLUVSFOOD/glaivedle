import "server-only";
import { fetchJson } from "./http";

const API = "https://api.deezer.com";

export type DzArtist = { id: number; name: string; picture_xl?: string; picture_big?: string };
export type DzAlbumSummary = {
  id: number;
  title: string;
  release_date: string;
  record_type: "album" | "ep" | "single" | "compile" | string;
  cover_xl: string;
  cover_big: string;
};
export type DzTrackSummary = {
  id: number;
  title: string;
  duration: number;
  track_position?: number;
  preview: string;
  readable?: boolean;
  artist: { id: number; name: string };
};
export type DzTrack = DzTrackSummary & {
  release_date?: string;
  track_position: number;
  contributors?: { id: number; name: string; role: string }[];
  album: { id: number; title: string; cover_xl: string; cover_big: string; release_date?: string };
};

type DzError = { error?: { message: string; code: number } };
type DzPage<T> = { data: T[]; next?: string; total?: number } & DzError;

async function dz<T>(path: string): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    const data = await fetchJson<T & DzError>(path.startsWith("http") ? path : API + path, { minGapMs: 130 });
    if (!data) throw new Error(`Deezer: empty response for ${path}`);
    // code 4 = "Quota limit exceeded" (50 requests / 5s), returned with HTTP 200
    if (data.error?.code === 4 && attempt < 5) {
      await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
      continue;
    }
    if (data.error) throw new Error(`Deezer: ${data.error.message} (${path})`);
    return data;
  }
}

async function all<T>(path: string): Promise<T[]> {
  const out: T[] = [];
  let next: string | undefined = path;
  for (let i = 0; next && i < 20; i++) {
    const page: DzPage<T> = await dz<DzPage<T>>(next);
    out.push(...page.data);
    next = page.next;
  }
  return out;
}

export async function findArtist(nameOrId: string): Promise<DzArtist | null> {
  if (/^\d+$/.test(nameOrId)) return dz<DzArtist>(`/artist/${nameOrId}`);
  const res = await dz<DzPage<DzArtist>>(`/search/artist?q=${encodeURIComponent(nameOrId)}&limit=10`);
  const exact = res.data.find((a) => a.name.toLowerCase() === nameOrId.toLowerCase());
  return exact ?? res.data[0] ?? null;
}

export const artistAlbums = (artistId: string | number) =>
  all<DzAlbumSummary>(`/artist/${artistId}/albums?limit=100`);

export type DzAlbum = DzAlbumSummary & { label?: string; artist: { id: number; name: string } };

export const album = (albumId: string | number) => dz<DzAlbum>(`/album/${albumId}`);

/**
 * Deezer's /artist/:id/albums silently leaves out some releases (e.g. glaive's "then i'll be happy"
 * EP and early singles), so also look through search results for albums credited to the artist.
 */
export async function searchOwnAlbums(artist: DzArtist, knownIds: Set<number>): Promise<DzAlbumSummary[]> {
  const ids = new Set<number>();
  const q = encodeURIComponent(`artist:"${artist.name}"`);
  for (const path of [`/search/album?q=${q}&limit=100`, `/search/track?q=${q}&limit=100`]) {
    let next: string | undefined = path;
    for (let i = 0; next && i < 4; i++) {
      const page: DzPage<{ id: number; artist: { id: number }; album?: { id: number } }> = await dz(next);
      for (const x of page.data) {
        if (x.artist.id !== artist.id) continue;
        const id = x.album?.id ?? x.id;
        if (!knownIds.has(id)) ids.add(id);
      }
      next = page.next;
    }
  }
  const out: DzAlbumSummary[] = [];
  for (const id of ids) {
    const a = await album(id).catch(() => null);
    if (a && a.artist?.id === artist.id) out.push(a);
  }
  return out;
}

export const albumTracks = (albumId: string | number) =>
  all<DzTrackSummary>(`/album/${albumId}/tracks?limit=100`);

export const track = (trackId: string | number) => dz<DzTrack>(`/track/${trackId}`);

/** Tracks by *other* artists that credit this artist (features / collabs). */
export async function featuredOn(artist: DzArtist): Promise<DzTrack[]> {
  const found = new Map<number, DzTrackSummary>();
  const n = artist.name;
  for (const q of [n, `feat ${n}`, `with ${n}`, `ft ${n}`, `${n} feat`]) {
    let next: string | undefined = `/search/track?q=${encodeURIComponent(q)}&limit=100`;
    for (let i = 0; next && i < 3; i++) {
      const res: DzPage<DzTrackSummary> = await dz<DzPage<DzTrackSummary>>(next);
      for (const t of res.data) if (t.artist.id !== artist.id) found.set(t.id, t);
      next = res.next;
    }
  }
  // Deezer often omits "feat." in titles, so verify contributor credits per candidate (capped).
  const out: DzTrack[] = [];
  for (const id of [...found.keys()].slice(0, 450)) {
    try {
      const full = await track(id);
      if (full.contributors?.some((c) => c.id === artist.id)) out.push(full);
    } catch {
      /* skip */
    }
  }
  return out;
}

/** Preview URLs are signed and expire, so always resolve a fresh one. */
export async function freshPreviewUrl(trackId: string): Promise<string | null> {
  try {
    const t = await track(trackId);
    return t.preview || null;
  } catch {
    return null;
  }
}
