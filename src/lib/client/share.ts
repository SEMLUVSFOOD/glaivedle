import { verdictEmoji } from "../game/logic";
import { MODE_INFO, type GuessEntry, type RoundView } from "../game/types";

export function shareText(round: RoundView, guesses: GuessEntry[], site: string): string {
  const head = [
    "glaivedle",
    round.kind === "endless" ? "∞" : `#${round.number}`,
    `· ${MODE_INFO[round.mode].title}`,
    round.hard ? "· 💀 hard" : "",
  ]
    .filter(Boolean)
    .join(" ");

  let body: string;
  if (round.mode === "classic") {
    const rows = guesses.map((g) => (g.cells ?? []).map((c) => verdictEmoji(c.verdict)).join(""));
    body = rows.length > 6 ? [...rows.slice(0, 5), `… +${rows.length - 5} more`].join("\n") : rows.join("\n");
    body = `${round.won ? `Got it in ${guesses.length}` : "Gave up"} ${round.won ? "✝" : ""}\n${body}`;
  } else {
    const max = round.maxGuesses ?? 6;
    const cells: string[] = guesses.map((g) => (g.correct ? "🟩" : g.id === null ? "⬛" : "🟥"));
    while (cells.length < max) cells.push("⬜");
    body = `${round.won ? `${guesses.length}/${max}` : `X/${max}`}\n${cells.join("")}`;
  }
  return `${head}\n${body}\n${site}`;
}
