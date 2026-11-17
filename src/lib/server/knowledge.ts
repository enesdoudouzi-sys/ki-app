import "server-only";

import { existsSync } from "node:fs";
import path from "node:path";

import type { Source } from "@/lib/chat/protocol";
import { Bm25Index } from "@/lib/rag/bm25";
import { chunkDocument } from "@/lib/rag/chunk";
import { loadDocuments } from "@/lib/rag/load";

const MAX_CHARS_PER_SOURCE = 1200;

let cache: { directory: string; index: Bm25Index } | null | undefined;

/** Baut den Suchindex beim ersten Aufruf und hält ihn im Speicher. Fehlt der Ordner, läuft der Chat ohne Quellen. */
function getIndex(directory: string): Bm25Index | null {
  if (cache !== undefined && cache?.directory === directory) return cache.index;

  // Der Ordner ist per Umgebungsvariable frei wählbar. Der Kommentar verhindert, dass der Build wegen
  // des dynamischen Pfads das ganze Projekt in den Server-Build aufnimmt.
  const absolute = path.resolve(/*turbopackIgnore: true*/ process.cwd(), directory);
  if (!existsSync(absolute)) {
    console.error(`[rag] Quellordner nicht gefunden: ${absolute}. Der Chat läuft ohne Quellen.`);
    cache = null;
    return null;
  }

  const chunks = loadDocuments(absolute).flatMap((document) => chunkDocument(document));
  cache = { directory, index: new Bm25Index(chunks) };
  return cache.index;
}

/** `01-getting-started/05-fonts` wird zu `getting-started/fonts`, passend zu den Adressen der Dokumentation. */
export function toUrl(documentId: string, base: string | undefined): string | undefined {
  if (!base) return undefined;
  const cleaned = documentId
    .split("/")
    .map((part) => part.replace(/^\d+-/, ""))
    .join("/");
  return `${base.replace(/\/?$/, "/")}${cleaned}`;
}

export interface Retrieval {
  /** Nummerierte Auszüge für die Systemanweisung. */
  context: string;
  /** Dieselben Quellen für die Anzeige, in derselben Reihenfolge wie die Nummerierung. */
  sources: Source[];
}

export function retrieve(
  query: string,
  options: { directory: string; urlBase?: string; limit?: number },
): Retrieval | null {
  const index = getIndex(options.directory);
  if (!index) return null;

  const hits = index.search(query, options.limit ?? 4);
  if (hits.length === 0) return null;

  const sources: Source[] = [];
  const parts = hits.map(({ chunk }, i) => {
    sources.push({
      title: chunk.heading === chunk.title ? chunk.title : `${chunk.title}: ${chunk.heading}`,
      path: chunk.documentId,
      url: toUrl(chunk.documentId, options.urlBase),
    });
    return `[${i + 1}] ${chunk.title} (${chunk.heading})\n${chunk.text.slice(0, MAX_CHARS_PER_SOURCE)}`;
  });

  return { context: parts.join("\n\n"), sources };
}
