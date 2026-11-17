import Link from "next/link";

const version = process.env.NEXT_PUBLIC_APP_VERSION ?? "0.0.0";
const sha = process.env.NEXT_PUBLIC_COMMIT_SHA ?? "dev";
const repo = process.env.NEXT_PUBLIC_REPO_URL ?? "https://github.com/SEMLUVSFOOD/glaivedle";

export function Footer() {
  return (
    <footer className="small safe-bottom grid gap-6 px-[var(--margin)] pt-10 sm:grid-cols-[1fr_auto] sm:items-end">
      <div className="space-y-1">
        <p>
          <Link href="/suggest">Suggest an artist →</Link>
        </p>
        <p>
          Made by <a href="https://semsannen.com">Sem Sannen</a> – <a href="https://semsannen.com">semsannen.com</a>
        </p>
        <p className="text-soft">Fan-made, not affiliated with glaive or any label. Data: Deezer, LRCLIB, Genius.</p>
      </div>
      <p className="flex flex-wrap items-center gap-x-3 sm:justify-end">
        <a href={`${repo}/releases/tag/v${version}`} className="caption no-underline">
          v{version}
        </a>
        <a href={sha === "dev" ? repo : `${repo}/commit/${sha}`} className="caption no-underline">
          {sha}
        </a>
        <a href={repo}>GitHub</a>
        <a href={`${repo}/blob/main/LICENSE`}>AGPL-3.0</a>
      </p>
    </footer>
  );
}
