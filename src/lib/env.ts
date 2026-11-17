import "server-only";

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
  databasePath: str("DATABASE_PATH", "./data/glaivedle.db"),
  syncIntervalHours: Number(str("SYNC_INTERVAL_HOURS", "24")) || 0,
};
