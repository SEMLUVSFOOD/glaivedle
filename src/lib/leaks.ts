/**
 * Curated list of leaked / unreleased glaive songs (hard mode only).
 *
 * Compiled from the community tracker at https://www.unreleased.world/glaive (Nov 2026).
 * Only full songs are listed: earlier versions of released songs, remixes, covers,
 * DJ sets, livestreams and sub-minute snippets are left out. Years are the era's
 * leak/recording year, durations are taken from the tracker's (latest) version.
 *
 * Any synced song whose title matches an entry here is forced to "unreleased",
 * whatever Deezer or Genius say — that's how unofficial uploads like "im alright."
 * stay out of normal mode. Admin overrides in /admin/songs still win.
 */

export type Era = { key: string; label: string; year: number };

export const ERAS = {
  soundcloud: { key: "soundcloud", label: "SoundCloud era", year: 2020 },
  cg: { key: "cg", label: "cypress grove era", year: 2020 },
  adgth: { key: "adgth", label: "all dogs go to heaven era", year: 2021 },
  odnt: { key: "odnt", label: "old dog, new tricks era", year: 2021 },
  icsmtidcaa: { key: "icsmtidcaa", label: "i care so much era", year: 2023 },
  aboamo: { key: "aboamo", label: "a bit of a mad one era", year: 2023 },
  minf: { key: "minf", label: "May It Never Falter era", year: 2024 },
} as const satisfies Record<string, Era>;

export type EraKey = keyof typeof ERAS;

export type Leak = { title: string; era: EraKey; duration?: number; collaborators?: string[] };

const s = (title: string, era: EraKey, duration?: number): Leak => ({ title, era, duration });

export const LEAKS: Leak[] = [
  // SoundCloud era (2019–2020)
  s("Anxiety Attack", "soundcloud", 144),
  s("High Fashion", "soundcloud", 136),
  s("Grey Matter", "soundcloud", 85),
  s("Sergeant", "soundcloud", 133),
  s("Skeletons", "soundcloud", 123),
  s("Scrapes N Cuts", "soundcloud", 134),
  s("Dragunov", "soundcloud", 106),
  s("Boof.jfif", "soundcloud", 134),
  s("Robinz", "soundcloud", 179),
  s("Scream", "soundcloud", 132),
  s("Ksubi Blessings", "soundcloud", 132),
  s("Life Is Pain", "soundcloud", 93),
  s("Mimikyu", "soundcloud", 105),
  s("Ten Ton Truck", "soundcloud", 124),
  s("Why Does My Head Always Hurt So Bad", "soundcloud", 98),
  s("Spinna", "soundcloud", 129),

  // cypress grove era (2020)
  s("Everything", "cg", 137),
  s("GET USED TO IT", "cg", 205),
  s("Im A Mess", "cg", 118),
  s("Its All A Waste", "cg", 159),
  s("October's Lullaby", "cg", 91),
  s("Quicksand", "cg", 136),

  // all dogs go to heaven era (2021)
  s("A Date With Karma", "adgth", 124),
  s("Dial Tone", "adgth", 160),
  s("Fuck Cancer Freestyle", "adgth", 87),
  s("Bird", "adgth", 113),
  s("Crynomore", "adgth", 108),
  s("Forget Her", "adgth", 94),
  s("Fuck It", "adgth", 122),
  s("Fuck This Town", "adgth", 115),
  s("Function", "adgth", 119),
  s("Grow Up", "adgth", 97),
  s("Handle Me", "adgth", 134),
  s("Heather", "adgth", 112),
  s("Hoohohohoh", "adgth", 144),
  s("I Hate 2 See U Cry", "adgth", 127),
  s("Perfect", "adgth", 108),
  s("Rigor Mortis (555)", "adgth", 139),
  s("Seven Deadly Sins", "adgth", 122),
  s("THINK YOU RIGHT", "adgth", 113),

  // old dog, new tricks era (2021–2022) — "im alright." was uploaded via Too Lost in Sept 2021
  s("im alright.", "odnt", 106),
  s("Girl I Met", "odnt", 163),
  s("Marie Antoinette", "odnt", 118),
  s("Violent", "odnt", 193),
  s("Wasting Away Again", "odnt", 139),

  // i care so much that i dont care at all era (2022–2023)
  s("Coke / Blow", "icsmtidcaa", 147),
  s("More Than Life", "icsmtidcaa", 196),
  s("A Mattress Is A Man's Best Friend", "icsmtidcaa", 133),
  s("Crying Like A Bitch", "icsmtidcaa", 101),
  s("DEVO4KA", "icsmtidcaa", 160),
  s("Don't Bring This Up Again", "icsmtidcaa", 155),
  s("For U", "icsmtidcaa", 115),
  s("Fear Of God And The Catholic Church", "icsmtidcaa", 123),
  s("Fruit & Cookie & A Cute Little Muffin", "icsmtidcaa", 188),
  s("I Met The Devil In Barcelona", "icsmtidcaa", 97),
  s("Fuck 'em, We Ball", "icsmtidcaa", 145),
  s("Fun Time To Be Uhh", "icsmtidcaa", 157),
  s("Grapes", "icsmtidcaa", 176),
  s("I Wish I Could But My Mom Would Kill Me", "icsmtidcaa", 207),
  s("Thirty Dollar T Shirt I Might As Well Die In It", "icsmtidcaa", 120),
  s("Note To Self Nothing Good Has Ever Happened In Florida", "icsmtidcaa", 170),
  s("Or Are You Drunk? I Can Never Tell", "icsmtidcaa", 184),
  s("Shoreditch", "icsmtidcaa", 153),
  s("The 6 Most Prescribed Adhd Medications", "icsmtidcaa", 134),
  s("This Song Is In A Minor At 126 Bpm", "icsmtidcaa", 160),
  s("Unsaid", "icsmtidcaa", 119),
  s("Zoe Kravitz Eat Your Heart Out", "icsmtidcaa", 169),

  // a bit of a mad one era (2023–2024)
  s("All The Blackbirds Freestyle", "aboamo", 70),
  s("And The Highbeams Were On", "aboamo", 120),
  s("Denver 1190", "aboamo", 123),
  s("Theres A Little Bit Farther Left To Go", "aboamo", 131),
  s("Two Clouds Split Apart The Sun", "aboamo", 101),

  // May It Never Falter era (2024)
  s("Cyanide", "minf", 148),
  s("Throw It Up", "minf", 210),
];

export const eraLabel = (key: string | null | undefined) =>
  key && key in ERAS ? ERAS[key as EraKey].label : null;
