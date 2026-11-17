import { z } from "zod";
import { getArtist, startRound } from "@/lib/game/server";
import { MODES } from "@/lib/game/types";
import { rateLimit, tooMany } from "@/lib/ratelimit";

const Body = z.object({
  mode: z.enum(MODES),
  hard: z.boolean().default(false),
  alias: z.boolean().optional(), // include ovine hall
  noAlias: z.boolean().optional(), // legacy clients: unreleased without ovine hall
  kind: z.enum(["daily", "archive", "endless"]),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  exclude: z.array(z.number().int()).max(200).optional(),
  proof: z.string().max(2000).optional(),
});

export async function POST(req: Request) {
  if (!rateLimit(req, "start", 60, 60_000)) return tooMany();
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Bad request" }, { status: 400 });
  const artist = getArtist();
  if (!artist) return Response.json({ error: "The catalog is still loading — try again in a minute." }, { status: 503 });
  const { noAlias, alias, ...rest } = parsed.data;
  const result = startRound(artist, { ...rest, alias: alias ?? (rest.hard && !noAlias) });
  if ("error" in result) return Response.json({ error: result.error }, { status: result.status });
  return Response.json(result);
}
