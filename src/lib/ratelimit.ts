import "server-only";
import { hashIp } from "./crypto";

type Bucket = { count: number; reset: number };
const buckets = new Map<string, Bucket>();

export function clientIp(req: Request): string {
  const xf = req.headers.get("x-forwarded-for");
  return xf?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "local";
}

/** Fixed-window in-memory rate limit. Returns true when the request is allowed. */
export function rateLimit(req: Request, name: string, limit: number, windowMs: number): boolean {
  return rateLimitKey(`${name}:${hashIp(clientIp(req))}`, limit, windowMs);
}

export function rateLimitKey(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || b.reset < now) {
    buckets.set(key, { count: 1, reset: now + windowMs });
    if (buckets.size > 50_000) for (const [k, v] of buckets) if (v.reset < now) buckets.delete(k);
    return true;
  }
  b.count++;
  return b.count <= limit;
}

export const tooMany = () => Response.json({ error: "Slow down a little 🙏" }, { status: 429 });
