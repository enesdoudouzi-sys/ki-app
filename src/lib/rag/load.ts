import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

import type { Document } from "./chunk";

/** Liest alle Markdown-Dateien eines Ordners. Die erste Überschrift wird zum Titel. */
export function loadDocuments(directory: string): Document[] {
  return readdirSync(directory)
    .filter((name) => name.endsWith(".md") && name.toLowerCase() !== "readme.md")
    .sort()
    .map((name) => {
      const text = readFileSync(path.join(directory, name), "utf8");
      const id = name.replace(/\.md$/, "");
      const title = /^#\s+(.*)$/m.exec(text)?.[1].trim() ?? id;
      return { id, title, text };
    });
}
