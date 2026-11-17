import { z } from "zod";
import { hashIp } from "@/lib/crypto";
import { db } from "@/lib/db";
import { normName } from "@/lib/normalize";
import { clientIp, rateLimit, tooMany } from "@/lib/ratelimit";

const Body = z.object({
  name: z.string().trim().min(1).max(80),
  link: z
    .string()
    .trim()
    .max(300)
    .refine((v) => v === "" || /^https?:\/\//i.test(v), "Link must start with http(s)://")
    .optional(),
  note: z.string().trim().max(500).optional(),
  website: z.string().max(200).optional(), // honeypot
});

export async function POST(req: Request) {
  if (!rateLimit(req, "request", 5, 60 * 60_000)) return tooMany();
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: parsed.error.issues[0]?.message ?? "Bad request" }, { status: 400 });
  const { name, link, note, website } = parsed.data;
  if (website) return Response.json({ ok: true }); // bots
  const norm = normName(name);
  if (!norm) return Response.json({ error: "Please enter an artist name" }, { status: 400 });

  const d = db();
  const ipHash = hashIp(clientIp(req));
  const existing = d.prepare("SELECT id, ip_hash FROM artist_requests WHERE name_norm = ? ORDER BY id LIMIT 1").get(norm) as
    | { id: number; ip_hash: string | null }
    | undefined;
  if (existing) {
    if (existing.ip_hash !== ipHash) {
      d.prepare("UPDATE artist_requests SET votes = votes + 1, updated_at = datetime('now') WHERE id = ?").run(existing.id);
    }
    return Response.json({ ok: true, duplicate: true });
  }
  d.prepare("INSERT INTO artist_requests (name, name_norm, link, note, ip_hash) VALUES (?, ?, ?, ?, ?)").run(
    name,
    norm,
    link || null,
    note || null,
    ipHash,
  );
  return Response.json({ ok: true });
}
