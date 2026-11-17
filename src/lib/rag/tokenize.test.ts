import { describe, expect, it } from "vitest";

import { tokenize } from "./tokenize";

describe("tokenize", () => {
  it("macht klein, trennt an Satzzeichen und behält Umlaute", () => {
    expect(tokenize("Größe, Höhe; Breite!")).toEqual(["größe", "höhe", "breit"]);
  });

  it("entfernt Füllwörter und einzelne Zeichen", () => {
    expect(tokenize("Was ist der Preis a")).toEqual(["preis"]);
  });

  it("bringt Einzahl und Mehrzahl auf dieselbe Form", () => {
    expect(tokenize("Bestellung")).toEqual(tokenize("Bestellungen"));
  });

  it("lässt Zahlen und Kürzel stehen", () => {
    expect(tokenize("MIGO 101")).toEqual(["migo", "101"]);
  });

  it("gibt bei leerem Text eine leere Liste zurück", () => {
    expect(tokenize("   ")).toEqual([]);
  });
});
