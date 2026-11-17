import { describe, expect, it } from "vitest";

import { Bm25Index } from "./bm25";
import type { Chunk } from "./chunk";

const chunk = (heading: string, text: string): Chunk => ({
  documentId: heading,
  title: heading,
  heading,
  text,
});

const index = new Bm25Index([
  chunk("Zoll", "Die Ausfuhr wird beim Zoll elektronisch angemeldet."),
  chunk("Lager", "Im Lager werden Paletten auf Lagerplätzen eingelagert."),
  chunk("Fracht", "Die Fracht wird nach Gewicht und Volumen berechnet."),
]);

describe("Bm25Index", () => {
  it("liefert den passendsten Abschnitt zuerst", () => {
    expect(index.search("Paletten im Lager")[0]?.chunk.heading).toBe("Lager");
  });

  it("findet Wörter auch in anderer Form", () => {
    expect(index.search("Zollanmeldungen Ausfuhren")[0]?.chunk.heading).toBe("Zoll");
  });

  it("gibt nichts zurück, wenn kein Suchwort vorkommt", () => {
    expect(index.search("Schokolade")).toEqual([]);
  });

  it("gibt bei einer Frage nur aus Füllwörtern nichts zurück", () => {
    expect(index.search("was ist der")).toEqual([]);
  });

  it("begrenzt die Trefferzahl", () => {
    expect(index.search("die wird", 1).length).toBeLessThanOrEqual(1);
  });

  it("wertet seltene Wörter höher als häufige", () => {
    const rare = new Bm25Index([
      chunk("A", "paket paket paket versand"),
      chunk("B", "paket sendungsverfolgung"),
      chunk("C", "paket lieferung"),
    ]);
    expect(rare.search("paket sendungsverfolgung")[0]?.chunk.heading).toBe("B");
  });

  it("kommt mit einem leeren Index zurecht", () => {
    expect(new Bm25Index([]).search("irgendwas")).toEqual([]);
  });
});
