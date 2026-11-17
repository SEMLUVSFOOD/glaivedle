"use client";
import { useActionState } from "react";
import { loginAction } from "@/app/admin/actions";

export function LoginForm() {
  const [error, action, pending] = useActionState(loginAction, null);
  return (
    <form action={action} className="box mx-auto max-w-sm space-y-4 px-6 pt-14 pb-6 text-center">
      <h1 className="title">Admin</h1>
      <input
        name="password"
        type="password"
        required
        autoComplete="current-password"
        className="input"
        placeholder="Password"
        aria-label="Password"
      />
      {error && <p className="text-sm text-bad">{error}</p>}
      <button className="btn btn-fill w-full" disabled={pending}>
        {pending ? "Checking…" : "Sign in"}
      </button>
    </form>
  );
}
