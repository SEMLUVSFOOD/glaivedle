import { connection } from "next/server";
import { isAdmin } from "@/lib/admin/auth";
import { db } from "@/lib/db";
import { fmtDuration, typeLabel } from "@/lib/game/logic";
import { toggleSong } from "../actions";

type Row = {
  id: number;
  title: string;
  release_date: string | null;
  duration: number | null;
  enabled: number;
  unreleased: number;
  is_feature: number;
  lyrics_source: string | null;
  has_preview: number;
  rtitle: string | null;
  rtype: string | null;
};

/** Admin pages are request-time only; they never need instant navigation. */
export const instant = false;

export default async function SongsPage() {
  await connection();
  if (!(await isAdmin())) return null;
  const rows = db()
    .prepare(
      `SELECT s.id, s.title, s.release_date, s.duration, s.enabled, s.unreleased, s.is_feature, s.lyrics_source, s.has_preview,
              r.title rtitle, r.type rtype
       FROM songs s LEFT JOIN releases r ON r.id = s.release_id ORDER BY s.release_date DESC, s.title`,
    )
    .all() as Row[];
  return (
    <div>
      <h1 className="title">Songs</h1>
      <p className="mt-1 mb-4 text-sm">
        Synced automatically from Deezer, LRCLIB &amp; Genius. Disable a song to remove it from guesses and future puzzles.
      </p>
      <div className="box overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="text-left text-[11px] tracking-wider caption">
            <tr>
              <th className="p-3">Song</th>
              <th className="p-3">Project</th>
              <th className="p-3">Date</th>
              <th className="p-3">Len</th>
              <th className="p-3">Data</th>
              <th className="p-3" />
            </tr>
          </thead>
          <tbody>
            {rows.map((s) => (
              <tr key={s.id} className={`border-t border-faint ${s.enabled ? "" : "opacity-45"}`}>
                <td className="p-3 font-medium">{s.title}</td>
                <td className="p-3">
                  {s.unreleased ? "Unreleased" : s.rtitle} <span className="text-faint">· {typeLabel(s.unreleased ? "unreleased" : s.is_feature ? "feature" : (s.rtype ?? "single"))}</span>
                </td>
                <td className="p-3 tabular-nums">{s.release_date ?? "?"}</td>
                <td className="p-3 tabular-nums">{fmtDuration(s.duration)}</td>
                <td className="p-3 text-xs">
                  {s.lyrics_source ? `lyrics:${s.lyrics_source}` : "no lyrics"} · {s.has_preview ? "audio" : "no audio"}
                </td>
                <td className="p-3 text-right">
                  <form action={toggleSong}>
                    <input type="hidden" name="id" value={s.id} />
                    <button className="btn btn-ghost h-8 min-h-8 px-3 text-xs">{s.enabled ? "Disable" : "Enable"}</button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
