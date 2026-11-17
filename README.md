# glaivedle ✝

**The daily glaive song guessing game** — live at [glaivedle.lol](https://glaivedle.lol).

A fan-made, open-source -dle game in the spirit of Wordle, loldle and Hitster. Four new puzzles every day:

| Mode        | How it works                                                                                                  |
| ----------- | ------------------------------------------------------------------------------------------------------------- |
| **Classic** | Guess any song. Tiles for project, type, year, collabs, length and track # turn 🟩 / 🟨 / 🟥, with ↑↓ hints. |
| **Lyrics**  | One lyric line; every miss reveals the next line. 6 tries.                                                    |
| **Audio**   | Heardle-style: 1s of the intro, growing with every miss or skip. 6 tries.                                     |
| **Cover**   | A pixelated cover that sharpens with every miss. 6 tries.                                                     |

- 📅 **Daily** puzzles (same for everyone, resets at midnight Europe/Amsterdam), stats and emoji sharing
- 🔥 **Streaks everywhere** — every mode has a daily streak (days in a row), an endless streak (rounds in a row) and an
  archive streak, per difficulty, plus a cross-mode day streak and an "all 4 won" streak
- 🎛 **Quick switches** — Daily / Endless / Archive and Released / Unreleased toggles on every game page, a Settings dialog and
  a filterable Stats dialog
- 🗂 **Archive** — play every past day
- ♾ **Endless** — unlocks per mode once you've finished that day's daily
- 💀 **Released / Unreleased** — the "Unreleased" song pool (hard mode) adds leaks, unreleased songs and features, shorter audio clips, colourless covers; separate dailies and stats
- 🎧 **Listen anywhere** — after a round (or in the database) pick your platform in the app: Spotify, Apple Music,
  YouTube (Music), Deezer, SoundCloud, TIDAL, Amazon Music; remember a default in Settings
- 🗃 **Database** (`/database`) — every song in the game, searchable and filterable (released / unreleased, type), with
  details per song; built for phones
- 🛠 **Admin center** (`/admin`) — catalog stats, plays, today's answers, sync log, artist requests and song toggles
- ✨ **Suggest an artist** — requests (with vote counting) land in the admin center
- 🖼 **Covers toggle** — hide album art while guessing
- 📱 Mobile-first, styled after [glaivemusic.com](https://www.glaivemusic.com) and _God Save The Three_

Answers never reach the browser: rounds are AES-GCM sealed tokens, audio is sliced server-side to the unlocked
length and covers are pixelated server-side.

## Data sources

Everything is synced automatically (on first boot and every `SYNC_INTERVAL_HOURS`). Daily answers pick themselves
at midnight (no admin action needed) and never repeat within ~60 days.
Whenever the sync logic changes (`SYNC_VERSION` in `src/lib/sync.ts`), the next deploy re-syncs on boot.

- **[Deezer API](https://developers.deezer.com/api)** — discography, track numbers, durations, release dates, collaborators, cover art and 30s previews (no key needed)
- **[LRCLIB](https://lrclib.net)** — lyrics (open database, no key needed)
- **Deezer search fallback** — Deezer's artist endpoint leaves out some releases (e.g. the _then i'll be happy_ EP
  and the 2020 singles), so the sync also searches for albums and features credited to the artist
- **Alias projects** (`ALIAS_ARTISTS`, default glaive's alias _ovine hall_) — released under another name, with audio
  previews and covers. They have their **own switch**, independent of Released / Unreleased, so players can add
  ovine hall to either pool (each combination has its own daily).
- **Curated leaks** (`src/lib/leaks.ts`) — 64 leaked glaive songs compiled from the community tracker
  [unreleased.world](https://www.unreleased.world/glaive), grouped by era. They're added to hard mode, and any synced song
  with a matching title is forced to unreleased (so leaks never show up in normal mode).
- Releases uploaded through unofficial distributors (`UNRELEASED_LABELS`, e.g. _"im alright."_ via Too Lost) are treated as **unreleased** (hard mode only). Admins can override any song's status in `/admin/songs`; overrides survive re-syncs.
- **[Genius API](https://docs.genius.com)** _(optional, `GENIUS_ACCESS_TOKEN`)_ — producer credits, unreleased songs for hard mode, and a lyrics fallback when LRCLIB has nothing

## Stack

Next.js 16 (App Router, Cache Components) · React 19 · Tailwind CSS 4 · SQLite (better-sqlite3) · sharp · zod · Vitest.
No external database or cache needed — one container and one volume.

## Running locally

```bash
pnpm install
cp .env.example .env.local   # set APP_SECRET + ADMIN_PASSWORD
pnpm dev                     # http://localhost:3000 — the first catalog sync starts automatically
```

```bash
pnpm test        # unit tests
pnpm lint        # eslint
pnpm typecheck   # tsc
pnpm build       # production build
```

## Deploying with Coolify

**Option A — Dockerfile (recommended)**

1. In Coolify: _New resource → Public/Private repository_ → this repo, build pack **Dockerfile**, port **3000**.
2. Add a **persistent storage** volume mounted at **`/data`** (the SQLite database lives there).
3. Set environment variables (see below) — at minimum `APP_SECRET` and `ADMIN_PASSWORD`.
4. Enable _"Include Source Commit in Build"_ so the footer shows the deployed commit.
5. Point your domain (e.g. `glaivedle.lol`) at the app and deploy. Healthcheck: `GET /api/health`.

**Option B — Docker Compose**

Choose the **Docker Compose** build pack; `docker-compose.yml` already defines the `/data` volume.
The same file works anywhere with `docker compose up -d`.

### Environment variables

| Variable              | Required | Default                | Description                                               |
| --------------------- | -------- | ---------------------- | --------------------------------------------------------- |
| `APP_SECRET`          | ✅       | —                      | Long random string (`openssl rand -base64 48`)            |
| `ADMIN_PASSWORD`      | ✅       | —                      | Password for `/admin`                                     |
| `PUBLIC_URL`          |          | `https://glaivedle.lol`| Used for metadata                                         |
| `GENIUS_ACCESS_TOKEN` |          | —                      | Enables producers, unreleased songs, lyrics fallback      |
| `ARTIST_SLUG`         |          | `glaive`               | Artist key in the database                                |
| `ARTIST_NAME`         |          | `glaive`               | Artist name used for lookups                              |
| `DEEZER_ARTIST_ID`    |          | `7411938`              | Pin the Deezer artist                                     |
| `DAILY_TIMEZONE`      |          | `Europe/Amsterdam`     | When the daily resets                                     |
| `LAUNCH_DATE`         |          | `2026-11-17`           | Day of puzzle #1 (archive starts here)                    |
| `SYNC_INTERVAL_HOURS` |          | `24`                   | Catalog re-sync interval (`0` disables)                   |
| `DATABASE_PATH`       |          | `/data/glaivedle.db`   | SQLite file location                                      |
| `UNRELEASED_LABELS`   |          | `Too Lost`             | Comma-separated distributor labels treated as leaks → unreleased |
| `ALIAS_ARTISTS`       |          | `ovinehall:ovine hall:213958057` | Other names the artist releases under (`slug:Name:deezerId`, comma-separated) → own on/off switch |
| `ADOBE_FONTS_KIT`     |          | —                      | Adobe Fonts kit id for Helvetica Neue LT Pro (build-time) |

## Design & fonts

The look follows glaivemusic.com and the _God Save The Three_ era: flat `#d5d5d5` / `#757575`, tightly tracked
Helvetica Neue, dot-matrix captions, underlined links and raw imagery.

| Role       | Font                                                                    |
| ---------- | ----------------------------------------------------------------------- |
| Text       | Helvetica Neue (system on Apple, or via `ADOBE_FONTS_KIT`), Inter Tight fallback |
| Script     | **P22 Zaner Four** (`public/fonts/`), Pinyon Script fallback            |
| Captions   | Doto (dot matrix, OFL)                                                   |
| Accents    | Times New Roman italic (system)                                          |

> **P22 Zaner Four is a commercial font licensed to the site owner. It is _not_ covered by the AGPL-3.0 licence of
> this repository.** If you fork or self-host glaivedle, buy your own licence from P22 or delete
> `public/fonts/P22ZanerFour.woff2` — the site falls back to Pinyon Script automatically.

## Multiple artists

The data model (artists → releases → songs, puzzles and plays per artist) is artist-aware, and catalog sync
works for any artist on Deezer. Right now the site runs one artist per deployment (`ARTIST_*` variables) with the
glaive theme in `src/app/globals.css`. Fan requests from `/suggest` are collected in the admin center so the
most-wanted artists can be added next.

## Versioning & releases

The project follows [Semantic Versioning](https://semver.org) and keeps a [CHANGELOG](CHANGELOG.md).
The version (from `package.json`) and the commit SHA are shown in the site footer.

```bash
pnpm release:patch   # or release:minor / release:major — bumps package.json, commits and tags vX.Y.Z
git push --follow-tags
```

## License

Code: [AGPL-3.0](LICENSE) © Sem Sannen — [semsannen.com](https://semsannen.com).
If you host a modified version, you must publish your source code too.
Third-party fonts keep their own licences (see [Design & fonts](#design--fonts) and [NOTICE](NOTICE)).

glaivedle is a fan project and is not affiliated with glaive, any label, Deezer, LRCLIB or Genius.
Song metadata, artwork, previews and lyrics belong to their respective owners.
