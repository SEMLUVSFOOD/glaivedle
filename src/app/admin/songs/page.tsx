import { connection } from "next/server";
import { isAdmin } from "@/lib/admin/auth";
import { db } from "@/lib/db";
import { fmtDuration, typeLabel } from "@/lib/game/logic";
import { setSongStatus, toggleSong } from "../actions";

type Row = {
  id: number;
  title: string;
  release_date: string | null;
  duration: number | null;
  enabled: number;
  unreleased: number;
  is_feature: number;
  status_override: string | null;
  lyrics_source: string | null;
  has_preview: number;
  rtitle: string | null;
  rtype: string | null;
  label: string | null;
};

/** Admin pages are request-time only; they never need instant navigation. */
export const instant = false;

export default async function SongsPage() {
  await connection();
  if (!(await isAdmin())) return null;
  const rows = db()
    .prepare(
      `SELECT s.id, s.title, s.release_date, s.duration, s.enabled, s.unreleased, s.is_feature, s.status_override,
              s.lyrics_source, s.has_preview, r.title rtitle, r.type rtype, r.label
       FROM songs s LEFT JOIN releases r ON r.id = s.release_id ORDER BY s.unreleased DESC, s.release_date DESC, s.title`,
    )
    .all() as Row[];
  return (
    <div>
      <h1 className="title">Songs</h1>
      <p className="small mt-2 mb-5 max-w-2xl">
        Synced automatically from Deezer, LRCLIB &amp; Genius. Uploads through unofficial distributors (UNRELEASED_LABELS) count
        as unreleased automatically. Overrides below survive every sync. Disabled songs are never guessed or picked.
      </p>
      <div className="box overflow-x-auto">
        <table className="small w-full min-w-[760px]">
          <thead className="caption text-left">
            <tr>
              <th className="p-3">SONG</th>
              <th className="p-3">PROJECT</th>
              <th className="p-3">DATE</th>
              <th className="p-3">LEN</th>
              <th className="p-3">DATA</th>
              <th className="p-3">STATUS</th>
              <th className="p-3" />
            </tr>
          </thead>
          <tbody>
            {rows.map((s) => (
              <tr key={s.id} className={`border-t border-faint ${s.enabled ? "" : "opacity-45"}`}>
                <td className="p-3 text-fg-hover">{s.title}</td>
                <td className="p-3">
                  {s.rtitle ?? "—"}{" "}
                  <span className="text-soft">
                    · {typeLabel(s.is_feature ? "feature" : (s.rtype ?? "single"))}
                    {s.label ? ` · ${s.label}` : ""}
                  </span>
                </td>
                <td className="p-3 tabular-nums">{s.release_date ?? "?"}</td>
                <td className="p-3 tabular-nums">{fmtDuration(s.duration)}</td>
                <td className="p-3">
                  {s.lyrics_source ? `lyrics:${s.lyrics_source}` : "no lyrics"} · {s.has_preview ? "audio" : "no audio"}
                </td>
                <td className="p-3">
                  <form action={setSongStatus} className="flex items-center gap-2">
                    <input type="hidden" name="id" value={s.id} />
                    <span className={s.unreleased ? "pill px-1.5 py-0.5" : ""}>{s.unreleased ? "Unreleased" : "Released"}</span>
                    {s.status_override && <span className="caption">MANUAL</span>}
                    <button name="status" value={s.unreleased ? "released" : "unreleased"} className="underline underline-offset-2">
                      Mark {s.unreleased ? "released" : "unreleased"}
                    </button>
                    {s.status_override && (
                      <button name="status" value="auto" className="underline underline-offset-2">
                        Reset
                      </button>
                    )}
                  </form>
                </td>
                <td className="p-3 text-right">
                  <form action={toggleSong}>
                    <input type="hidden" name="id" value={s.id} />
                    <button className="btn h-8 min-h-8 px-3 text-xs">{s.enabled ? "Disable" : "Enable"}</button>
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
