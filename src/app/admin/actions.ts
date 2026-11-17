"use server";
import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { login, logout, requireAdmin } from "@/lib/admin/auth";
import { db } from "@/lib/db";
import { syncArtist } from "@/lib/sync";

export async function loginAction(_prev: string | null, form: FormData): Promise<string | null> {
  const error = await login(String(form.get("password") ?? ""));
  if (error) return error;
  redirect("/admin");
}

export async function logoutAction() {
  await logout();
  redirect("/admin");
}

export async function syncAction() {
  await requireAdmin();
  void syncArtist(); // runs in the background; the dashboard shows status
  await new Promise((r) => setTimeout(r, 300));
  refresh();
}

const STATUSES = new Set(["pending", "planned", "done", "rejected"]);

export async function setRequestStatus(form: FormData) {
  await requireAdmin();
  const id = Number(form.get("id"));
  const status = String(form.get("status"));
  if (!Number.isInteger(id) || !STATUSES.has(status)) return;
  db().prepare("UPDATE artist_requests SET status = ?, updated_at = datetime('now') WHERE id = ?").run(status, id);
  refresh();
}

export async function deleteRequest(form: FormData) {
  await requireAdmin();
  const id = Number(form.get("id"));
  if (!Number.isInteger(id)) return;
  db().prepare("DELETE FROM artist_requests WHERE id = ?").run(id);
  refresh();
}

export async function toggleSong(form: FormData) {
  await requireAdmin();
  const id = Number(form.get("id"));
  if (!Number.isInteger(id)) return;
  db().prepare("UPDATE songs SET enabled = 1 - enabled WHERE id = ?").run(id);
  refresh();
}

export async function setSongStatus(form: FormData) {
  await requireAdmin();
  const id = Number(form.get("id"));
  const status = String(form.get("status"));
  if (!Number.isInteger(id) || !["unreleased", "released", "auto"].includes(status)) return;
  if (status === "auto") {
    db().prepare("UPDATE songs SET status_override = NULL WHERE id = ?").run(id);
  } else {
    db()
      .prepare("UPDATE songs SET status_override = ?, unreleased = ? WHERE id = ?")
      .run(status, status === "unreleased" ? 1 : 0, id);
  }
  refresh();
}
