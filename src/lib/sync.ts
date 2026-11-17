import "server-only";
import { db } from "./db";
import { env } from "./env";
import { featuresFromTitle, isVariantTitle, normName, normTitle, stripFeatures, uniqueNames } from "./normalize";
import * as deezer from "./sources/deezer";
import * as genius from "./sources/genius";
import * as lrclib from "./sources/lrclib";

type ReleaseType = "album" | "ep" | "single" | "feature" | "unreleased";
const RANK: Record<ReleaseType, number> = { album: 0, ep: 1, single: 2, feature: 3, unreleased: 4 };

type ReleaseDraft = {
  key: string; // deezer id or synthetic
  title: string;
  type: ReleaseType;
  releaseDate: string | null;
  cover: string | null;
};

type SongDraft = {
  norm: string;
  title: string;
  release: ReleaseDraft | null;
  trackNumber: number | null;
  duration: number | null;
  releaseDate: string | null;
  deezerId: string | null;
  geniusId: string | null;
  geniusUrl: string | null;
  cover: string | null;
  collaborators: string[];
  producers: string[];
  hasPreview: boolean;
  unreleased: boolean;
  isFeature: boolean;
};

const JUNK_RE = /\b(snippet|tracklist|annotated|interview|skit|credits|discography|setlist|freestyle\s*\(live\))\b|\*|\[unreleased\]\s*$/i;

let running: Promise<SyncResult> | null = null;

export type SyncResult = { ok: boolean; songs: number; log: string[] };

/** Runs a full catalog sync for the configured artist. Concurrent calls share one run. */
export function syncArtist(opts: { slug?: string; name?: string; deezerId?: string } = {}): Promise<SyncResult> {
  running ??= doSync({
    slug: opts.slug ?? env.artistSlug,
    name: opts.name ?? env.artistName,
    deezerId: opts.deezerId ?? env.deezerArtistId,
  }).finally(() => {
    running = null;
  });
  return running;
}

export const isSyncRunning = () => running !== null;

