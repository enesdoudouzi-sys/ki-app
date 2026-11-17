// @vitest-environment node
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { loadDocuments } from "./load";

let directory: string;

beforeEach(() => {
  directory = mkdtempSync(path.join(tmpdir(), "rag-"));
});
afterEach(() => rmSync(directory, { recursive: true, force: true }));

describe("loadDocuments", () => {
  it("liest Unterordner und bildet die Kennung aus dem relativen Pfad", () => {
    mkdirSync(path.join(directory, "a/b"), { recursive: true });
    writeFileSync(path.join(directory, "a/b/seite.md"), "# Seite\n\nText");

    expect(loadDocuments(directory).map((document) => document.id)).toEqual(["a/b/seite"]);
  });

  it("nimmt den Titel aus dem YAML-Kopf und entfernt ihn aus dem Text", () => {
    writeFileSync(
      path.join(directory, "doc.md"),
      "---\ntitle: 'Mein Titel'\ndescription: x\n---\n\nInhalt hier",
    );

    const [document] = loadDocuments(directory);
    expect(document?.title).toBe("Mein Titel");
    expect(document?.text).not.toContain("description");
    expect(document?.text).toContain("Inhalt hier");
  });

  it("fällt auf die erste Überschrift und dann auf die Kennung zurück", () => {
    writeFileSync(path.join(directory, "mit.md"), "# Überschrift\n\nText");
    writeFileSync(path.join(directory, "ohne.md"), "Nur Text");

    expect(loadDocuments(directory).map((document) => document.title)).toEqual([
      "Überschrift",
      "ohne",
    ]);
  });

  it("ignoriert README und andere Dateitypen", () => {
    writeFileSync(path.join(directory, "README.md"), "# Lies mich");
    writeFileSync(path.join(directory, "bild.png"), "x");

    expect(loadDocuments(directory)).toEqual([]);
  });
});
