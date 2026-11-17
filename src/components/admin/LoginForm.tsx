"use client";
import { useActionState } from "react";
import { Lock } from "lucide-react";
import { loginAction } from "@/app/admin/actions";

export function LoginForm() {
  const [error, action, pending] = useActionState(loginAction, null);
  return (
    <form action={action} className="panel arch gilded mx-auto max-w-sm space-y-4 px-6 pt-14 pb-6 text-center">
      <Lock className="mx-auto text-gold" size={28} aria-hidden />
      <h1 className="font-serif text-2xl font-bold">Admin</h1>
      <input
        name="password"
        type="password"
        required
        autoComplete="current-password"
        className="input"
        placeholder="Password"
        aria-label="Password"
      />
      {error && <p className="text-sm text-[#e0625a]">{error}</p>}
      <button className="btn btn-gold w-full" disabled={pending}>
        {pending ? "Checking…" : "Sign in"}
      </button>
    </form>
  );
}
