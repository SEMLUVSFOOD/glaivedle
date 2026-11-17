import { getArtist, listenFor } from "@/lib/game/server";
import { rateLimit, tooMany } from "@/lib/ratelimit";

/** "Listen on…" links for a song (?song=id) or release (?release=id). */
export async function GET(req: Request) {
  if (!rateLimit(req, "listen", 60, 60_000)) return tooMany();
  const params = new URL(req.url).searchParams;
  const song = Number(params.get("song"));
  const release = Number(params.get("release"));
  const artist = getArtist();
  if (!artist) return Response.json({ error: "Not ready" }, { status: 503 });
  const links =
    Number.isInteger(song) && song > 0
      ? await listenFor(artist, "song", song)
      : Number.isInteger(release) && release > 0
        ? await listenFor(artist, "release", release)
        : null;
  if (!links) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json(links, { headers: { "Cache-Control": "public, max-age=86400" } });
}
