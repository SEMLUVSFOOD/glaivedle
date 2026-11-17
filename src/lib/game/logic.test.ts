import { describe, expect, it } from "vitest";
import { clipSeconds, compareClassic, compareSets, coverBlocks, type ClassicSong, selectLyricLines } from "./logic";
import { featuresFromTitle, isVariantTitle, normTitle, stripFeatures } from "../normalize";
import { sliceMp3 } from "../media-slice";

const base: ClassicSong = {
  id: 1,
  releaseId: 10,
  project: "Y'all",
  type: "album",
  year: 2025,
  collaborators: [],
  producers: [],
  duration: 150,
  trackNumber: 4,
};

describe("compareClassic", () => {
  it("marks an identical song all green", () => {
    const cells = compareClassic(base, base, { producers: false });
    expect(cells.every((c) => c.verdict === "correct")).toBe(true);
  });

  it("gives arrows towards the answer", () => {
    const guess = { ...base, id: 2, releaseId: 11, year: 2021, duration: 200, trackNumber: 9 };
    const cells = Object.fromEntries(compareClassic(guess, base, { producers: false }).map((c) => [c.key, c]));
    expect(cells.project.verdict).toBe("wrong");
    expect(cells.year).toMatchObject({ verdict: "wrong", dir: "up" });
    expect(cells.length).toMatchObject({ verdict: "wrong", dir: "down" });
    expect(cells.track).toMatchObject({ verdict: "wrong", dir: "down" });
  });

  it("treats close lengths as partial", () => {
    const cells = compareClassic({ ...base, duration: 160 }, base, { producers: false });
    expect(cells.find((c) => c.key === "length")?.verdict).toBe("partial");
  });

  it("treats two unreleased songs as the same project", () => {
    const u = { ...base, releaseId: null, project: "Unreleased", type: "unreleased", trackNumber: null };
    const cells = Object.fromEntries(compareClassic({ ...u, id: 2 }, u, { producers: false }).map((c) => [c.key, c]));
    expect(cells.project.verdict).toBe("correct");
    expect(cells.type.verdict).toBe("correct");
    expect(cells.track.verdict).toBe("unknown");
  });

  it("marks leaks from different eras as a partial project match", () => {
    const u = { ...base, releaseId: null, project: "SoundCloud era", type: "unreleased", trackNumber: null };
    const cells = compareClassic({ ...u, id: 2, project: "cypress grove era" }, u, { producers: false });
    expect(cells.find((c) => c.key === "project")?.verdict).toBe("partial");
  });

  it("handles unknown data", () => {
    const cells = compareClassic({ ...base, duration: null, trackNumber: null }, base, { producers: false });
    expect(cells.find((c) => c.key === "length")?.verdict).toBe("unknown");
    expect(cells.find((c) => c.key === "track")?.verdict).toBe("unknown");
  });
});

describe("compareSets", () => {
  it("solo vs solo is correct", () => expect(compareSets([], [])).toBe("correct"));
  it("overlap is partial", () => expect(compareSets(["kurtains", "Kai Angel"], ["Kurtains"])).toBe("partial"));
  it("disjoint is wrong", () => expect(compareSets(["mgk"], ["ericdoa"])).toBe("wrong"));
  it("ignores case and punctuation", () => expect(compareSets(["Tiffany Day"], ["tiffany-day"])).toBe("correct"));
});

describe("normalisation", () => {
  it("strips features", () => {
    expect(stripFeatures("fall apart (with glaive)")).toBe("fall apart");
    expect(stripFeatures("THINK YOU RIGHT (feat. ericdoa & glaive)")).toBe("THINK YOU RIGHT");
  });
  it("normalises curly quotes and accents", () => {
    expect(normTitle("Y’all")).toBe(normTitle("Y'all"));
    expect(normTitle("phobie d’impulsion")).toBe("phobie d impulsion");
    expect(normTitle("Yaya Touré")).toBe("yaya toure");
  });
  it("detects variants", () => {
    expect(isVariantTitle("huh (sped up)")).toBe(true);
    expect(isVariantTitle("astrid")).toBe(false);
    expect(isVariantTitle("living proof (that it hurts)")).toBe(false);
  });
  it("extracts features from titles", () => {
    expect(featuresFromTitle("MENTAL (feat. Slump6s & glaive)")).toEqual(["Slump6s", "glaive"]);
  });
});

describe("selectLyricLines", () => {
  const lyrics = `[Verse 1]
I gave you everything
I gave you everything
astrid you look so pretty
Line four
Line five
Line six
Line seven
Line eight`;

  it("skips headers, duplicates and title giveaways", () => {
    const lines = selectLyricLines(lyrics, "astrid", 1, 10);
    expect(lines).not.toContain("[Verse 1]");
    expect(lines.filter((l) => l === "I gave you everything")).toHaveLength(1);
    expect(lines.some((l) => l.toLowerCase().includes("astrid"))).toBe(false);
  });

  it("is deterministic per seed and returns 6 lines", () => {
    const a = selectLyricLines(lyrics, "astrid", 42);
    expect(a).toHaveLength(6);
    expect(selectLyricLines(lyrics, "astrid", 42)).toEqual(a);
  });
});

describe("reveal schedules", () => {
  it("grows audio clips and unlocks the full preview at the end", () => {
    expect(clipSeconds(0, false, false)).toBe(1);
    expect(clipSeconds(5, false, false)).toBe(16);
    expect(clipSeconds(0, true, false)).toBe(0.5);
    expect(clipSeconds(2, false, true)).toBe(30);
  });
  it("sharpens covers and shows the original when finished", () => {
    expect(coverBlocks(0, false)).toBeLessThan(coverBlocks(3, false)!);
    expect(coverBlocks(2, true)).toBeNull();
  });
});

describe("sliceMp3", () => {
  it("keeps roughly the requested share of audio", () => {
    const buf = Buffer.alloc(30 * 16_000, 1);
    const out = sliceMp3(buf, 3);
    expect(out.length).toBeGreaterThan(3 * 16_000);
    expect(out.length).toBeLessThan(4 * 16_000);
    expect(sliceMp3(buf, 30).length).toBe(buf.length);
  });
});
