import Link from "next/link";
import { Sparkles } from "lucide-react";

const version = process.env.NEXT_PUBLIC_APP_VERSION ?? "0.0.0";
const sha = process.env.NEXT_PUBLIC_COMMIT_SHA ?? "dev";
const repo = process.env.NEXT_PUBLIC_REPO_URL ?? "https://github.com/SEMLUVSFOOD/glaivedle";

export function Footer() {
  return (
    <footer className="safe-bottom border-t border-line bg-bg/60 px-4 pt-6 text-center text-xs text-faint">
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-3">
        <Link href="/suggest" className="btn btn-ghost h-10 min-h-10 text-sm text-gold-2">
          <Sparkles size={15} aria-hidden /> Want another artist? Suggest one
        </Link>
        <p>
          Made by{" "}
          <a href="https://semsannen.com" className="text-muted underline-offset-2 hover:text-ivory hover:underline">
            Sem Sannen
          </a>{" "}
          ·{" "}
          <a href="https://semsannen.com" className="text-muted underline-offset-2 hover:text-ivory hover:underline">
            semsannen.com
          </a>
        </p>
        <p className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1">
          <a href={`${repo}/releases/tag/v${version}`} className="font-mono hover:text-ivory">
            v{version}
          </a>
          <span aria-hidden>·</span>
          <a href={sha === "dev" ? repo : `${repo}/commit/${sha}`} className="font-mono hover:text-ivory">
            {sha}
          </a>
          <span aria-hidden>·</span>
          <a href={repo} className="hover:text-ivory">
            Open source on GitHub
          </a>
          <span aria-hidden>·</span>
          <a href={`${repo}/blob/main/LICENSE`} className="hover:text-ivory">
            AGPL-3.0
          </a>
        </p>
        <p className="max-w-md leading-relaxed text-faint/80">
          Fan-made and not affiliated with glaive or any label. Song data from Deezer, LRCLIB &amp; Genius.
        </p>
      </div>
    </footer>
  );
}
