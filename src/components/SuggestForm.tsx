"use client";
import { useState } from "react";

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
      setMsg(data.duplicate ? "Someone already asked for them – your vote is counted." : "Thank you. Your suggestion is in.");
    } else {
      setState("error");
      setMsg(data?.error ?? "Something went wrong, try again.");
    }
  }

  if (state === "done") {
    return (
      <div className="arrive space-y-5">
        <p className="script text-[60px] leading-[0.9]">received</p>
        <p className="text-[19px] tracking-[-0.03em]">{msg}</p>
        <button type="button" className="small hoverable underline underline-offset-4" onClick={() => setState("idle")}>
          Suggest another →
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="small space-y-5">
      <label className="block space-y-1.5">
        <span className="caption block">01 – ARTIST *</span>
        <input name="name" required maxLength={80} className="input" placeholder="ericdoa" autoComplete="off" />
      </label>
      <label className="block space-y-1.5">
        <span className="caption block">02 – LINK</span>
        <input name="link" type="url" maxLength={300} className="input" placeholder="https://" inputMode="url" />
      </label>
      <label className="block space-y-1.5">
        <span className="caption block">03 – WHY THEM</span>
        <textarea name="note" maxLength={500} rows={3} className="input py-3" />
      </label>
      <input name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
      {state === "error" && <p className="text-bad">{msg}</p>}
      <button type="submit" className="btn btn-fill w-full" disabled={state === "sending"}>
        {state === "sending" ? "Sending…" : "Send suggestion"}
      </button>
    </form>
  );
}
