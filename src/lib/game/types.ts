export const MODES = ["classic", "lyrics", "audio", "cover"] as const;
export type Mode = (typeof MODES)[number];
export type Kind = "daily" | "archive" | "endless";

export const MODE_INFO: Record<Mode, { title: string; blurb: string; maxGuesses: number | null; emoji: string }> = {
  classic: { title: "Classic", blurb: "Guess the song from its stats", maxGuesses: null, emoji: "✝" },
  lyrics: { title: "Lyrics", blurb: "Name the song from a lyric", maxGuesses: 6, emoji: "✎" },
  audio: { title: "Audio", blurb: "Recognise the intro", maxGuesses: 6, emoji: "♪" },
  cover: { title: "Cover", blurb: "Spot the artwork", maxGuesses: 6, emoji: "◈" },
};

export const isMode = (m: unknown): m is Mode => typeof m === "string" && (MODES as readonly string[]).includes(m);

export type Verdict = "correct" | "partial" | "wrong" | "unknown";
export type Direction = "up" | "down" | null;

export type Cell = {
  key: string;
  label: string;
  value: string;
  verdict: Verdict;
  dir?: Direction;
};

/** One entry in the guess autocomplete. */
export type Option = { id: number; title: string; sub: string; cover: string | null; year: string | null };

export type AnswerInfo = {
  id: number;
  title: string;
  project: string;
  type: string;
  year: string | null;
  cover: string | null;
  deezerUrl: string | null;
  geniusUrl: string | null;
};

export type GuessEntry = {
  id: number | null; // null = skipped
  title: string;
  cover: string | null;
  correct: boolean;
  cells?: Cell[];
};

export type Reveal = {
  lines?: string[];
  totalLines?: number;
  clipSeconds?: number;
  pixelStep?: number;
  mediaUrl?: string;
};

export type RoundView = {
  token: string;
  mode: Mode;
  kind: Kind;
  hard: boolean;
  date: string | null;
  number: number | null;
  step: number;
  maxGuesses: number | null;
  finished: boolean;
  won: boolean;
  reveal: Reveal;
  answer?: AnswerInfo;
  proof?: string;
  solvers?: number;
};

export type GuessResponse = {
  entry: GuessEntry;
  round: RoundView;
};

/** One row of the public song database (/database). */
export type CatalogSong = {
  id: number;
  title: string;
  project: string;
  type: string;
  typeLabel: string;
  pool: "released" | "unreleased";
  date: string | null;
  duration: number | null;
  track: number | null;
  collaborators: string[];
  producers: string[];
  cover: string | null;
  lyrics: boolean;
  audio: boolean;
  deezerUrl: string | null;
  geniusUrl: string | null;
};

export type PlatformKey =
  | "spotify"
  | "apple"
  | "youtubemusic"
  | "youtube"
  | "deezer"
  | "soundcloud"
  | "tidal"
  | "amazon"
  | "genius"
  | "tracker";

/** One "listen on" option; direct = links straight to the song, otherwise a search on that platform. */
export type Platform = { key: PlatformKey; url: string; direct: boolean };
export type ListenLinks = { title: string; artist: string; platforms: Platform[] };

export const PLATFORM_LABEL: Record<PlatformKey, string> = {
  spotify: "Spotify",
  apple: "Apple Music",
  youtubemusic: "YouTube Music",
  youtube: "YouTube",
  deezer: "Deezer",
  soundcloud: "SoundCloud",
  tidal: "TIDAL",
  amazon: "Amazon Music",
  genius: "Genius",
  tracker: "Leak tracker",
};
