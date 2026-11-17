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

export type DzAlbum = {
  id: number;
  title: string;
  label?: string;
  release_date?: string;
  record_type?: string;
  cover_xl?: string;
  cover_big?: string;
  artist?: { id: number; name: string };
};

export const album = (albumId: string | number) => dz<DzAlbum>(`/album/${albumId}`);

/**
 * Every release credited to an artist. Deezer's /artist/{id}/albums silently misses releases
 * (e.g. glaive's "then i'll be happy", "cloak n dagger", early singles), so union it with a
 * paginated album search filtered on the artist id.
 */
export async function allReleaseIds(artistId: number, name: string): Promise<number[]> {
  const ids = new Set<number>((await artistAlbums(artistId)).filter((a) => a.record_type !== "compile").map((a) => a.id));
  for (let index = 0; index < 400; index += 100) {
    const page = await dz<DzPage<DzAlbumSummary & { artist: { id: number } }>>(
      `/search/album?q=${encodeURIComponent(`artist:"${name}"`)}&limit=100&index=${index}`,
    );
    for (const a of page.data) if (a.artist?.id === artistId && a.record_type !== "compile") ids.add(a.id);
    if (!page.next || page.data.length === 0) break;
  }
  return [...ids];
}

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

/**
 * Is this title a released track that credits the artist (e.g. a feature on someone else's song)?
 * Used to keep released features from being mistaken for unreleased uploads.
 */
export async function findCreditedTrack(title: string, artist: DzArtist, selfIds: Set<number>): Promise<DzTrack | null> {
  const res = await dz<DzPage<DzTrackSummary>>(`/search/track?q=${encodeURIComponent(`${title} ${artist.name}`)}&limit=10`);
  const want = title.toLowerCase().replace(/[^a-z0-9]+/g, "");
  for (const t of res.data.slice(0, 6)) {
    if (!t.title.toLowerCase().replace(/[^a-z0-9]+/g, "").includes(want)) continue;
    const full = await track(t.id).catch(() => null);
    if (full?.contributors?.some((c) => selfIds.has(c.id))) return full;
  }
  return null;
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
