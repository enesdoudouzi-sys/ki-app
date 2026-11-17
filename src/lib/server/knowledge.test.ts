// @vitest-environment node
import path from "node:path";

import { describe, expect, it, vi } from "vitest";

import { retrieve, toUrl } from "./knowledge";

const fixtures = path.join("src", "lib", "rag", "fixtures");

describe("toUrl", () => {
  it("entfernt Nummernpräfixe und hängt den Pfad an die Basisadresse", () => {
    expect(toUrl("01-getting-started/05-fonts", "https://example.com/docs")).toBe(
      "https://example.com/docs/getting-started/fonts",
    );
  });

  it("gibt ohne Basisadresse nichts zurück", () => {
    expect(toUrl("a/b", undefined)).toBeUndefined();
  });
});

describe("retrieve", () => {
  it("liefert nummerierte Auszüge und passende Quellen in gleicher Reihenfolge", () => {
    const result = retrieve("Was bedeutet DAP bei den Incoterms?", { directory: fixtures });

    expect(result).not.toBeNull();
    expect(result?.context).toMatch(/^\[1\] /);
    expect(result?.sources[0]?.path).toBe("incoterms");
    expect(result?.sources).toHaveLength(result?.context.match(/^\[\d+\] /gm)?.length ?? -1);
  });

  it("gibt null zurück, wenn nichts passt", () => {
    expect(retrieve("Schokoladenkuchen backen", { directory: fixtures })).toBeNull();
  });

  it("läuft ohne Quellen weiter, wenn der Ordner fehlt", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(retrieve("irgendwas", { directory: "gibt/es/nicht" })).toBeNull();
  });
});
