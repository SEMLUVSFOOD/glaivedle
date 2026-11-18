import "server-only";
import { db } from "../db";
import { env } from "../env";
import { seal, unseal } from "../crypto";
import { eraLabel } from "../leaks";
import { listenLinks } from "../listen";
import { addDays, dateInTz, daysBetween } from "../dates";
import {
  type ClassicSong,
  clipSeconds,
  compareClassic,
  coverBlocks,
  hashString,
  LYRIC_LINES,
  rng,
  selectLyricLines,
  typeLabel,
} from "./logic";
import { type AnswerInfo, type CatalogSong, type ListenLinks, type GuessEntry, type Kind, type Mode, MODE_INFO, type Option, type RoundView } from "./types";

// ── Artist ───────────────────────────────────────────────────────────────

export type ArtistRow = {
  id: number;
  slug: string;
  name: string;
  image_url: string | null;
  last_synced_at: string | null;
  sync_status: string | null;
};

export function getArtist(slug = env.artistSlug): ArtistRow | null {
  return (
    (db()
      .prepare("SELECT id, slug, name, image_url, last_synced_at, sync_status FROM artists WHERE slug = ?")
      .get(slug) as ArtistRow | undefined) ?? null
  );
}

export const today = () => dateInTz(env.dailyTimezone);

export function puzzleNumber(date: string): number {
  return daysBetween(env.launchDate, date) + 1;
}

export function isPlayableDate(date: string): boolean {
  return date >= env.launchDate && date <= today();
}

// ── Song / release rows ─────────────────────────────────────────────────

type SongRow = {
  id: number;
  title: string;
  release_id: number | null;
  track_number: number | null;
  duration: number | null;
  release_date: string | null;
  deezer_id: string | null;
  genius_url: string | null;
  cover_url: string | null;
  collaborators: string;
  producers: string;
  lyrics: string | null;
  has_preview: number;
  unreleased: number;
  is_feature: number;
  enabled: number;
  era: string | null;
  r_title: string | null;
  r_type: string | null;
  r_cover: string | null;
  r_label: string | null;
  r_alias: string | null;
};

/** Released under an alias (ovine hall): a normal glaive release, only behind its own on/off switch. */
const isAlias = (s: SongRow) => s.r_alias !== null && s.r_alias !== undefined;

const SONG_SELECT = `
  SELECT s.*, r.title AS r_title, r.type AS r_type, r.cover_url AS r_cover, r.label AS r_label, r.alias AS r_alias
  FROM songs s LEFT JOIN releases r ON r.id = s.release_id`;

type ReleaseRow = { id: number; title: string; type: string; release_date: string | null; cover_url: string | null; deezer_id: string | null };

function songType(s: SongRow): string {
  if (s.unreleased) return "unreleased";
  if (s.is_feature) return "feature";
  return s.r_type ?? "single";
}

/** What a song's "project" is called: its release, or its leak era for unreleased songs. */
function projectOf(s: SongRow): string {
  if (s.unreleased) return eraLabel(s.era) ?? "Unreleased";
  return s.r_title ?? "Single";
}

function songById(artistId: number, id: number): SongRow | null {
  return (db().prepare(`${SONG_SELECT} WHERE s.artist_id = ? AND s.id = ?`).get(artistId, id) as SongRow) ?? null;
}

function releaseById(artistId: number, id: number): ReleaseRow | null {
  return (
    (db()
      .prepare("SELECT id, title, type, release_date, cover_url, deezer_id FROM releases WHERE artist_id = ? AND id = ?")
      .get(artistId, id) as ReleaseRow) ?? null
  );
}

/** Songs that can be *guessed* (autocomplete) for a difficulty. */
/**
 * Song pool id, also stored in daily_puzzles.hard / plays.hard. Two independent switches:
 * unreleased songs (leaks + features) and alias projects (ovine hall).
 *   0 = released            1 = unreleased + ovine hall
 *   2 = unreleased          3 = released + ovine hall
 * (0–2 keep their meaning from before ovine hall became its own switch.)
 */
export type PoolId = 0 | 1 | 2 | 3;
export const poolId = (hard: boolean, alias: boolean): PoolId => (hard ? (alias ? 1 : 2) : alias ? 3 : 0);

/** Is a song part of the pool for these switches? */
function inPool(s: SongRow, hard: boolean, alias: boolean): boolean {
  if (isAlias(s)) return alias;
  // features are released songs (a sub-category of released), so only leaks need the unreleased switch
  return hard || !s.unreleased;
}

