import { connection } from "next/server";
import { Trash2 } from "lucide-react";
import { isAdmin } from "@/lib/admin/auth";
import { db } from "@/lib/db";
import { deleteRequest, setRequestStatus } from "../actions";

type Row = { id: number; name: string; link: string | null; note: string | null; status: string; votes: number; created_at: string };

const TONE: Record<string, string> = {
  pending: "bg-gold/20 text-gold-2",
  planned: "bg-teal/30 text-teal-2",
  done: "bg-ok/30 text-ok-2",
  rejected: "bg-bad/30 text-[#e0827a]",
};

/** Admin pages are request-time only; they never need instant navigation. */
export const instant = false;

export default async function RequestsPage() {
  await connection();
  if (!(await isAdmin())) return null;
  const rows = db()
    .prepare(
      "SELECT id, name, link, note, status, votes, created_at FROM artist_requests ORDER BY status = 'pending' DESC, votes DESC, id DESC LIMIT 500",
    )
    .all() as Row[];
  return (
    <div>
      <h1 className="mb-4 font-serif text-3xl font-bold">Artist requests</h1>
      {!rows.length && <p className="panel p-6 text-center text-muted">No requests yet.</p>}
      <ul className="space-y-2">
        {rows.map((r) => (
          <li key={r.id} className="panel flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-lg font-semibold">{r.name}</span>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${TONE[r.status]}`}>{r.status}</span>
                <span className="text-xs text-muted">
                  {r.votes} vote{r.votes === 1 ? "" : "s"} · {r.created_at.slice(0, 10)}
                </span>
              </div>
              {r.link && /^https?:\/\//.test(r.link) && (
                <a href={r.link} target="_blank" rel="noopener noreferrer nofollow" className="block truncate text-xs text-teal-2 hover:underline">
                  {r.link}
                </a>
              )}
              {r.note && <p className="mt-1 text-sm text-muted">{r.note}</p>}
            </div>
            <div className="flex items-center gap-2">
              <form action={setRequestStatus} className="flex gap-2">
                <input type="hidden" name="id" value={r.id} />
                <select name="status" defaultValue={r.status} className="input min-h-10 w-auto py-0 text-sm">
                  <option value="pending">Pending</option>
                  <option value="planned">Planned</option>
                  <option value="done">Done</option>
                  <option value="rejected">Rejected</option>
                </select>
                <button className="btn btn-ghost h-10 min-h-10 text-sm">Save</button>
              </form>
              <form action={deleteRequest}>
                <input type="hidden" name="id" value={r.id} />
                <button className="btn btn-icon h-10 min-h-10 text-muted hover:text-[#e0625a]" aria-label={`Delete ${r.name}`}>
                  <Trash2 size={16} />
                </button>
              </form>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
