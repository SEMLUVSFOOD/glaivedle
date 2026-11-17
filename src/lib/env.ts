import "server-only";
import os from "node:os";
import path from "node:path";

function str(name: string, fallback = ""): string {
  const v = process.env[name];
  return v === undefined || v === "" ? fallback : v;
}

export const env = {
  get appSecret() {
    const s = str("APP_SECRET");
    if (!s || s.length < 16) {
      if (process.env.NODE_ENV === "production") {
        throw new Error("APP_SECRET must be set (at least 16 characters) in production");
      }
      return "dev-only-insecure-secret-change-me";
    }
    return s;
  },
  get adminPassword() {
    return str("ADMIN_PASSWORD");
  },
  publicUrl: str("PUBLIC_URL", "http://localhost:3000"),
  artistSlug: str("ARTIST_SLUG", "glaive"),
  artistName: str("ARTIST_NAME", "glaive"),
  deezerArtistId: str("DEEZER_ARTIST_ID", "7411938"),
  geniusToken: str("GENIUS_ACCESS_TOKEN"),
  dailyTimezone: str("DAILY_TIMEZONE", "Europe/Amsterdam"),
  launchDate: str("LAUNCH_DATE", "2026-11-17"),
  // In dev the DB lives outside the project: SQLite touches its -shm file on every read,
  // which would make the dev server's file watcher reload the page in a loop.
  databasePath: str(
    "DATABASE_PATH",
    process.env.NODE_ENV === "production" ? "./data/glaivedle.db" : path.join(os.homedir(), ".glaivedle", "glaivedle.db"),
  ),
  /** Distributor labels whose uploads are leaks/unofficial → treated as unreleased (hard mode). */
  unreleasedLabels: str("UNRELEASED_LABELS", "Too Lost")
    .split(",")
    .map((l) => l.trim().toLowerCase())
    .filter(Boolean),
  /**
   * Other names the artist releases under ("slug:Name:deezerId", comma-separated). Their songs join the
   * unreleased pool (hard mode) with audio + covers. Default: glaive's throwaway alias ovine hall.
   */
  aliasArtists: str("ALIAS_ARTISTS", "ovinehall:ovine hall:213958057")
    .split(",")
    .map((x) => x.trim().split(":"))
    .filter((p) => p.length === 3 && /^\d+$/.test(p[2]))
    .map(([slug, name, deezerId]) => ({ slug, name, deezerId })),
  syncIntervalHours: Number(str("SYNC_INTERVAL_HOURS", "24")) || 0,
};
