import { env } from "@/lib/env";
import { getArtist, puzzleNumber, today } from "@/lib/game/server";
import { msUntilNextDay } from "@/lib/dates";

export async function GET(req: Request) {
  void req.url; // request-time
  const t = today();
  const artist = getArtist();
  return Response.json(
    {
      today: t,
      number: puzzleNumber(t),
      launchDate: env.launchDate,
      timezone: env.dailyTimezone,
      msUntilNext: msUntilNextDay(env.dailyTimezone),
      artist: artist ? { name: artist.name, image: artist.image_url, ready: artist.last_synced_at !== null } : null,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
