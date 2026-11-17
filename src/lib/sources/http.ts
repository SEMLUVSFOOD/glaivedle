import "server-only";

export const USER_AGENT = "glaivedle/1.0 (+https://github.com/SEMLUVSFOOD/glaivedle)";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Very small per-host throttle so we stay well inside public API rate limits. */
const lastHit = new Map<string, number>();
async function throttle(host: string, minGapMs: number) {
  const now = Date.now();
  const wait = (lastHit.get(host) ?? 0) + minGapMs - now;
  lastHit.set(host, Math.max(now, (lastHit.get(host) ?? 0) + minGapMs));
  if (wait > 0) await sleep(wait);
}

export async function fetchJson<T>(
  url: string,
  opts: { headers?: Record<string, string>; minGapMs?: number; retries?: number; allow404?: boolean } = {},
): Promise<T | null> {
  const host = new URL(url).host;
  const retries = opts.retries ?? 3;
  for (let attempt = 0; attempt <= retries; attempt++) {
    await throttle(host, opts.minGapMs ?? 150);
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": USER_AGENT, Accept: "application/json", ...opts.headers },
        signal: AbortSignal.timeout(15_000),
        cache: "no-store",
      });
      if (res.status === 404 && opts.allow404) return null;
      if (res.status === 429 || res.status >= 500) throw new Error(`HTTP ${res.status}`);
      if (!res.ok) throw Object.assign(new Error(`HTTP ${res.status} for ${url}`), { fatal: true });
      return (await res.json()) as T;
    } catch (err) {
      if ((err as { fatal?: boolean }).fatal || attempt === retries) throw err;
      await sleep(500 * 2 ** attempt);
    }
  }
  return null;
}
