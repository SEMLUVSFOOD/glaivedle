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
  const data = await fetchJson<T & DzError>(path.startsWith("http") ? path : API + path, { minGapMs: 130 });
  if (!data) throw new Error(`Deezer: empty response for ${path}`);
  if (data.error) throw new Error(`Deezer: ${data.error.message} (${path})`);
  return data;
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

export const albumTracks = (albumId: string | number) =>
  all<DzTrackSummary>(`/album/${albumId}/tracks?limit=100`);

export const track = (trackId: string | number) => dz<DzTrack>(`/track/${trackId}`);

/** Tracks by *other* artists that credit this artist (features / collabs). */
export async function featuredOn(artist: DzArtist): Promise<DzTrack[]> {
  const found = new Map<number, DzTrackSummary>();
  for (const q of [artist.name, `feat ${artist.name}`, `with ${artist.name}`]) {
    const res = await dz<DzPage<DzTrackSummary>>(`/search/track?q=${encodeURIComponent(q)}&limit=60`);
    for (const t of res.data) if (t.artist.id !== artist.id) found.set(t.id, t);
  }
  // Deezer often omits "feat." in titles, so verify contributor credits per candidate (capped).
  const out: DzTrack[] = [];
  for (const id of [...found.keys()].slice(0, 120)) {
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
