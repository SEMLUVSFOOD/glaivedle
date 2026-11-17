# Changelog

All notable changes to this project are documented here.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and this project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

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

[Unreleased]: https://github.com/SEMLUVSFOOD/glaivedle/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/SEMLUVSFOOD/glaivedle/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/SEMLUVSFOOD/glaivedle/releases/tag/v0.1.0
