# Changelog

All notable changes to this project are documented here.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and this project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

## [0.4.0] - 2026-11-17

### Added

- Streaks in every mode: daily (days in a row), endless (rounds in a row) and archive, per song pool, plus a cross-mode
  day streak and an all-4 streak. Shown in the game header, end card, home, archive, header and stats.
- Daily / Endless / Archive and Released / Unreleased switches on every game page; Settings dialog; filterable stats.
- `/database`: every song in the game, searchable and filterable, built for phones.
- 64 curated leaked songs (from unreleased.world), grouped by era, in the unreleased pool.
- ovine hall (glaive's alias, `ALIAS_ARTISTS`): 19 songs with audio and covers in the unreleased pool.
- ovine hall on/off switch (game pages and Settings) for the unreleased pool; turning it off gives its own daily.
- "Listen" button after every round and in the database: pick Spotify, Apple Music, YouTube Music, YouTube, Deezer,
  SoundCloud, TIDAL or Amazon Music in the app, optionally remembered as your default (Settings → Listen on).
  Apple Music links go straight to the track (iTunes Search API, cached); leaks get YouTube / SoundCloud searches.
- Catalog sync finds releases Deezer's artist endpoint leaves out (the _then i'll be happy_ EP, 2020 singles) and
  three times as many features.

### Changed

- "Hard" is now called "Unreleased" (and normal "Released") everywhere.
- Big centred play button in audio mode; no more emoji in the UI or share text.

### Fixed

- Leaks like "im alright." no longer reach the released pool via old daily picks or the home collage.

## [0.3.0] - 2026-11-17

### Added

- Unofficial uploads (distributor labels in `UNRELEASED_LABELS`, default "Too Lost") are classified as unreleased –
  e.g. "im alright." now only appears in hard mode.
- Admin can mark any song released/unreleased; overrides survive catalog syncs.

### Changed

- Classic board is a fluid grid: the whole row fits on phones (tested down to 320px) without sideways scrolling.
- Mode tabs fit on one line on small phones.

### Fixed

- Dev server reload loop: the dev database now lives in `~/.glaivedle/` instead of the watched project folder.
- Concurrent catalog syncs across bundles, and retries for Deezer's "quota exceeded" responses.
- A daily answer that is later reclassified as unreleased can still be guessed in normal mode.

## [0.2.0] - 2026-11-17

### Changed

- Complete redesign after glaivemusic.com and the _God Save The Three_ era: flat grey palette, tightly tracked
  Helvetica Neue, P22 Zaner Four script, Doto dot-matrix captions, underlined links, grey "selected" pills,
  raw cover collage on the home page, tour-list style rows, black video-player style audio mode.
- Icon library removed in favour of type, arrows and 4px square markers.

### Added

- "Covers" toggle in the header to hide album art in the guess list and classic tiles.
- Optional `ADOBE_FONTS_KIT` for licensed Helvetica Neue LT Pro.
- NOTICE file documenting third-party font licensing.

## [0.1.0] - 2026-11-17

### Added

- Four daily game modes: Classic (attribute tiles with ↑↓ hints), Lyrics, Audio (heardle-style) and Cover (pixelated artwork).
- Archive of every past daily and an Endless mode that unlocks per mode after finishing that day's daily.
- Hard mode with unreleased songs, features, shorter clips and colourless covers, with separate dailies and stats.
- Automatic catalog sync from Deezer, LRCLIB lyrics and optional Genius credits / unreleased songs / lyrics fallback.
- Server-sealed round tokens; audio sliced and covers pixelated server-side so answers never leak.
- Local stats, streaks, guess distribution and emoji share text.
- "Suggest an artist" form with vote counting, and an admin center (dashboard, requests, songs, manual sync).
- glaive "God Save The Three" theme, mobile-first layout.
- Docker image, Docker Compose file and Coolify instructions; health endpoint.

[Unreleased]: https://github.com/SEMLUVSFOOD/glaivedle/compare/v0.4.0...HEAD
[0.4.0]: https://github.com/SEMLUVSFOOD/glaivedle/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/SEMLUVSFOOD/glaivedle/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/SEMLUVSFOOD/glaivedle/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/SEMLUVSFOOD/glaivedle/releases/tag/v0.1.0