async function doSync({ slug, name, deezerId }: { slug: string; name: string; deezerId: string }): Promise<SyncResult> {
  const log: string[] = [];
  const say = (m: string) => {
    log.push(`${new Date().toISOString().slice(11, 19)} ${m}`);
    console.log(`[sync:${slug}] ${m}`);
  };
  const d = db();

  d.prepare(
    `INSERT INTO artists (slug, name) VALUES (?, ?) ON CONFLICT(slug) DO NOTHING`,
  ).run(slug, name);
  const artistRow = d.prepare("SELECT id FROM artists WHERE slug = ?").get(slug) as { id: number };
  const artistId = artistRow.id;
  d.prepare("UPDATE artists SET sync_status = 'running' WHERE id = ?").run(artistId);

  try {
    // ── 1. Deezer: official catalogue ───────────────────────────────────
    const artist = await deezer.findArtist(deezerId || name);
    if (!artist) throw new Error(`Artist "${name}" not found on Deezer`);
    say(`Deezer artist: ${artist.name} (#${artist.id})`);
    d.prepare("UPDATE artists SET name = ?, deezer_id = ?, image_url = ? WHERE id = ?").run(
      artist.name,
      String(artist.id),
      artist.picture_xl ?? artist.picture_big ?? null,
      artistId,
    );

    const albums = (await deezer.artistAlbums(artist.id)).filter(
      (a) => a.record_type !== "compile" && !isVariantTitle(a.title),
    );
    say(`Found ${albums.length} releases`);

    const songs = new Map<string, SongDraft>();
    const allReleases = new Map<string, ReleaseDraft>();
    const consider = (draft: SongDraft) => {
      const prev = songs.get(draft.norm);
      if (!prev) return void songs.set(draft.norm, draft);
      // keep the "home" release (album > ep > single), earliest date overall
      const better =
        draft.release && (!prev.release || RANK[draft.release.type] < RANK[prev.release.type]);
      const earliest = [prev.releaseDate, draft.releaseDate].filter(Boolean).sort()[0] ?? null;
      const merged = better ? { ...draft } : { ...prev };
      merged.releaseDate = earliest;
      merged.hasPreview = prev.hasPreview || draft.hasPreview;
      merged.collaborators = uniqueNames([...prev.collaborators, ...draft.collaborators]);
      songs.set(draft.norm, merged);
    };

    for (const album of albums) {
      const type: ReleaseType = album.record_type === "album" ? "album" : album.record_type === "ep" ? "ep" : "single";
      const release: ReleaseDraft = {
        key: String(album.id),
        title: album.title,
        type,
        releaseDate: album.release_date || null,
        cover: album.cover_xl || album.cover_big || null,
      };
      allReleases.set(release.key, release);
      const tracks = await deezer.albumTracks(album.id);
      tracks.forEach((t, i) => {
        if (isVariantTitle(t.title)) return;
        const norm = normTitle(t.title);
        if (!norm) return;
        consider({
          norm,
          title: stripFeatures(t.title),
          release,
          trackNumber: t.track_position ?? i + 1,
          duration: t.duration || null,
          releaseDate: release.releaseDate,
          deezerId: String(t.id),
          geniusId: null,
          geniusUrl: null,
          cover: release.cover,
          collaborators: featuresFromTitle(t.title),
          producers: [],
          hasPreview: !!t.preview,
          unreleased: false,
          isFeature: false,
        });
      });
    }
    say(`${songs.size} unique songs on own releases`);

    // contributors (collabs) — only fetch for songs we haven't stored yet
    const known = new Map(
      (
        d.prepare("SELECT title_norm, deezer_id, collaborators FROM songs WHERE artist_id = ?").all(artistId) as {
          title_norm: string;
          deezer_id: string | null;
          collaborators: string;
        }[]
      ).map((r) => [r.title_norm, r]),
    );
    let fetched = 0;
    for (const s of songs.values()) {
      const k = known.get(s.norm);
      if (k && k.deezer_id === s.deezerId) {
        s.collaborators = uniqueNames([...s.collaborators, ...(JSON.parse(k.collaborators) as string[])]);
        continue;
      }
      try {
        const t = await deezer.track(s.deezerId!);
        s.collaborators = uniqueNames([
          ...s.collaborators,
          ...(t.contributors ?? []).filter((c) => c.id !== artist.id).map((c) => c.name),
        ]);
        fetched++;
      } catch {
        /* non-fatal */
      }
    }
    say(`Fetched contributor credits for ${fetched} new songs`);

    // ── 2. Features on other artists' songs (hard mode) ────────────────
    try {
      const feats = await deezer.featuredOn(artist);
      for (const t of feats) {
        if (isVariantTitle(t.title)) continue;
        const norm = normTitle(t.title);
        if (!norm || songs.has(norm)) continue;
        songs.set(norm, {
          norm,
          title: stripFeatures(t.title),
          release: {
            key: `feat:${t.album.id}`,
            title: t.album.title,
            type: "feature",
            releaseDate: t.release_date ?? t.album.release_date ?? null,
            cover: t.album.cover_xl || t.album.cover_big || null,
          },
          trackNumber: t.track_position || null,
          duration: t.duration || null,
          releaseDate: t.release_date ?? t.album.release_date ?? null,
          deezerId: String(t.id),
          geniusId: null,
          geniusUrl: null,
          cover: t.album.cover_xl || t.album.cover_big || null,
          collaborators: uniqueNames(
            [t.artist.name, ...(t.contributors ?? []).map((c) => c.name)].filter(
              (n) => normName(n) !== normName(artist.name),
            ),
          ),
          producers: [],
          hasPreview: !!t.preview,
          unreleased: false,
          isFeature: true,
        });
      }
      say(`Found ${feats.length} features on other artists' tracks`);
    } catch (e) {
      say(`Features lookup failed: ${(e as Error).message}`);
    }

    // ── 3. Genius: producers + unreleased songs ─────────────────────────
    if (genius.geniusEnabled()) {
      try {
        const gId = await genius.findArtistId(artist.name);
        if (gId) {
          d.prepare("UPDATE artists SET genius_id = ? WHERE id = ?").run(String(gId), artistId);
          const gSongs = await genius.artistSongs(gId);
          say(`Genius: ${gSongs.length} songs`);
          const stored = new Map(
            (
              d.prepare("SELECT title_norm, genius_id, producers FROM songs WHERE artist_id = ?").all(artistId) as {
                title_norm: string;
                genius_id: string | null;
                producers: string;
              }[]
            ).map((r) => [r.title_norm, r]),
          );
          let added = 0;
          for (const gs of gSongs) {
            if (JUNK_RE.test(gs.title) || isVariantTitle(gs.title)) continue;
            const norm = normTitle(gs.title);
            if (!norm) continue;
            const existing = songs.get(norm);
            const prev = stored.get(norm);
            let producers: string[] = prev?.genius_id === String(gs.id) ? JSON.parse(prev.producers) : [];
            let features: string[] = [];
            let releaseDate: string | null = null;
            if (!producers.length) {
              const full = await genius.song(gs.id).catch(() => null);
              producers = full?.producer_artists.map((p) => p.name) ?? [];
              features = full?.featured_artists.map((p) => p.name) ?? [];
              releaseDate = full?.release_date ?? null;
            }
            if (existing) {
              existing.geniusId = String(gs.id);
              existing.geniusUrl = gs.url;
              existing.producers = uniqueNames(producers);
              continue;
            }
            if (gs.lyrics_state === "instrumental") continue;
            const c = gs.release_date_components;
            const date =
              releaseDate ??
              (c?.year ? `${c.year}-${String(c.month ?? 1).padStart(2, "0")}-${String(c.day ?? 1).padStart(2, "0")}` : null);
            songs.set(norm, {
              norm,
              title: stripFeatures(gs.title),
              release: null,
              trackNumber: null,
              duration: null,
              releaseDate: date,
              deezerId: null,
              geniusId: String(gs.id),
              geniusUrl: gs.url,
              cover: gs.song_art_image_url ?? null,
              collaborators: uniqueNames([...features, ...featuresFromTitle(gs.title)]),
              producers: uniqueNames(producers),
              hasPreview: false,
              unreleased: true,
              isFeature: false,
            });
            added++;
          }
          say(`Genius: ${added} unreleased / non-streaming songs added`);
        } else {
          say("Genius: artist not found");
        }
      } catch (e) {
        say(`Genius failed: ${(e as Error).message}`);
      }
    } else {
      say("Genius: skipped (no GENIUS_ACCESS_TOKEN)");
    }

    // ── 4. Persist ─────────────────────────────────────────────────────
    const upsertRelease = d.prepare(`
      INSERT INTO releases (artist_id, deezer_id, title, title_norm, type, release_date, cover_url)
      VALUES (@artistId, @key, @title, @norm, @type, @releaseDate, @cover)
      ON CONFLICT(artist_id, deezer_id) DO UPDATE SET
        title = excluded.title, title_norm = excluded.title_norm, type = excluded.type,
        release_date = excluded.release_date, cover_url = excluded.cover_url
      RETURNING id`);
    const upsertSong = d.prepare(`
      INSERT INTO songs (artist_id, title, title_norm, release_id, track_number, duration, release_date,
        deezer_id, genius_id, genius_url, cover_url, collaborators, producers, has_preview, unreleased, is_feature)
      VALUES (@artistId, @title, @norm, @releaseId, @trackNumber, @duration, @releaseDate,
        @deezerId, @geniusId, @geniusUrl, @cover, @collaborators, @producers, @hasPreview, @unreleased, @isFeature)
      ON CONFLICT(artist_id, title_norm) DO UPDATE SET
        title = excluded.title, release_id = excluded.release_id, track_number = excluded.track_number,
        duration = excluded.duration, release_date = excluded.release_date, deezer_id = excluded.deezer_id,
        genius_id = COALESCE(excluded.genius_id, songs.genius_id),
        genius_url = COALESCE(excluded.genius_url, songs.genius_url),
        cover_url = excluded.cover_url, collaborators = excluded.collaborators,
        producers = CASE WHEN excluded.producers = '[]' THEN songs.producers ELSE excluded.producers END,
        has_preview = excluded.has_preview, unreleased = excluded.unreleased, is_feature = excluded.is_feature`);

    d.transaction(() => {
      const releaseIds = new Map<string, number>();
      // every own release is stored (cover mode uses them), even if its songs live on an album
      for (const r of allReleases.values()) {
        const row = upsertRelease.get({
          artistId,
          key: r.key,
          title: r.title,
          norm: normTitle(r.title),
          type: r.type,
          releaseDate: r.releaseDate,
          cover: r.cover,
        }) as { id: number };
        releaseIds.set(r.key, row.id);
      }
      for (const s of songs.values()) {
        let releaseId: number | null = null;
        if (s.release) {
          releaseId = releaseIds.get(s.release.key) ?? null;
          if (releaseId === null) {
            const r = upsertRelease.get({
              artistId,
              key: s.release.key,
              title: s.release.title,
              norm: normTitle(s.release.title),
              type: s.release.type,
              releaseDate: s.release.releaseDate,
              cover: s.release.cover,
            }) as { id: number };
            releaseId = r.id;
            releaseIds.set(s.release.key, releaseId);
          }
        }
        upsertSong.run({
          artistId,
          title: s.title,
          norm: s.norm,
          releaseId,
          trackNumber: s.trackNumber,
          duration: s.duration,
          releaseDate: s.releaseDate,
          deezerId: s.deezerId,
          geniusId: s.geniusId,
          geniusUrl: s.geniusUrl,
          cover: s.cover,
          collaborators: JSON.stringify(s.collaborators),
          producers: JSON.stringify(s.producers),
          hasPreview: s.hasPreview ? 1 : 0,
          unreleased: s.unreleased ? 1 : 0,
          isFeature: s.isFeature ? 1 : 0,
        });
      }
    })();
    say(`Saved ${songs.size} songs`);

    // ── 5. Lyrics: LRCLIB first, Genius scrape as fallback ──────────────
    const needLyrics = d
      .prepare(
        `SELECT s.id, s.title, s.duration, s.genius_url, r.title AS album, s.is_feature
         FROM songs s LEFT JOIN releases r ON r.id = s.release_id
         WHERE s.artist_id = ? AND s.lyrics IS NULL
           AND (s.lyrics_checked_at IS NULL OR s.lyrics_checked_at < datetime('now', '-3 days'))`,
      )
      .all(artistId) as {
      id: number;
      title: string;
      duration: number | null;
      genius_url: string | null;
      album: string | null;
      is_feature: number;
    }[];
    const setLyrics = d.prepare(
      "UPDATE songs SET lyrics = ?, lyrics_source = ?, lyrics_checked_at = datetime('now') WHERE id = ?",
    );
    let fromLrc = 0;
    let fromGenius = 0;
    for (const s of needLyrics) {
      let lyrics = await lrclib.lyricsFor(artist.name, s.title, s.album, s.duration).catch(() => null);
      let source = "lrclib";
      if (!lyrics && s.genius_url) {
        lyrics = await genius.scrapeLyrics(s.genius_url);
        source = "genius";
      }
      setLyrics.run(lyrics, lyrics ? source : null, s.id);
      if (lyrics && source === "lrclib") fromLrc++;
      else if (lyrics) fromGenius++;
    }
    say(`Lyrics: ${fromLrc} from LRCLIB, ${fromGenius} from Genius, ${needLyrics.length - fromLrc - fromGenius} missing`);

    d.prepare(
      "UPDATE artists SET sync_status = 'ok', last_synced_at = datetime('now'), sync_log = ? WHERE id = ?",
    ).run(log.join("\n"), artistId);
    return { ok: true, songs: songs.size, log };
  } catch (e) {
    say(`FAILED: ${(e as Error).message}`);
    d.prepare("UPDATE artists SET sync_status = 'error', sync_log = ? WHERE id = ?").run(log.join("\n"), artistId);
    return { ok: false, songs: 0, log };
  }
}
