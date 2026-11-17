import { z } from "zod";
import { guess } from "@/lib/game/server";
import { rateLimit, tooMany } from "@/lib/ratelimit";

const Body = z.object({
  token: z.string().min(10).max(4000),
  guessId: z.number().int().positive().nullable(),
});

export async function POST(req: Request) {
  if (!rateLimit(req, "guess", 120, 60_000)) return tooMany();
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Bad request" }, { status: 400 });
  const result = guess(parsed.data.token, parsed.data.guessId);
  if ("error" in result) return Response.json({ error: result.error }, { status: result.status });
  return Response.json(result);
}
