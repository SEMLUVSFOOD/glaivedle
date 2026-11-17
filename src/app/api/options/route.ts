import { getArtist, options } from "@/lib/game/server";
import { isMode } from "@/lib/game/types";

export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  const mode = params.get("mode");
  if (!isMode(mode)) return Response.json({ error: "Bad mode" }, { status: 400 });
  const artist = getArtist();
  if (!artist) return Response.json([]);
  const hard = params.get("hard") === "1";
  // alias=1/0 switches ovine hall; without it, keep the old default (only in the unreleased pool)
  const alias = params.has("alias") ? params.get("alias") === "1" : hard;
  return Response.json(options(artist.id, mode, hard, alias), {
    headers: { "Cache-Control": "public, max-age=300" },
  });
}
