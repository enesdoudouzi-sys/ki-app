import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

import type { Document } from "./chunk";

function listMarkdownFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return listMarkdownFiles(fullPath);
    return entry.name.endsWith(".md") && entry.name.toLowerCase() !== "readme.md" ? [fullPath] : [];
  });
}

/** Trennt einen YAML-Kopf (zwischen "---"-Zeilen) vom Text und liest `title` daraus. */
function splitFrontMatter(raw: string): { title?: string; body: string } {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(raw);
  if (!match) return { body: raw };
  const title = /^title:\s*(.+)$/m
    .exec(match[1])?.[1]
    .trim()
    .replace(/^['"]|['"]$/g, "");
  return { title, body: raw.slice(match[0].length) };
}

/**
 * Liest alle Markdown-Dateien eines Ordners samt Unterordnern. Die Kennung ist der Pfad relativ
 * zum Ordner ohne ".md". Der Titel kommt aus dem YAML-Kopf, sonst aus der ersten Überschrift.
 */
export function loadDocuments(directory: string): Document[] {
  return listMarkdownFiles(directory)
    .sort()
    .map((file) => {
      const id = path.relative(directory, file).split(path.sep).join("/").replace(/\.md$/, "");
      const { title: headTitle, body } = splitFrontMatter(readFileSync(file, "utf8"));
      const title = headTitle ?? /^#\s+(.*)$/m.exec(body)?.[1].trim() ?? id;
      return { id, title, text: body };
    });
}
