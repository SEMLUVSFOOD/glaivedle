import { getArtist, options } from "@/lib/game/server";
import { isMode } from "@/lib/game/types";

export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  const mode = params.get("mode");
  if (!isMode(mode)) return Response.json({ error: "Bad mode" }, { status: 400 });
  const artist = getArtist();
  if (!artist) return Response.json([]);
  return Response.json(options(artist.id, mode, params.get("hard") === "1"), {
    headers: { "Cache-Control": "public, max-age=300" },
  });
}
