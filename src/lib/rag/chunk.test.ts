import { describe, expect, it } from "vitest";

import { chunkDocument } from "./chunk";

const document = {
  id: "demo",
  title: "Demo",
  text: [
    "# Demo",
    "",
    "Einleitung.",
    "",
    "## Teil A",
    "",
    "Text A.",
    "",
    "## Teil B",
    "",
    "Text B.",
  ].join("\n"),
};

describe("chunkDocument", () => {
  it("teilt an Überschriften und merkt sich die Überschrift", () => {
    const chunks = chunkDocument(document);
    expect(chunks.map((chunk) => [chunk.heading, chunk.text])).toEqual([
      ["Demo", "Einleitung."],
      ["Teil A", "Text A."],
      ["Teil B", "Text B."],
    ]);
  });

  it("zerlegt zu lange Abschnitte an Absätzen", () => {
    const long = {
      id: "long",
      title: "Lang",
      text: ["# Lang", "", "a".repeat(50), "", "b".repeat(50), "", "c".repeat(50)].join("\n"),
    };
    expect(chunkDocument(long, 80).length).toBe(3);
  });

  it("erzeugt keine leeren Abschnitte", () => {
    expect(chunkDocument({ id: "x", title: "X", text: "# X\n\n## Leer\n\n" })).toEqual([]);
  });
});

describe("chunkDocument mit Codeblöcken", () => {
  it("hält Kommentarzeilen in Codeblöcken nicht für Überschriften", () => {
    const text = [
      "# Titel",
      "",
      "Text.",
      "",
      "```bash",
      "# ein Kommentar",
      "npm install",
      "```",
    ].join("\n");
    const chunks = chunkDocument({ id: "x", title: "Titel", text });
    expect(chunks).toHaveLength(1);
    expect(chunks[0]?.text).toContain("# ein Kommentar");
  });
});
