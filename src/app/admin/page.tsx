import { connection } from "next/server";
import { isAdmin } from "@/lib/admin/auth";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { getArtist, today } from "@/lib/game/server";
import { MODE_INFO, MODES } from "@/lib/game/types";
import { isSyncRunning } from "@/lib/sync";
import { syncAction } from "./actions";

function Stat({ label, value, sub }: { label: string; value: React.ReactNode; sub?: string }) {
  return (
    <div className="box p-4">
      <div className="text-[11px] tracking-wider caption">{label}</div>
      <div className="mt-1 text-2xl font-semibold tabular-nums">{value}</div>
      {sub && <div className="mt-0.5 text-xs">{sub}</div>}
    </div>
  );
}

/** Admin pages are request-time only; they never need instant navigation. */
export const instant = false;

export default async function AdminDashboard() {
  await connection();
  if (!(await isAdmin())) return null;
  const d = db();
  const artist = getArtist();
  const t = today();
  const songs = d
    .prepare(
      `SELECT COUNT(*) total, SUM(enabled) enabled, SUM(unreleased) unreleased, SUM(is_feature) features,
        SUM(lyrics IS NOT NULL) lyrics, SUM(has_preview) previews, SUM(producers != '[]') producers
       FROM songs`,
    )
    .get() as Record<string, number | null>;
  const releases = (d.prepare("SELECT COUNT(*) c FROM releases").get() as { c: number }).c;
  const playsToday = d
    .prepare("SELECT mode, COUNT(*) c, SUM(won) w FROM plays WHERE date = ? AND kind = 'daily' GROUP BY mode")
    .all(t) as { mode: string; c: number; w: number }[];
  const plays7 = d
    .prepare("SELECT kind, COUNT(*) c FROM plays WHERE created_at >= datetime('now', '-7 days') GROUP BY kind")
    .all() as { kind: string; c: number }[];
  const playsAll = (d.prepare("SELECT COUNT(*) c FROM plays").get() as { c: number }).c;
  const pending = (d.prepare("SELECT COUNT(*) c FROM artist_requests WHERE status = 'pending'").get() as { c: number }).c;
  const topRequests = d
    .prepare("SELECT name, votes FROM artist_requests WHERE status IN ('pending','planned') ORDER BY votes DESC, id LIMIT 5")
    .all() as { name: string; votes: number }[];
  const daily = d
    .prepare(
      `SELECT p.mode, p.hard, s.title, r.title AS rtitle FROM daily_puzzles p
       LEFT JOIN songs s ON s.id = p.answer_id AND p.mode != 'cover'
       LEFT JOIN releases r ON r.id = p.answer_id AND p.mode = 'cover'
       WHERE p.date = ? ORDER BY p.hard, p.mode`,
    )
    .all(t) as { mode: string; hard: number; title: string | null; rtitle: string | null }[];
  const syncLog = (d.prepare("SELECT sync_log FROM artists WHERE slug = ?").get(env.artistSlug) as { sync_log: string | null } | undefined)
    ?.sync_log;
  const running = isSyncRunning();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="title">Dashboard</h1>
          <p className="text-sm">
            {artist?.name ?? env.artistName} · today is {t} ({env.dailyTimezone}) · v{process.env.NEXT_PUBLIC_APP_VERSION} (
            {process.env.NEXT_PUBLIC_COMMIT_SHA})
          </p>
        </div>
        <form action={syncAction}>
          <button className="btn btn-fill" disabled={running}>
            {running ? "Syncing…" : "Sync catalog now"}
          </button>
        </form>
      </div>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Songs" value={songs.total ?? 0} sub={`${songs.enabled ?? 0} enabled · ${releases} releases`} />
        <Stat label="Hard-only" value={(songs.unreleased ?? 0) + (songs.features ?? 0)} sub={`${songs.unreleased ?? 0} unreleased · ${songs.features ?? 0} features`} />
        <Stat label="Lyrics" value={songs.lyrics ?? 0} sub={`${songs.previews ?? 0} with audio preview`} />
        <Stat label="Producer credits" value={songs.producers ?? 0} sub={env.geniusToken ? "Genius connected" : "Add GENIUS_ACCESS_TOKEN"} />
        <Stat label="Plays (all time)" value={playsAll} />
        <Stat label="Plays (7 days)" value={plays7.reduce((a, b) => a + b.c, 0)} sub={plays7.map((p) => `${p.c} ${p.kind}`).join(" · ") || "—"} />
        <Stat label="Pending requests" value={pending} />
        <Stat
          label="Last sync"
          value={<span className="text-base">{artist?.last_synced_at?.replace("T", " ") ?? "never"}</span>}
          sub={running ? "running" : (artist?.sync_status ?? "—")}
        />
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <div className="box p-4">
          <h2 className="mb-3 nav-link">Today&apos;s dailies</h2>
          <table className="w-full text-sm">
            <tbody>
              {MODES.map((m) => {
                const p = playsToday.find((x) => x.mode === m);
                return (
                  <tr key={m} className="border-t border-faint first:border-0">
                    <td className="py-2 font-medium">{MODE_INFO[m].title}</td>
                    <td className="py-2">
                      {daily
                        .filter((x) => x.mode === m)
                        .map((x) => `${x.hard ? "💀 " : ""}${x.title ?? x.rtitle}`)
                        .join(" / ") || "not generated yet"}
                    </td>
                    <td className="py-2 text-right tabular-nums">{p ? `${p.w}/${p.c} won` : "0"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="box p-4">
          <h2 className="mb-3 nav-link">Most requested artists</h2>
          {topRequests.length ? (
            <ol className="space-y-1 text-sm">
              {topRequests.map((r) => (
                <li key={r.name} className="flex justify-between border-t border-faint pt-1 first:border-0">
                  <span>{r.name}</span>
                  <span className="tabular-nums">{r.votes} vote{r.votes === 1 ? "" : "s"}</span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-sm">No requests yet.</p>
          )}
        </div>
      </section>

      <section className="box p-4">
        <h2 className="mb-2 nav-link">Last sync log</h2>
        <pre className="max-h-72 overflow-auto rounded-lg bg-faint/40 p-3 text-xs leading-relaxed whitespace-pre-wrap">
          {syncLog ?? "No sync has run yet."}
        </pre>
      </section>
    </div>
  );
}
