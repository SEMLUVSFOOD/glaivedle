"use client";
import { createContext, useCallback, useContext, useEffect, useState, useSyncExternalStore } from "react";
import { load, save } from "@/lib/client/storage";

export type Meta = {
  today: string;
  number: number;
  launchDate: string;
  timezone: string;
  msUntilNext: number;
  fetchedAt: number;
  artist: { name: string; image: string | null; ready: boolean } | null;
};

type Ctx = {
  meta: Meta | null;
  hard: boolean;
  setHard: (v: boolean) => void;
  openDialog: (name: "help" | "stats") => void;
  dialog: "help" | "stats" | null;
  closeDialog: () => void;
};

const AppCtx = createContext<Ctx | null>(null);

export function useApp() {
  const c = useContext(AppCtx);
  if (!c) throw new Error("useApp outside <Providers>");
  return c;
}

function subscribe(cb: () => void) {
  window.addEventListener("gd-storage", cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener("gd-storage", cb);
    window.removeEventListener("storage", cb);
  };
}

/** Reactive localStorage value. */
export function useStored<T>(key: string, fallback: T): T {
  const raw = useSyncExternalStore(
    subscribe,
    () => {
      try {
        return localStorage.getItem(`gd1:${key}`);
      } catch {
        return null;
      }
    },
    () => null,
  );
  if (raw === null) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [meta, setMeta] = useState<Meta | null>(null);
  const hard = useStored<boolean>("hard", false);
  const [dialog, setDialog] = useState<Ctx["dialog"]>(null);

  useEffect(() => {
    let alive = true;
    const fetchMeta = () =>
      fetch("/api/meta", { cache: "no-store" })
        .then((r) => r.json())
        .then((m) => alive && setMeta({ ...m, fetchedAt: Date.now() }))
        .catch(() => {});
    fetchMeta();
    const onVisible = () => document.visibilityState === "visible" && fetchMeta();
    document.addEventListener("visibilitychange", onVisible);
    const helpTimer = load("seenHelp", false)
      ? undefined
      : setTimeout(() => {
          save("seenHelp", true);
          setDialog("help");
        }, 400);
    return () => {
      alive = false;
      clearTimeout(helpTimer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  // refresh at the daily rollover
  useEffect(() => {
    if (!meta) return;
    const id = setTimeout(
      () => fetch("/api/meta").then((r) => r.json()).then((m) => setMeta({ ...m, fetchedAt: Date.now() })),
      Math.max(1000, meta.msUntilNext + 1500),
    );
    return () => clearTimeout(id);
  }, [meta]);

  const setHard = useCallback((v: boolean) => save("hard", v), []);
  const closeDialog = useCallback(() => setDialog(null), []);

  return (
    <AppCtx.Provider value={{ meta, hard, setHard, dialog, openDialog: setDialog, closeDialog }}>
      {children}
    </AppCtx.Provider>
  );
}
