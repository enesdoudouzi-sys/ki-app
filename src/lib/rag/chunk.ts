export interface Document {
  /** Eindeutige Kennung, z. B. der Dateiname ohne Endung. */
  id: string;
  title: string;
  text: string;
}

export interface Chunk {
  documentId: string;
  title: string;
  /** Überschrift des Abschnitts, in dem der Text steht. */
  heading: string;
  text: string;
}

/**
 * Teilt ein Markdown-Dokument an seinen Überschriften in Abschnitte. Zu lange
 * Abschnitte werden an Absätzen weiter zerlegt, damit ein Treffer präzise bleibt
 * und nicht zu viel Text an das Modell geschickt wird.
 */
export function chunkDocument(document: Document, maxChars = 700): Chunk[] {
  const chunks: Chunk[] = [];
  let heading = document.title;
  let buffer: string[] = [];

  const flush = () => {
    const body = buffer.join("\n").trim();
    buffer = [];
    if (!body) return;

    let current = "";
    for (const paragraph of body.split(/\n{2,}/)) {
      if (current && current.length + paragraph.length > maxChars) {
        chunks.push({ documentId: document.id, title: document.title, heading, text: current });
        current = "";
      }
      current = current ? `${current}\n\n${paragraph}` : paragraph;
    }
    if (current) {
      chunks.push({ documentId: document.id, title: document.title, heading, text: current });
    }
  };

  for (const line of document.text.split("\n")) {
    const match = /^#{1,3}\s+(.*)$/.exec(line);
    if (match) {
      flush();
      heading = match[1].trim();
    } else {
      buffer.push(line);
    }
  }
  flush();

  return chunks;
}
