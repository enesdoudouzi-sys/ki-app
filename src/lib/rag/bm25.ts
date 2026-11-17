import type { Chunk } from "./chunk";
import { tokenize } from "./tokenize";

export interface SearchHit {
  chunk: Chunk;
  score: number;
}

export interface Bm25Options {
  /** Wie stark häufige Wiederholungen eines Wortes zählen (Sättigung). Üblich: 1,2 bis 2. */
  k1?: number;
  /** Wie stark lange Texte abgewertet werden. 0 = gar nicht, 1 = voll. */
  b?: number;
}

interface IndexedChunk {
  chunk: Chunk;
  termFrequency: Map<string, number>;
  length: number;
}

/**
 * Stichwortsuche nach dem BM25-Verfahren, dem Standard hinter vielen klassischen
 * Suchmaschinen. Ein Abschnitt bekommt Punkte für jedes Suchwort, das er enthält:
 * seltene Wörter zählen mehr (IDF), und lange Abschnitte werden leicht abgewertet.
 */
export class Bm25Index {
  private readonly items: IndexedChunk[];
  private readonly documentFrequency = new Map<string, number>();
  private readonly averageLength: number;
  private readonly k1: number;
  private readonly b: number;

  constructor(chunks: Chunk[], { k1 = 1.5, b = 0.75 }: Bm25Options = {}) {
    this.k1 = k1;
    this.b = b;

    this.items = chunks.map((chunk) => {
      // Der Titel zählt mit, damit "Incoterms" auch Abschnitte findet, die den Begriff selbst nicht wiederholen.
      const tokens = tokenize(`${chunk.title} ${chunk.heading} ${chunk.text}`);
      const termFrequency = new Map<string, number>();
      for (const token of tokens) {
        termFrequency.set(token, (termFrequency.get(token) ?? 0) + 1);
      }
      for (const term of termFrequency.keys()) {
        this.documentFrequency.set(term, (this.documentFrequency.get(term) ?? 0) + 1);
      }
      return { chunk, termFrequency, length: tokens.length };
    });

    const totalLength = this.items.reduce((sum, item) => sum + item.length, 0);
    this.averageLength = this.items.length > 0 ? totalLength / this.items.length : 0;
  }

  get size(): number {
    return this.items.length;
  }

  search(query: string, limit = 3): SearchHit[] {
    const terms = [...new Set(tokenize(query))];
    if (terms.length === 0 || this.items.length === 0) return [];

    const total = this.items.length;
    const hits: SearchHit[] = [];

    for (const item of this.items) {
      let score = 0;
      for (const term of terms) {
        const frequency = item.termFrequency.get(term);
        if (!frequency) continue;

        const documentsWithTerm = this.documentFrequency.get(term) ?? 0;
        const idf = Math.log(1 + (total - documentsWithTerm + 0.5) / (documentsWithTerm + 0.5));
        const lengthNorm = 1 - this.b + this.b * (item.length / this.averageLength);
        score += (idf * frequency * (this.k1 + 1)) / (frequency + this.k1 * lengthNorm);
      }
      if (score > 0) hits.push({ chunk: item.chunk, score });
    }

    return hits.sort((a, b) => b.score - a.score).slice(0, limit);
  }
}
