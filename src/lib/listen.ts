import "server-only";
import { db } from "./db";
import { env } from "./env";
import type { ListenLinks, Platform } from "./game/types";
import { normName, normTitle } from "./normalize";
import { fetchJson } from "./sources/http";

/**
 * Builds "listen on…" links for a song or release so players can pick their own platform.
 * Deezer and Apple Music (via the free iTunes Search API, cached) link straight to the track;
 * the rest open a precise search, because their APIs need keys.
 */

type ITunesResult = { artistName: string; trackName?: string; collectionName?: string; trackViewUrl?: string; collectionViewUrl?: string };

async function appleMusicUrl(kind: "song" | "album", artist: string, title: string): Promise<string | null> {
  const key = `apple:${kind}:${normName(artist)}:${normTitle(title)}`;
  const d = db();
  const hit = d
    .prepare("SELECT url FROM listen_cache WHERE key = ? AND fetched_at > datetime('now', '-30 days')")
    .get(key) as { url: string | null } | undefined;
  if (hit) return hit.url;
  let url: string | null = null;
  try {
    const term = encodeURIComponent(`${artist} ${title}`);
    const res = await fetchJson<{ results: ITunesResult[] }>(
      `https://itunes.apple.com/search?term=${term}&entity=${kind === "song" ? "song" : "album"}&limit=10`,
      { minGapMs: 300, retries: 1 },
    );
    const want = normTitle(title);
    const match = res?.results.find(
      (r) =>
        normName(r.artistName).includes(normName(artist)) &&
        normTitle((kind === "song" ? r.trackName : r.collectionName) ?? "").replace(/ (single|ep)$/, "") === want,
    );
    url = (kind === "song" ? match?.trackViewUrl : match?.collectionViewUrl)?.replace(/[?&]uo=\d+/, "") ?? null;
  } catch {
    return null; // don't cache network errors
  }
  d.prepare("INSERT OR REPLACE INTO listen_cache (key, url) VALUES (?, ?)").run(key, url);
  return url;
}

const q = (s: string) => encodeURIComponent(s);

export async function listenLinks(input: {
  kind: "song" | "album";
  title: string;
  artist: string;
  deezerId: string | null;
  geniusUrl: string | null;
  unreleased: boolean;
}): Promise<ListenLinks> {
  const term = `${input.artist} ${input.title}`;
  const platforms: Platform[] = [];
  const add = (key: Platform["key"], url: string | null, direct: boolean) => url && platforms.push({ key, url, direct });

  if (input.deezerId) {
    const apple = await appleMusicUrl(input.kind, input.artist, input.title);
    add("spotify", `https://open.spotify.com/search/${q(term)}`, false);
    add("apple", apple ?? `https://music.apple.com/us/search?term=${q(term)}`, !!apple);
    add("youtubemusic", `https://music.youtube.com/search?q=${q(term)}`, false);
    add("youtube", `https://www.youtube.com/results?search_query=${q(term)}`, false);
    add("deezer", `https://www.deezer.com/${input.kind === "song" ? "track" : "album"}/${input.deezerId}`, true);
    add("soundcloud", `https://soundcloud.com/search?q=${q(term)}`, false);
    add("tidal", `https://listen.tidal.com/search?q=${q(term)}`, false);
    add("amazon", `https://music.amazon.com/search/${q(term)}`, false);
  } else {
    // leaks: not on streaming services, but usually on YouTube / SoundCloud
    add("youtube", `https://www.youtube.com/results?search_query=${q(`${term} leak`)}`, false);
    add("soundcloud", `https://soundcloud.com/search?q=${q(term)}`, false);
    if (input.unreleased && input.artist.toLowerCase() === env.artistName.toLowerCase()) {
      add("tracker", `https://www.unreleased.world/${q(env.artistSlug)}`, false);
    }
  }
  add("genius", input.geniusUrl, true);
  return { title: input.title, artist: input.artist, platforms };
}
