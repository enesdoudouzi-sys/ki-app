// @vitest-environment node
import { existsSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { Bm25Index } from "./bm25";
import { chunkDocument } from "./chunk";
import { loadDocuments } from "./load";

/**
 * Auswertung auf der echten Next.js-Dokumentation (englisch, rund 300 Seiten).
 *
 * Jede Frage nennt die Seiten, die die Antwort enthalten (die Inhalte wurden nachgelesen).
 * Als Treffer zählt, wenn eine davon unter den ersten drei Ergebnissen steht. Die Fragen
 * wurden vor dem ersten Lauf festgelegt und nicht auf das Ergebnis hin angepasst.
 */
const DOCS_DIR = path.join(process.cwd(), "node_modules/next/dist/docs/01-app");

const CASES: Array<{ question: string; expected: string[] }> = [
  {
    question: "How do I use environment variables in Next.js?",
    expected: ["02-guides/environment-variables"],
  },
  {
    question: "Which variables are exposed to the browser?",
    expected: ["02-guides/environment-variables"],
  },
  {
    question: "How do I redirect a user to another page?",
    expected: [
      "02-guides/redirecting",
      "03-api-reference/04-functions/redirect",
      "03-api-reference/05-config/01-next-config-js/redirects",
    ],
  },
  {
    question: "How do I optimize images?",
    expected: ["01-getting-started/12-images", "03-api-reference/02-components/image"],
  },
  {
    question: "How do I load custom fonts?",
    expected: ["01-getting-started/13-fonts"],
  },
  {
    question: "What does the loading file do?",
    expected: ["03-api-reference/03-file-conventions/loading"],
  },
  {
    question: "How do I handle errors with error.js?",
    expected: [
      "03-api-reference/03-file-conventions/error",
      "01-getting-started/10-error-handling",
    ],
  },
  {
    question: "How do I read cookies on the server?",
    expected: ["03-api-reference/04-functions/cookies"],
  },
  {
    question: "How do I handle form submissions with Server Actions?",
    expected: ["02-guides/forms", "01-getting-started/07-mutating-data"],
  },
  {
    question: "Can I run Next.js in a Docker container?",
    expected: ["02-guides/self-hosting", "01-getting-started/17-deploying"],
  },
  {
    question: "What is the difference between Server Components and Client Components?",
    expected: ["01-getting-started/05-server-and-client-components"],
  },
  {
    question: "How do I invalidate cached data by tag?",
    expected: ["03-api-reference/04-functions/revalidateTag", "01-getting-started/09-revalidating"],
  },
];

describe.skipIf(!existsSync(DOCS_DIR))("Auswertung auf der Next.js-Dokumentation", () => {
  const documents = loadDocuments(DOCS_DIR);
  const index = new Bm25Index(documents.flatMap((document) => chunkDocument(document)));

  const results = CASES.map(({ question, expected }) => {
    const ids = [...new Set(index.search(question, 12).map((hit) => hit.chunk.documentId))].slice(
      0,
      5,
    );
    const position = ids.findIndex((id) => expected.includes(id));
    return { question, rank: position === -1 ? null : position + 1, top: ids.slice(0, 3) };
  });

  const hitAt3 = results.filter((r) => r.rank !== null && r.rank <= 3).length / CASES.length;
  const mrr = results.reduce((sum, r) => sum + (r.rank ? 1 / r.rank : 0), 0) / CASES.length;

  it("gibt die Kennzahlen aus", () => {
    console.log(
      [
        `Seiten: ${documents.length}, Fragen: ${CASES.length}`,
        `Treffer unter den ersten 3: ${(hitAt3 * 100).toFixed(0)} %`,
        `MRR: ${mrr.toFixed(2)}`,
        ...results.map(
          (r) => `  - ${r.question} -> ${r.rank ? `Rang ${r.rank}` : "nicht gefunden"}`,
        ),
      ].join("\n"),
    );
    expect(documents.length).toBeGreaterThan(100);
  });

  it("findet die richtige Seite in mindestens der Hälfte der Fälle unter den ersten drei", () => {
    // Bewusst niedrige Schwelle: Sie soll Verschlechterungen erkennen, nicht gut aussehen.
    expect(hitAt3).toBeGreaterThanOrEqual(0.5);
  });
});