function guessableSongs(artistId: number, hard: boolean, alias: boolean): SongRow[] {
  const aliasSql = "(r.alias IS NOT NULL)";
  const where = hard
    ? alias
      ? ""
      : `AND NOT ${aliasSql}`
    : `AND ((s.unreleased = 0 AND NOT ${aliasSql})${alias ? ` OR ${aliasSql}` : ""})`;
  return db()
    .prepare(`${SONG_SELECT} WHERE s.artist_id = ? AND s.enabled = 1 ${where} ORDER BY s.title COLLATE NOCASE`)
    .all(artistId) as SongRow[];
}

/** Releases for cover mode, deduped by title and identical artwork. */
function coverReleases(artistId: number, hard: boolean, alias: boolean): ReleaseRow[] {
  const rows = db()
    .prepare(
      `SELECT id, title, type, release_date, cover_url, deezer_id FROM releases
       WHERE artist_id = ? AND enabled = 1 AND cover_url IS NOT NULL
       ${
         hard
           ? alias
             ? ""
             : "AND alias IS NULL"
           : `AND ((alias IS NULL AND type != 'unreleased'
               AND NOT EXISTS (SELECT 1 FROM songs s WHERE s.release_id = releases.id AND s.unreleased = 1))
               ${alias ? "OR alias IS NOT NULL" : ""})`
       }
       ORDER BY CASE type WHEN 'album' THEN 0 WHEN 'ep' THEN 1 WHEN 'single' THEN 2 ELSE 3 END, release_date`,
    )
    .all(artistId) as ReleaseRow[];
  const seenTitle = new Set<string>();
  const seenCover = new Set<string>();
  return rows.filter((r) => {
    const t = r.title.toLowerCase();
    const c = coverKey(r.cover_url);
    if (seenTitle.has(t) || seenCover.has(c)) return false;
    seenTitle.add(t);
    seenCover.add(c);
    return true;
  });
}

