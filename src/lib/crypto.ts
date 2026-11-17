import "server-only";
import crypto from "node:crypto";
import { env } from "./env";

function key(purpose: string): Buffer {
  return Buffer.from(crypto.hkdfSync("sha256", env.appSecret, "glaivedle", purpose, 32));
}

/** Encrypt + authenticate a JSON payload into a URL-safe opaque string. */
export function seal(payload: unknown, purpose = "round"): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key(purpose), iv);
  const body = Buffer.concat([cipher.update(JSON.stringify(payload), "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), body]).toString("base64url");
}

/** Returns null when the token is malformed or was tampered with. */
export function unseal<T>(token: string, purpose = "round"): T | null {
  try {
    const raw = Buffer.from(token, "base64url");
    if (raw.length < 29) return null;
    const decipher = crypto.createDecipheriv("aes-256-gcm", key(purpose), raw.subarray(0, 12));
    decipher.setAuthTag(raw.subarray(12, 28));
    const text = Buffer.concat([decipher.update(raw.subarray(28)), decipher.final()]).toString("utf8");
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

export function hmac(value: string, purpose: string): string {
  return crypto.createHmac("sha256", key(purpose)).update(value).digest("base64url");
}

export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) {
    crypto.timingSafeEqual(ab, ab); // keep timing roughly constant
    return false;
  }
  return crypto.timingSafeEqual(ab, bb);
}

/** Anonymised, non-reversible identifier for rate limiting / dedupe. */
export function hashIp(ip: string): string {
  return hmac(ip, "ip").slice(0, 22);
}
