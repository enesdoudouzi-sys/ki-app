# KI-Chat

Chat-Anwendung mit gestreamten KI-Antworten, gebaut mit Next.js (App Router), TypeScript und
dem Anthropic SDK.

## Funktionen

- Antworten erscheinen live, während das Modell schreibt, und lassen sich jederzeit stoppen
- Markdown-Darstellung (Code-Blöcke, Listen, Tabellen)
- Der Verlauf bleibt nach dem Neuladen erhalten (lokal im Browser gespeichert)
- Helles und dunkles Design, für Mobilgeräte optimiert

## Schnellstart

Voraussetzung: Node.js 22 oder neuer.

```bash
npm install
```

```bash
cp .env.example .env.local
```

Trage in `.env.local` deinen `ANTHROPIC_API_KEY` ein und starte die App:

```bash
npm run dev
```

Die App läuft dann unter <http://localhost:3000>.

## Konfiguration

| Variable                     | Pflicht | Standard          | Bedeutung                                |
| ---------------------------- | ------- | ----------------- | ---------------------------------------- |
| `ANTHROPIC_API_KEY`          | ja      | –                 | API-Schlüssel, bleibt auf dem Server     |
| `ANTHROPIC_MODEL`            | nein    | `claude-opus-5-5` | Verwendetes Modell                       |
| `CHAT_MAX_OUTPUT_TOKENS`     | nein    | `16000`           | Obergrenze für die Länge einer Antwort   |
| `CHAT_RATE_LIMIT_PER_MINUTE` | nein    | `20`              | Erlaubte Anfragen pro Minute und Adresse |

## Architektur

```
Browser                          Next.js-Server                    Anthropic API
───────                          ──────────────                    ─────────────
Chat-Oberfläche  ── POST ──▶  /api/chat
(useChat-Hook)                  1. Rate-Limit
                                2. Eingabe prüfen (zod)
                                3. Modell aufrufen  ── Streaming ──▶  Modell
Text erscheint   ◀─ NDJSON ──   4. Antwort weiterreichen ◀──────────
```

| Pfad                    | Inhalt                                                                       |
| ----------------------- | ---------------------------------------------------------------------------- |
| `src/app/api/chat/`     | HTTP-Endpunkt: Rate-Limit, Validierung, Streaming-Antwort                    |
| `src/lib/server/`       | Nur serverseitig: Modellaufruf, Konfiguration, Rate-Limiter                  |
| `src/lib/chat/`         | Von Client und Server geteilt: Schemas, Streaming-Protokoll, Texte, Speicher |
| `src/hooks/use-chat.ts` | Zustand des Chats im Browser (Senden, Streamen, Stoppen, Fehler)             |
| `src/components/chat/`  | Oberfläche: Nachrichtenliste, Eingabefeld                                    |
| `e2e/`                  | Browser-Tests mit Playwright                                                 |

Entscheidungen, die man kennen sollte:

- **Der API-Schlüssel verlässt nie den Server.** Der Browser spricht nur mit `/api/chat`.
- **Streaming-Protokoll:** eine JSON-Zeile pro Ereignis (`text`, `done`, `error`). Das Schema in
  `src/lib/chat/protocol.ts` wird von beiden Seiten verwendet.
- **Fehler des KI-Dienstes** werden auf dem Server protokolliert; der Browser erhält nur einen
  Fehlercode, keine internen Details.
- **Zu lange Eingaben werden abgelehnt,** nicht stillschweigend gekürzt.

## Befehle

| Befehl             | Zweck                                              |
| ------------------ | -------------------------------------------------- |
| `npm run dev`      | Entwicklungsserver                                 |
| `npm run check`    | Lint, Typprüfung, Formatierung und Unit-Tests      |
| `npm test`         | Unit- und Komponententests (Vitest)                |
| `npm run test:e2e` | Browser-Tests (Playwright); vorher `npm run build` |
| `npm run format`   | Code formatieren (Prettier)                        |
| `npm run build`    | Produktions-Build                                  |

Die Tests rufen das Modell nie wirklich auf, sie brauchen also keinen API-Schlüssel. Einmalig
vor dem ersten Browser-Test: `npx playwright install chromium`.

Bei jedem Push und Pull Request führt GitHub Actions alle Prüfungen aus (`.github/workflows/ci.yml`).

## Bekannte Grenzen

- **Kein Login.** Jeder, der die URL kennt, kann chatten und verbraucht damit dein API-Guthaben.
  Vor einer öffentlichen Bereitstellung gehört eine Anmeldung davor.
- **Der Rate-Limiter zählt im Arbeitsspeicher** einer Serverinstanz. Auf Serverless-Plattformen
  oder bei mehreren Instanzen braucht er einen gemeinsamen Speicher (z. B. Redis); die
  Schnittstelle in `src/lib/server/rate-limit.ts` ist dafür vorbereitet.
- **Der Verlauf liegt nur im Browser** (ein Gespräch, kein Abgleich zwischen Geräten).
