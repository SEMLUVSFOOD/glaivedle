import "server-only";
import { cookies, headers } from "next/headers";
import { hashIp, hmac, safeEqual } from "../crypto";
import { env } from "../env";
import { rateLimitKey } from "../ratelimit";

const COOKIE = "gd_admin";
const TTL_MS = 7 * 24 * 3_600_000;

export async function isAdmin(): Promise<boolean> {
  if (!env.adminPassword) return false;
  const v = (await cookies()).get(COOKIE)?.value;
  if (!v) return false;
  const [exp, sig] = v.split(".");
  if (!exp || !sig || Number(exp) < Date.now()) return false;
  // binding the session to the password means changing ADMIN_PASSWORD logs everyone out
  return safeEqual(sig, hmac(`${exp}:${env.adminPassword}`, "admin-session"));
}

export async function requireAdmin() {
  if (!(await isAdmin())) throw new Error("Unauthorized");
}

export async function login(password: string): Promise<string | null> {
  if (!env.adminPassword) return "ADMIN_PASSWORD is not configured on the server.";
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "local";
  if (!rateLimitKey(`login:${hashIp(ip)}`, 8, 15 * 60_000)) return "Too many attempts. Try again in 15 minutes.";
  if (!safeEqual(hmac(password, "pw"), hmac(env.adminPassword, "pw"))) return "Wrong password.";
  const exp = String(Date.now() + TTL_MS);
  (await cookies()).set(COOKIE, `${exp}.${hmac(`${exp}:${env.adminPassword}`, "admin-session")}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: TTL_MS / 1000,
  });
  return null;
}

export async function logout() {
  (await cookies()).delete(COOKIE);
}
