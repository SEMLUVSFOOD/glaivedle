import { catalog, getArtist } from "@/lib/game/server";

/** Public song catalog for the /database page. */
export async function GET(req: Request) {
  void req.url; // request-time
  const artist = getArtist();
  if (!artist) return Response.json({ songs: [], syncedAt: null });
  return Response.json(
    { songs: catalog(artist.id), syncedAt: artist.last_synced_at },
    { headers: { "Cache-Control": "public, max-age=300" } },
  );
}
