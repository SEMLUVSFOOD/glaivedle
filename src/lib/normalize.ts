/** Title normalisation shared between sources so the same song dedupes across Deezer, Genius and LRCLIB. */

const VARIANT_RE =
  /[([](?:[^)\]]*\b)?(sped ?up|slowed|reverb|instrumental|remix|acoustic|live|demo|a ?cappella|clean|edit|version|mix|extended|snippet|cdq|leak)\b[^)\]]*[)\]]/i;

/** Strips feature credits like "(feat. X)", "[with Y]", "- feat Z". */
export function stripFeatures(title: string): string {
  return title
    .replace(/\s*[([](?:feat\.?|ft\.?|featuring|with|prod\.?(?: by)?)\s[^)\]]*[)\]]/gi, "")
    .replace(/\s+-\s+(?:feat\.?|ft\.?|featuring)\s.*$/i, "")
    .replace(/\s+w\/\s?.*$/i, "")
    .trim();
}

export function normTitle(title: string): string {
  return stripFeatures(title)
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[’‘`´]/g, "'")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function isVariantTitle(title: string): boolean {
  return VARIANT_RE.test(title);
}

/** Pulls "feat. A, B & C" names out of a title. */
export function featuresFromTitle(title: string): string[] {
  const m = title.match(/[([](?:feat\.?|ft\.?|featuring|with)\s([^)\]]+)[)\]]/i) ?? title.match(/\s+w\/\s?(.+)$/i);
  if (!m) return [];
  return m[1]
    .split(/\s*(?:,|&|\band\b|\bx\b)\s*/i)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function normName(name: string): string {
  return name.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "");
}

export function uniqueNames(names: string[]): string[] {
  const seen = new Map<string, string>();
  for (const n of names) {
    const k = normName(n);
    if (k && !seen.has(k)) seen.set(k, n.trim());
  }
  return [...seen.values()];
}
