import { clipSeconds, coverBlocks, mediaFor, readToken } from "@/lib/game/server";
import { coverImage, previewBytes, sliceMp3 } from "@/lib/media";
import { rateLimit, tooMany } from "@/lib/ratelimit";

export async function GET(req: Request) {
  if (!rateLimit(req, "media", 240, 60_000)) return tooMany();
  const token = new URL(req.url).searchParams.get("t") ?? "";
  const t = readToken(token);
  if (!t) return new Response("Invalid token", { status: 400 });
  const media = mediaFor(t);
  if (!media) return new Response("No media", { status: 404 });
  const headers = { "Cache-Control": "private, max-age=86400, immutable", "X-Content-Type-Options": "nosniff" };

  try {
    if (media.kind === "audio") {
      const buf = await previewBytes(media.deezerId);
      if (!buf) return new Response("Preview unavailable", { status: 404 });
      const clip = sliceMp3(buf, clipSeconds(t.n, !!t.h, !!t.f));
      return new Response(new Uint8Array(clip), { headers: { ...headers, "Content-Type": "audio/mpeg" } });
    }
    const img = await coverImage(media.url, coverBlocks(t.n, !!t.f));
    return new Response(new Uint8Array(img), { headers: { ...headers, "Content-Type": "image/webp" } });
  } catch (e) {
    console.error("[media]", e);
    return new Response("Media fetch failed", { status: 502 });
  }
}
