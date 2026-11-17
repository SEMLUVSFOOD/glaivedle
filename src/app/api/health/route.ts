import { db } from "@/lib/db";

export async function GET(req: Request) {
  void req.url; // request-time only
  db().prepare("SELECT 1").get();
  return Response.json({ ok: true, version: process.env.NEXT_PUBLIC_APP_VERSION });
}
