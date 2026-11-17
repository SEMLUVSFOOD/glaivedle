"use client";
import { useState } from "react";
import { Check, Send } from "lucide-react";

export function SuggestForm() {
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [msg, setMsg] = useState("");

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setState("sending");
    const res = await fetch("/api/requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.fromEntries(form)),
    }).catch(() => null);
    const data = await res?.json().catch(() => ({}));
    if (res?.ok) {
      setState("done");
      setMsg(data.duplicate ? "Someone already asked for them — we counted your vote!" : "Thanks! Your suggestion is in.");
    } else {
      setState("error");
      setMsg(data?.error ?? "Something went wrong, try again.");
    }
  }

  if (state === "done") {
    return (
      <div className="panel arch gilded px-6 pt-14 pb-8 text-center">
        <Check className="mx-auto mb-3 text-ok-2" size={32} aria-hidden />
        <p className="font-serif text-2xl font-semibold">{msg}</p>
        <button type="button" className="btn btn-ghost mt-5" onClick={() => setState("idle")}>
          Suggest another
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="panel space-y-4 p-5">
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium">Artist name *</span>
        <input name="name" required maxLength={80} className="input" placeholder="e.g. ericdoa" autoComplete="off" />
      </label>
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium">Link (Spotify, Deezer, Genius…)</span>
        <input name="link" type="url" maxLength={300} className="input" placeholder="https://" inputMode="url" />
      </label>
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium">Anything else?</span>
        <textarea name="note" maxLength={500} rows={3} className="input py-3" placeholder="Why should they be next?" />
      </label>
      {/* honeypot */}
      <input name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
      {state === "error" && <p className="text-sm text-[#e0625a]">{msg}</p>}
      <button type="submit" className="btn btn-gold w-full" disabled={state === "sending"}>
        <Send size={16} aria-hidden /> {state === "sending" ? "Sending…" : "Send suggestion"}
      </button>
    </form>
  );
}