/** Deezer cover URLs embed an md5 of the artwork; same md5 = same image. */
const coverKey = (url: string | null) => url?.match(/\/cover\/([0-9a-f]{32})\//)?.[1] ?? url ?? "";

function answerPool(artistId: number, mode: Mode, hard: boolean, alias: boolean): number[] {
  if (mode === "cover") return coverReleases(artistId, hard, alias).map((r) => r.id);
  return guessableSongs(artistId, hard, alias)
    .filter((s) => {
      if (mode === "lyrics") return !!s.lyrics && s.lyrics.split("\n").filter(Boolean).length >= 6;
      if (mode === "audio") return !!s.has_preview && !!s.deezer_id;
      return true;
    })
    .map((s) => s.id);
}

export function options(artistId: number, mode: Mode, hard: boolean, alias: boolean): Option[] {
  if (mode === "cover") {
    return coverReleases(artistId, hard, alias).map((r) => ({
      id: r.id,
      title: r.title,
      sub: typeLabel(r.type),
      cover: null, // never leak artwork in cover mode
      year: r.release_date?.slice(0, 4) ?? null,
    }));
  }
  return guessableSongs(artistId, hard, alias).map((s) => ({
    id: s.id,
    title: s.title,
    sub: s.unreleased
        ? `Unreleased · ${eraLabel(s.era) ?? "leak"}`
        : (s.r_title ?? "Single"),
    cover: s.r_cover ?? s.cover_url,
    year: s.release_date?.slice(0, 4) ?? null,
  }));
}


/** Every playable song, for the public database page. Never says which song is today's answer. */
export function catalog(artistId: number): CatalogSong[] {
  return guessableSongs(artistId, true, true).map((s) => {
    const type = songType(s);
    return {
      id: s.id,
      title: s.title,
      project: projectOf(s),
      type,
      typeLabel: typeLabel(type),
      pool: isAlias(s) ? "ovinehall" : s.unreleased ? "unreleased" : "released",
      date: s.release_date,
      duration: s.duration,
      track: s.unreleased && !isAlias(s) ? null : s.track_number,
      collaborators: JSON.parse(s.collaborators),
      producers: JSON.parse(s.producers),
      cover: (s.r_cover ?? s.cover_url)?.replace("1000x1000", "250x250") ?? null,
      lyrics: !!s.lyrics,
      audio: !!s.has_preview && !!s.deezer_id,
      deezerUrl: s.deezer_id ? `https://www.deezer.com/track/${s.deezer_id}` : null,
      geniusUrl: s.genius_url,
    };
  });
}

function toClassic(s: SongRow): ClassicSong {
  return {
    id: s.id,
    releaseId: s.unreleased && !isAlias(s) ? null : s.release_id,
    project: s.unreleased ? projectOf(s) : (s.r_title ?? "—"),
    type: songType(s),
    year: s.release_date ? Number(s.release_date.slice(0, 4)) : null,
    collaborators: JSON.parse(s.collaborators),
    producers: JSON.parse(s.producers),
    duration: s.duration,
    trackNumber: s.unreleased && !isAlias(s) ? null : s.track_number,
  };
}

/** Show the producers column only when we have credits for most songs. */
function producersEnabled(artistId: number): boolean {
  const r = db()
    .prepare("SELECT COUNT(*) AS n, SUM(producers != '[]') AS p FROM songs WHERE artist_id = ? AND enabled = 1")
    .get(artistId) as { n: number; p: number | null };
  return r.n > 0 && (r.p ?? 0) / r.n >= 0.5;
}

function answerInfo(artistId: number, mode: Mode, id: number): AnswerInfo | undefined {
  if (mode === "cover") {
    const r = releaseById(artistId, id);
    if (!r) return undefined;
    return {
      id: r.id,
      title: r.title,
      project: r.title,
      type: typeLabel(r.type),
      year: r.release_date?.slice(0, 4) ?? null,
      cover: r.cover_url,
      deezerUrl: r.deezer_id && /^\d+$/.test(r.deezer_id) ? `https://www.deezer.com/album/${r.deezer_id}` : null,
      geniusUrl: null,
    };
  }
  const s = songById(artistId, id);
  if (!s) return undefined;
  return {
    id: s.id,
    title: s.title,
    project: projectOf(s),
    type: typeLabel(songType(s)),
    year: s.release_date?.slice(0, 4) ?? null,
    cover: s.r_cover ?? s.cover_url,
    deezerUrl: s.deezer_id ? `https://www.deezer.com/track/${s.deezer_id}` : null,
    geniusUrl: s.genius_url,
  };
}

// ── Daily selection ─────────────────────────────────────────────────────

export function dailyAnswer(artistId: number, mode: Mode, hard: boolean, date: string, alias: boolean): number | null {
  const d = db();
  const pid = poolId(hard, alias);
  const existing = d
    .prepare("SELECT answer_id FROM daily_puzzles WHERE artist_id = ? AND mode = ? AND hard = ? AND date = ?")
    .get(artistId, mode, pid, date) as { answer_id: number } | undefined;
  const pool = answerPool(artistId, mode, hard, alias);
  if (existing) {
    // a song can drop out of the pool after it was picked (reclassified as a leak, disabled by an admin…):
    // then pick again instead of serving e.g. an unreleased song in normal mode
    if (pool.includes(existing.answer_id)) return existing.answer_id;
    d.prepare("DELETE FROM daily_puzzles WHERE artist_id = ? AND mode = ? AND hard = ? AND date = ?").run(
      artistId,
      mode,
      pid,
      date,
    );
  }
  if (!pool.length) return null;
  const window = Math.min(60, Math.floor(pool.length * 0.6));
  const recent = new Set(
    (
      d
        .prepare(
          `SELECT answer_id FROM daily_puzzles WHERE artist_id = ? AND mode = ? AND hard = ?
           AND date BETWEEN ? AND ?`,
        )
        .all(artistId, mode, pid, addDays(date, -window), addDays(date, window)) as { answer_id: number }[]
    ).map((r) => r.answer_id),
  );
  const candidates = pool.filter((id) => !recent.has(id));
  const list = candidates.length ? candidates : pool;
  const pick = list[Math.floor(rng(hashString(`${env.appSecret}:${artistId}:${mode}:${hard}${pid === 2 ? ":noalias" : pid === 3 ? ":alias" : ""}:${date}`))() * list.length)];
  d.prepare(
    "INSERT OR IGNORE INTO daily_puzzles (artist_id, mode, hard, date, answer_id) VALUES (?, ?, ?, ?, ?)",
  ).run(artistId, mode, pid, date, pick);
  return dailyAnswer(artistId, mode, hard, date, alias);
}

// ── Round tokens ────────────────────────────────────────────────────────

type RoundToken = {
  v: 1;
  a: number; // artist
  m: Mode;
  h: 0 | 1;
  k: Kind;
  d: string | null; // date (daily/archive)
  x: number; // answer id
  n: number; // wrong guesses / skips so far
  f: 0 | 1; // finished
  w: 0 | 1; // won
  s: number; // seed for lyric line selection
  g: number[]; // guessed ids (prevents duplicate guesses)
  al?: 0 | 1; // alias projects (ovine hall) included
  o?: 1; // legacy (before ovine hall had its own switch): unreleased pool without alias projects
};

type ProofToken = { a: number; m: Mode; h: 0 | 1; d: string; al?: 0 | 1; o?: 1 };

/** Alias switch of a token; older tokens only knew "unreleased without ovine hall" (o). */
const aliasOf = (t: { h: 0 | 1; al?: 0 | 1; o?: 1 }) => (t.al !== undefined ? t.al === 1 : t.h === 1 && !t.o);

export function readToken(token: string): RoundToken | null {
  const t = unseal<RoundToken>(token);
  return t && t.v === 1 ? t : null;
}

export function verifyProof(proof: unknown, artistId: number, mode: Mode, hard: boolean, alias: boolean): boolean {
  if (typeof proof !== "string") return false;
  const p = unseal<ProofToken>(proof, "proof");
  return !!p && p.a === artistId && p.m === mode && p.h === (hard ? 1 : 0) && aliasOf(p) === alias && p.d === today();
}

function view(t: RoundToken): RoundView {
  const token = seal(t);
  const max = MODE_INFO[t.m].maxGuesses;
  const finished = !!t.f;
  const round: RoundView = {
    token,
    mode: t.m,
    kind: t.k,
    hard: !!t.h,
    date: t.d,
    number: t.d ? puzzleNumber(t.d) : null,
    step: t.n,
    maxGuesses: max,
    finished,
    won: !!t.w,
    reveal: {},
  };

  if (t.m === "lyrics") {
    const s = songById(t.a, t.x);
    const lines = s?.lyrics ? selectLyricLines(s.lyrics, s.title, t.s) : [];
    round.reveal.lines = finished ? lines : lines.slice(0, Math.min(t.n + 1, LYRIC_LINES));
    round.reveal.totalLines = lines.length;
  } else if (t.m === "audio") {
    round.reveal.clipSeconds = clipSeconds(t.n, !!t.h, finished);
    round.reveal.mediaUrl = `/api/round/media?t=${encodeURIComponent(token)}`;
  } else if (t.m === "cover") {
    round.reveal.pixelStep = finished ? -1 : t.n;
    round.reveal.mediaUrl = `/api/round/media?t=${encodeURIComponent(token)}`;
  }

  if (finished) {
    round.answer = answerInfo(t.a, t.m, t.x);
    if (t.k === "daily" && t.d) round.proof = seal({ a: t.a, m: t.m, h: t.h, d: t.d, al: aliasOf(t) ? 1 : 0 } satisfies ProofToken, "proof");
    if (t.d && t.k !== "endless") {
      round.solvers = (
        db()
          .prepare(
            "SELECT COUNT(*) AS c FROM plays WHERE artist_id = ? AND mode = ? AND hard = ? AND date = ? AND won = 1 AND kind = 'daily'",
          )
          .get(t.a, t.m, poolId(!!t.h, aliasOf(t)), t.d) as { c: number }
      ).c;
    }
  }
  return round;
}

export type StartInput = {
  mode: Mode;
  hard: boolean;
  /** include alias projects (ovine hall) */
  alias: boolean;
  kind: Kind;
  date?: string;
  exclude?: number[];
  proof?: string;
};

export function startRound(artist: ArtistRow, input: StartInput): RoundView | { error: string; status: number } {
  const alias = input.alias;
  let answer: number | null = null;
  let date: string | null = null;

  if (input.kind === "endless") {
    if (!verifyProof(input.proof, artist.id, input.mode, input.hard, alias)) {
      return { error: "Finish today's daily first to unlock endless mode.", status: 403 };
    }
    const pool = answerPool(artist.id, input.mode, input.hard, alias);
    const exclude = new Set(input.exclude ?? []);
    const list = pool.filter((id) => !exclude.has(id));
    const from = list.length ? list : pool;
    answer = from.length ? from[Math.floor(Math.random() * from.length)] : null;
  } else {
    date = input.kind === "daily" ? today() : (input.date ?? "");
    if (!isPlayableDate(date)) return { error: "That puzzle isn't available.", status: 400 };
    answer = dailyAnswer(artist.id, input.mode, input.hard, date, alias);
  }
  if (answer === null) return { error: "No songs available for this mode yet — try again soon.", status: 503 };

  return view({
    v: 1,
    a: artist.id,
    m: input.mode,
    h: input.hard ? 1 : 0,
    al: alias ? 1 : 0,
    k: input.kind,
    d: date,
    x: answer,
    n: 0,
    f: 0,
    w: 0,
    s: hashString(`${answer}:${date ?? Math.random()}`),
    g: [],
  });
}

export function refreshRound(token: string): RoundView | null {
  const t = readToken(token);
  return t ? view(t) : null;
}

export function guess(token: string, guessId: number | null): { entry: GuessEntry; round: RoundView } | { error: string; status: number } {
  const t = readToken(token);
  if (!t) return { error: "Invalid round. Refresh the page.", status: 400 };
  if (t.f) return { error: "This round is already finished.", status: 409 };
  const max = MODE_INFO[t.m].maxGuesses;

  let entry: GuessEntry;
  if (guessId === null) {
    if (t.m !== "audio") return { error: "Skipping is only allowed in audio mode.", status: 400 };
    entry = { id: null, title: "Skipped", cover: null, correct: false };
  } else {
    if (t.g.includes(guessId)) return { error: "You already guessed that.", status: 409 };
    const correct = isCorrect(t, guessId);
    if (t.m === "cover") {
      const r = releaseById(t.a, guessId);
      if (!r) return { error: "Unknown release.", status: 400 };
      entry = { id: r.id, title: r.title, cover: null, correct };
    } else {
      const s = songById(t.a, guessId);
      if (!s || (!inPool(s, !!t.h, aliasOf(t)) && s.id !== t.x)) return { error: "Unknown song.", status: 400 };
      entry = { id: s.id, title: s.title, cover: s.r_cover ?? s.cover_url, correct };
      if (t.m === "classic") {
        const answer = songById(t.a, t.x);
        if (answer) entry.cells = compareClassic(toClassic(s), toClassic(answer), { producers: producersEnabled(t.a) });
      }
    }
    t.g = [...t.g, guessId].slice(-200);
  }

  if (entry.correct) {
    t.f = 1;
    t.w = 1;
  } else {
    t.n += 1;
    if (max !== null && t.n >= max) t.f = 1;
  }

  if (t.f) {
    db()
      .prepare("INSERT INTO plays (artist_id, mode, hard, kind, date, won, guesses) VALUES (?, ?, ?, ?, ?, ?, ?)")
      .run(t.a, t.m, poolId(!!t.h, aliasOf(t)), t.k, t.d, t.w, t.n + (t.w ? 1 : 0));
  }
  return { entry, round: view(t) };
}

function isCorrect(t: RoundToken, guessId: number): boolean {
  if (guessId === t.x) return true;
  if (t.m === "cover") {
    const a = releaseById(t.a, t.x);
    const g = releaseById(t.a, guessId);
    return !!a && !!g && (coverKey(a.cover_url) === coverKey(g.cover_url) || a.title.toLowerCase() === g.title.toLowerCase());
  }
  return false;
}

/** Media source for a round (audio preview track / cover image), never exposed to the client directly. */
export function mediaFor(t: RoundToken): { kind: "audio"; deezerId: string } | { kind: "cover"; url: string } | null {
  if (t.m === "audio") {
    const s = songById(t.a, t.x);
    return s?.deezer_id ? { kind: "audio", deezerId: s.deezer_id } : null;
  }
  if (t.m === "cover") {
    const r = releaseById(t.a, t.x);
    return r?.cover_url ? { kind: "cover", url: r.cover_url } : null;
  }
  return null;
}

export { clipSeconds, coverBlocks };

// ── Listen links ────────────────────────────────────────────────────────

/** Platform links for a song (or, in cover mode, a release). */
export async function listenFor(artist: ArtistRow, kind: "song" | "release", id: number): Promise<ListenLinks | null> {
  if (kind === "release") {
    const r = releaseById(artist.id, id);
    if (!r) return null;
    const aliasName = (db().prepare("SELECT alias FROM releases WHERE id = ?").get(id) as { alias: string | null }).alias;
    return listenLinks({
      kind: "album",
      title: r.title,
      artist: aliasName ?? artist.name,
      deezerId: r.deezer_id && /^\d+$/.test(r.deezer_id) ? r.deezer_id : null,
      geniusUrl: null,
      unreleased: r.type === "unreleased",
    });
  }
  const s = songById(artist.id, id);
  if (!s || !s.enabled) return null;
  return listenLinks({
    kind: "song",
    title: s.title,
    artist: s.r_alias ?? artist.name,
    deezerId: s.deezer_id,
    geniusUrl: s.genius_url,
    unreleased: !!s.unreleased,
  });
}
