/** Häufige deutsche Füllwörter. Sie tragen kaum Bedeutung und würden jede Suche verwässern. */
const STOPWORDS = new Set([
  "der",
  "die",
  "das",
  "den",
  "dem",
  "des",
  "ein",
  "eine",
  "einen",
  "einem",
  "einer",
  "und",
  "oder",
  "aber",
  "ist",
  "sind",
  "war",
  "wird",
  "werden",
  "wurde",
  "hat",
  "haben",
  "von",
  "vom",
  "zu",
  "zum",
  "zur",
  "mit",
  "für",
  "auf",
  "in",
  "im",
  "an",
  "am",
  "aus",
  "bei",
  "nach",
  "als",
  "wie",
  "was",
  "wer",
  "wo",
  "wann",
  "welche",
  "welcher",
  "welches",
  "ich",
  "man",
  "es",
  "sich",
  "nicht",
  "auch",
  "dass",
  "bei",
  "um",
  "über",
]);

/**
 * Sehr einfache Stammformreduktion: schneidet häufige Endungen ab, damit
 * "Bestellungen" und "Bestellung" zusammenpassen. Bewusst primitiv und leicht
 * zu durchschauen; ein echter Stemmer (z. B. Snowball) wäre genauer.
 */
function stem(word: string): string {
  if (word.length <= 5) return word;
  return word.replace(/(en|er|es|e|n|s)$/, "");
}

/** Zerlegt Text in kleingeschriebene Wörter ohne Füllwörter und Sonderzeichen. */
export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((word) => word.length > 1 && !STOPWORDS.has(word))
    .map(stem);
}
