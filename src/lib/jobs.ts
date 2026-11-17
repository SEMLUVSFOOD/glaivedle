import "server-only";
import { db } from "./db";
import { env } from "./env";
import { SYNC_VERSION, syncArtist } from "./sync";

declare global {
  var __glaivedleJobs: boolean | undefined;
}

/** Runs DB migrations, the first catalog import and the periodic re-sync. */
export function startBackgroundJobs() {
  if (globalThis.__glaivedleJobs) return;
  globalThis.__glaivedleJobs = true;

  db(); // applies migrations
  const artist = db()
    .prepare("SELECT last_synced_at, sync_status FROM artists WHERE slug = ?")
    .get(env.artistSlug) as { last_synced_at: string | null; sync_status: string | null } | undefined;

  const hours = env.syncIntervalHours;
  const version = (db().prepare("SELECT value FROM meta WHERE key = 'sync_version'").get() as { value: string } | undefined)?.value;
  const stale =
    !artist?.last_synced_at ||
    version !== SYNC_VERSION || // sync logic changed in this deployment
    (hours > 0 && Date.now() - Date.parse(artist.last_synced_at + "Z") > hours * 3_600_000);
  if (stale) setTimeout(() => void syncArtist(), 2_000);

  if (hours > 0) {
    setInterval(() => void syncArtist(), hours * 3_600_000).unref();
  }
}
