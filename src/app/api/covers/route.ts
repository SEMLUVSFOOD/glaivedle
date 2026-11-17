import { db } from "@/lib/db";
import { getArtist } from "@/lib/game/server";

/** Release artwork for the decorative home collage (public info, no answers). */
export async function GET(req: Request) {
  void req.url; // request-time
  const artist = getArtist();
  if (!artist) return Response.json([]);
  const rows = db()
    .prepare(
      `SELECT title, cover_url FROM releases WHERE artist_id = ? AND enabled = 1 AND cover_url IS NOT NULL
         AND type NOT IN ('feature', 'unreleased')
         AND NOT EXISTS (SELECT 1 FROM songs s WHERE s.release_id = releases.id AND s.unreleased = 1)
       ORDER BY release_date DESC`,
    )
    .all(artist.id) as { title: string; cover_url: string }[];
  const seen = new Set<string>();
  const out = rows
    .filter((r) => {
      const k = r.cover_url.match(/\/cover\/([0-9a-f]{32})\//)?.[1] ?? r.cover_url;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    })
    .slice(0, 14)
    .map((r) => ({ title: r.title, src: r.cover_url.replace("1000x1000", "500x500") }));
  return Response.json(out, { headers: { "Cache-Control": "public, max-age=3600" } });
}
