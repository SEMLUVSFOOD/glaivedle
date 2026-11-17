"use client";
import { useCallback, useEffect, useState } from "react";
import { useApp, useStored } from "@/components/Providers";
import type { GuessResponse, Kind, Mode, RoundView } from "../game/types";
import {
  load,
  proofKey,
  recentKey,
  recordArchive,
  recordDaily,
  recordEndless,
  roundKey,
  save,
  type SavedRound,
} from "./storage";

async function post<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({ error: "Network error" }));
  if (!res.ok) throw new Error(data.error ?? `Error ${res.status}`);
  return data as T;
}

const isValid = (s: SavedRound | null, mode: Mode, hard: boolean): s is SavedRound =>
  !!s?.round?.token && s.round.mode === mode && s.round.hard === hard;

/**
 * Round lifecycle for one mode/kind/date. State lives in localStorage
 * (so progress survives reloads) and is read reactively.
 */
export function useRound(mode: Mode, kind: Kind, archiveDate: string | null) {
  const { meta, hard, ovine } = useApp();
  const date = kind === "daily" ? (meta?.today ?? null) : kind === "archive" ? archiveDate : null;
  const key = meta && (kind === "endless" || date) ? roundKey(mode, hard, kind, date, ovine) : null;

  const stored = useStored<SavedRound | null>(key ?? "none", null);
  const proof = useStored<{ date: string; proof: string } | null>(proofKey(mode, hard, ovine), null);
  const [error, setError] = useState<{ key: string; msg: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const saved = key && isValid(stored, mode, hard) ? stored : null;
  const locked = kind === "endless" && (!proof || proof.date !== meta?.today);
  const hasRound = !!saved;

  const requestRound = useCallback(
    () =>
      post<RoundView>("/api/round/start", {
        mode,
        hard,
        noAlias: hard && !ovine,
        kind,
        date: kind === "archive" ? date : undefined,
        proof: kind === "endless" ? load<{ proof: string } | null>(proofKey(mode, hard, ovine), null)?.proof : undefined,
        exclude: kind === "endless" ? load<number[]>(recentKey(mode, hard), []) : undefined,
      }),
    [mode, hard, ovine, kind, date],
  );

  useEffect(() => {
    if (!key || locked || hasRound) return;
    let cancelled = false;
    requestRound().then(
      (round) => !cancelled && save(key, { round, guesses: [] } satisfies SavedRound),
      (e: Error) => !cancelled && setError({ key, msg: e.message }),
    );
    return () => {
      cancelled = true;
    };
  }, [key, locked, hasRound, requestRound]);

  const restart = useCallback(() => {
    if (!key) return;
    setError(null);
    requestRound().then(
      (round) => save(key, { round, guesses: [] } satisfies SavedRound),
      (e: Error) => setError({ key, msg: e.message }),
    );
  }, [key, requestRound]);

  const guess = useCallback(
    async (guessId: number | null) => {
      if (!key || !saved || saved.round.finished || busy) return null;
      setBusy(true);
      setError(null);
      try {
        const res = await post<GuessResponse>("/api/round/guess", { token: saved.round.token, guessId });
        const next: SavedRound = { round: res.round, guesses: [...saved.guesses, res.entry] };
        if (res.round.finished) {
          const r = res.round;
          const n = next.guesses.length;
          if (r.kind === "daily" && r.date) {
            next.streak = recordDaily(mode, hard, r.date, r.won, n);
            if (r.proof) save(proofKey(mode, hard, ovine), { date: r.date, proof: r.proof });
          } else if (r.kind === "archive" && r.date) {
            next.streak = recordArchive(mode, hard, r.date, r.won, n);
          } else if (r.kind === "endless") {
            next.streak = recordEndless(mode, hard, r.won, n);
            if (r.answer) {
              const recent = load<number[]>(recentKey(mode, hard), []);
              save(recentKey(mode, hard), [r.answer.id, ...recent].slice(0, 60));
            }
          }
        }
        save(key, next);
        return res.entry;
      } catch (e) {
        setError({ key, msg: (e as Error).message });
        return null;
      } finally {
        setBusy(false);
      }
    },
    [key, saved, busy, mode, hard, ovine],
  );

  const err = error && error.key === key ? error.msg : null;
  const status: "loading" | "ready" | "locked" | "error" = !meta
    ? "loading"
    : locked
      ? "locked"
      : saved
        ? "ready"
        : err
          ? "error"
          : "loading";

  return { status, saved, error: err, busy, guess, restart, date, hard };
}
