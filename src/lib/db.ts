import "server-only";
import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { env } from "./env";

/**
 * Plain SQL migrations. Append new entries; never edit an old one.
 * Applied in order and tracked in the `schema_migrations` table.
 */
const MIGRATIONS: { id: number; sql: string }[] = [
  {
    id: 1,
    sql: /* sql */ `
      CREATE TABLE artists (
        id              INTEGER PRIMARY KEY,
        slug            TEXT NOT NULL UNIQUE,
        name            TEXT NOT NULL,
        deezer_id       TEXT,
        genius_id       TEXT,
        image_url       TEXT,
        published       INTEGER NOT NULL DEFAULT 1,
        created_at      TEXT NOT NULL DEFAULT (datetime('now')),
        last_synced_at  TEXT,
        sync_status     TEXT,
        sync_log        TEXT
      );

      CREATE TABLE releases (
        id            INTEGER PRIMARY KEY,
        artist_id     INTEGER NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
        deezer_id     TEXT,
        title         TEXT NOT NULL,
        title_norm    TEXT NOT NULL,
        type          TEXT NOT NULL,          -- album | ep | single | feature | unreleased
        release_date  TEXT,
        cover_url     TEXT,
        enabled       INTEGER NOT NULL DEFAULT 1,
        UNIQUE (artist_id, deezer_id)
      );
      CREATE INDEX releases_artist ON releases(artist_id);

      CREATE TABLE songs (
        id             INTEGER PRIMARY KEY,
        artist_id      INTEGER NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
        title          TEXT NOT NULL,
        title_norm     TEXT NOT NULL,
        release_id     INTEGER REFERENCES releases(id) ON DELETE SET NULL,
        track_number   INTEGER,
        duration       INTEGER,               -- seconds
        release_date   TEXT,
        deezer_id      TEXT,
        genius_id      TEXT,
        genius_url     TEXT,
        cover_url      TEXT,
        collaborators  TEXT NOT NULL DEFAULT '[]',   -- JSON string[]
        producers      TEXT NOT NULL DEFAULT '[]',   -- JSON string[]
        lyrics         TEXT,
        lyrics_source  TEXT,                  -- lrclib | genius
        lyrics_checked_at TEXT,
        has_preview    INTEGER NOT NULL DEFAULT 0,
        unreleased     INTEGER NOT NULL DEFAULT 0,
        is_feature     INTEGER NOT NULL DEFAULT 0,
        enabled        INTEGER NOT NULL DEFAULT 1,
        created_at     TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE (artist_id, title_norm)
      );
      CREATE INDEX songs_artist ON songs(artist_id);

      CREATE TABLE daily_puzzles (
        artist_id   INTEGER NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
        mode        TEXT NOT NULL,
        hard        INTEGER NOT NULL,
        date        TEXT NOT NULL,
        answer_id   INTEGER NOT NULL,
        created_at  TEXT NOT NULL DEFAULT (datetime('now')),
        PRIMARY KEY (artist_id, mode, hard, date)
      );

      CREATE TABLE plays (
        id          INTEGER PRIMARY KEY,
        artist_id   INTEGER NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
        mode        TEXT NOT NULL,
        hard        INTEGER NOT NULL,
        kind        TEXT NOT NULL,            -- daily | archive | endless
        date        TEXT,
        won         INTEGER NOT NULL,
        guesses     INTEGER NOT NULL,
        created_at  TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE INDEX plays_lookup ON plays(artist_id, mode, hard, kind, date);
      CREATE INDEX plays_created ON plays(created_at);

      CREATE TABLE artist_requests (
        id          INTEGER PRIMARY KEY,
        name        TEXT NOT NULL,
        name_norm   TEXT NOT NULL,
        link        TEXT,
        note        TEXT,
        status      TEXT NOT NULL DEFAULT 'pending',  -- pending | planned | done | rejected
        votes       INTEGER NOT NULL DEFAULT 1,
        ip_hash     TEXT,
        created_at  TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE INDEX artist_requests_norm ON artist_requests(name_norm);
    `,
  },
  {
    id: 2,
    sql: /* sql */ `
      -- admin override that survives catalog syncs: 'unreleased' | 'released' | NULL
      ALTER TABLE songs ADD COLUMN status_override TEXT;
      ALTER TABLE releases ADD COLUMN label TEXT;
    `,
  },
  {
    id: 3,
    sql: /* sql */ `
      -- era of a leaked / unreleased song (see src/lib/leaks.ts), shown as its "project"
      ALTER TABLE songs ADD COLUMN era TEXT;
    `,
  },
  {
    id: 4,
    sql: /* sql */ `
      -- looked-up streaming links (e.g. Apple Music via the iTunes Search API); url NULL = not found
      CREATE TABLE listen_cache (
        key         TEXT PRIMARY KEY,
        url         TEXT,
        fetched_at  TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `,
  },
  {
    id: 5,
    sql: /* sql */ `
      -- small key/value store, e.g. which sync logic version produced the current catalog
      CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT);
    `,
  },
  {
    id: 6,
    sql: /* sql */ `
      -- alias projects (ovine hall) count as the artist's own releases: real album/ep/single type,
      -- marked by the alias name instead of a separate "alias" type
      ALTER TABLE releases ADD COLUMN alias TEXT;
      UPDATE releases SET alias = COALESCE(label, 'alias'), label = NULL, type = 'single' WHERE type = 'alias';
      UPDATE songs SET unreleased = 0
        WHERE status_override IS NULL AND release_id IN (SELECT id FROM releases WHERE alias IS NOT NULL);
    `,
  },
];

declare global {
  var __glaivedleDb: Database.Database | undefined;
}

function open(): Database.Database {
  const file = path.resolve(env.databasePath);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new Database(file);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.pragma("busy_timeout = 5000");
  migrate(db);
  return db;
}

function migrate(db: Database.Database) {
  db.exec(
    "CREATE TABLE IF NOT EXISTS schema_migrations (id INTEGER PRIMARY KEY, applied_at TEXT NOT NULL DEFAULT (datetime('now')))",
  );
  const applied = new Set(
    db.prepare("SELECT id FROM schema_migrations").all().map((r) => (r as { id: number }).id),
  );
  for (const m of MIGRATIONS) {
    if (applied.has(m.id)) continue;
    db.transaction(() => {
      db.exec(m.sql);
      db.prepare("INSERT INTO schema_migrations (id) VALUES (?)").run(m.id);
    })();
  }
}

/** Shared connection (survives dev hot reloads). */
export function db(): Database.Database {
  globalThis.__glaivedleDb ??= open();
  return globalThis.__glaivedleDb;
}
