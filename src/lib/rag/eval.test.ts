// @vitest-environment node
import path from "node:path";

import { describe, expect, it } from "vitest";

import { Bm25Index } from "./bm25";
import { chunkDocument } from "./chunk";
import { loadDocuments } from "./load";

/**
 * Auswertung der Suche: Für jede Testfrage steht fest, welches Dokument die Antwort enthält.
 * Gemessen wird, ob und wie weit oben dieses Dokument in den Treffern erscheint.
 *
 * Die Fragen sind von Hand geschrieben und wurden NICHT auf das Ergebnis hin angepasst.
 * Ändert man Suche oder Inhalte, zeigt diese Auswertung, ob es besser oder schlechter wurde.
 */
const CASES: Array<{ question: string; expected: string }> = [
  { question: "Was bedeutet DAP bei den Incoterms?", expected: "incoterms" },
  { question: "Wer trägt bei EXW die Ausfuhrverzollung?", expected: "incoterms" },
  {
    question: "Wie berechne ich das Volumengewicht bei Luftfracht?",
    expected: "luftfracht-gewicht",
  },
  { question: "Was ist das Chargeable Weight?", expected: "luftfracht-gewicht" },
  { question: "Wie viele Stellen hat eine AWB-Nummer?", expected: "luftfrachtbrief" },
  { question: "Was ist der Unterschied zwischen MAWB und HAWB?", expected: "luftfrachtbrief" },
  { question: "Wofür brauche ich den Ausgangsvermerk?", expected: "atlas-ausfuhr" },
  { question: "Was ist eine MRN beim Zoll?", expected: "atlas-ausfuhr" },
  { question: "Was ist eine Lageraufgabe in EWM?", expected: "ewm-grundlagen" },
  { question: "Was ist eine Handling Unit?", expected: "ewm-grundlagen" },
  {
    question: "Mit welcher Transaktion buche ich den Wareneingang zur Bestellung?",
    expected: "sap-mm-beschaffung",
  },
  { question: "Was ist ein Three-Way-Match?", expected: "sap-mm-beschaffung" },
  { question: "Wie berechnet man die Umschlagshäufigkeit?", expected: "lagerkennzahlen" },
  { question: "Welche Dokumente brauche ich für den Export?", expected: "ausfuhrdokumente" },
];

/**
 * Schwerere Fragen: eigene Wörter statt der Wörter aus den Texten. Hier zeigt sich, wo eine reine
 * Stichwortsuche an ihre Grenze kommt. Das ist der Grund, später Embeddings (Suche nach Bedeutung)
 * auszuprobieren. Diese Fragen werden nur ausgewertet, nicht als Bedingung geprüft.
 */
const HARD_CASES: Array<{ question: string; expected: string }> = [
  { question: "Wann geht das Risiko auf den Käufer über?", expected: "incoterms" },
  {
    question: "Was kostet ein großer, aber leichter Karton im Flugzeug mehr?",
    expected: "luftfracht-gewicht",
  },
  {
    question: "Welche Nummer steht auf dem Frachtpapier der Airline?",
    expected: "luftfrachtbrief",
  },
  {
    question: "Wann gilt eine Lieferung ins Ausland steuerlich als nachgewiesen?",
    expected: "atlas-ausfuhr",
  },
  { question: "Wo im Regal wird die Palette abgelegt?", expected: "ewm-grundlagen" },
  {
    question: "Darf ich eine Lieferantenrechnung zahlen, wenn die Menge nicht stimmt?",
    expected: "sap-mm-beschaffung",
  },
  { question: "Wie lange reicht mein Lagerbestand noch?", expected: "lagerkennzahlen" },
  {
    question: "Brauche ich für Waren nach Kanada ein Herkunftspapier?",
    expected: "ausfuhrdokumente",
  },
];

const documents = loadDocuments(path.join(process.cwd(), "knowledge"));
const index = new Bm25Index(documents.flatMap((document) => chunkDocument(document)));

/** Rang (ab 1) des ersten Treffers aus dem erwarteten Dokument, oder null. */
function rankOf(question: string, expected: string): number | null {
  const documentIds = index.search(question, 5).map((hit) => hit.chunk.documentId);
  const position = documentIds.indexOf(expected);
  return position === -1 ? null : position + 1;
}

describe("Auswertung der schwereren Fragen (nur Information)", () => {
  it("gibt die Kennzahlen aus", () => {
    const ranks = HARD_CASES.map(({ question, expected }) => rankOf(question, expected));
    const found = ranks.filter((rank) => rank !== null && rank <= 3).length;
    console.log(
      [
        `Schwere Fragen: ${HARD_CASES.length}`,
        `Treffer unter den ersten 3: ${found} von ${HARD_CASES.length}`,
        ...HARD_CASES.map(
          ({ question }, i) =>
            `  - ${question} -> ${ranks[i] ? `Rang ${ranks[i]}` : "nicht gefunden"}`,
        ),
      ].join("\n"),
    );
    expect(ranks.length).toBe(HARD_CASES.length);
  });
});

describe("Auswertung der Wissenssuche", () => {
  const ranks = CASES.map(({ question, expected }) => rankOf(question, expected));
  const hitAt = (k: number) =>
    ranks.filter((rank) => rank !== null && rank <= k).length / CASES.length;
  const mrr = ranks.reduce<number>((sum, rank) => sum + (rank ? 1 / rank : 0), 0) / CASES.length;

  it("gibt die Kennzahlen aus", () => {
    const misses = CASES.flatMap(({ question }, i) =>
      ranks[i] === 1 ? [] : [`${question} -> ${ranks[i] ? `Rang ${ranks[i]}` : "nicht gefunden"}`],
    );
    console.log(
      [
        `Fragen: ${CASES.length}`,
        `Treffer an Position 1: ${(hitAt(1) * 100).toFixed(0)} %`,
        `Treffer unter den ersten 3: ${(hitAt(3) * 100).toFixed(0)} %`,
        `MRR: ${mrr.toFixed(2)}`,
        ...(misses.length ? ["Nicht an Position 1:", ...misses.map((line) => `  - ${line}`)] : []),
      ].join("\n"),
    );
    expect(CASES.length).toBeGreaterThan(0);
  });

  it("findet das richtige Dokument fast immer unter den ersten drei Treffern", () => {
    expect(hitAt(3)).toBeGreaterThanOrEqual(0.85);
  });

  it("setzt das richtige Dokument meist an die erste Stelle", () => {
    expect(mrr).toBeGreaterThanOrEqual(0.75);
  });
});
