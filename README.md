# KI-Chat

Chat-Anwendung mit gestreamten KI-Antworten und GitHub-Login, gebaut mit Next.js (App Router),
TypeScript und wahlweise Google Gemini oder Anthropic Claude als Modell.

## Funktionen

- Anmeldung über GitHub; nur freigeschaltete Konten erhalten Zugang
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

Fülle `.env.local` aus (siehe unten) und starte die App:

```bash
npm run dev
```

Die App läuft dann unter <http://localhost:3000>.

### Login einrichten

1. Auf <https://github.com/settings/developers> eine **OAuth App** anlegen.
   - Homepage URL: `http://localhost:3000`
   - Authorization callback URL: `http://localhost:3000/api/auth/callback/github`
2. Client-ID und ein neu erzeugtes Client-Secret als `GITHUB_ID` und `GITHUB_SECRET` eintragen.
3. `NEXTAUTH_SECRET` mit `openssl rand -base64 32` erzeugen.
4. In `AUTH_ALLOWED_USERS` die GitHub-Benutzernamen eintragen, die chatten dürfen.

Für eine Bereitstellung im Internet dieselben Schritte mit der echten Adresse wiederholen
(`NEXTAUTH_URL` und die beiden URLs der OAuth App).

## Bereitstellung auf Render

Das Repo enthält einen Blueprint (`render.yaml`) für [Render](https://render.com).

1. Im Render-Dashboard **New → Blueprint** wählen, dieses Repo verbinden.
2. Die abgefragten Werte eintragen: `GEMINI_API_KEY`, `GITHUB_ID`, `GITHUB_SECRET`,
   `AUTH_ALLOWED_USERS`. `NEXTAUTH_SECRET` erzeugt Render selbst, die öffentliche Adresse
   übernimmt die App automatisch.
3. Nach dem ersten Deploy die Adresse der App (`https://….onrender.com`) in der GitHub OAuth App
   als Homepage URL und, mit `/api/auth/callback/github` am Ende, als Callback URL eintragen.

Im kostenlosen Tarif schläft die App nach etwa 15 Minuten ohne Zugriff ein; der nächste Aufruf
dauert dann rund eine Minute.

## Konfiguration

| Variable                     | Pflicht             | Standard              | Bedeutung                                                      |
| ---------------------------- | ------------------- | --------------------- | -------------------------------------------------------------- |
| `GEMINI_API_KEY`             | ja                  | –                     | API-Schlüssel für Gemini, bleibt auf dem Server                |
| `NEXTAUTH_SECRET`            | ja                  | –                     | Verschlüsselt die Sitzungs-Cookies                             |
| `NEXTAUTH_URL`               | ja                  | –                     | Öffentliche Adresse der App                                    |
| `GITHUB_ID`, `GITHUB_SECRET` | ja                  | –                     | Zugangsdaten der GitHub OAuth App                              |
| `AUTH_ALLOWED_USERS`         | ja                  | leer (niemand)        | Erlaubte GitHub-Benutzernamen, kommagetrennt; `*` erlaubt alle |
| `GEMINI_MODEL`               | nein                | `gemini-3.8-flash`    | Verwendetes Gemini-Modell                                      |
| `AI_PROVIDER`                | nein                | `gemini`              | `gemini` oder `anthropic`                                      |
| `ANTHROPIC_API_KEY`          | nur bei `anthropic` | –                     | API-Schlüssel für Anthropic                                    |
| `ANTHROPIC_MODEL`            | nein                | `claude-opus-5-5`     | Verwendetes Claude-Modell                                      |
| `CHAT_MAX_OUTPUT_TOKENS`     | nein                | `16000`               | Obergrenze für die Länge einer Antwort                         |
| `CHAT_RATE_LIMIT_PER_MINUTE` | nein                | `20`                  | Erlaubte Anfragen pro Minute und Benutzer                      |
| `RAG_ENABLED`                | nein                | `false`               | `true` schaltet die Wissenssuche mit Quellen ein               |
| `RAG_SOURCE_DIR`             | nein                | Next.js-Dokumentation | Ordner mit Markdown-Dateien für die Suche                      |
| `RAG_SOURCE_URL_BASE`        | nein                | nextjs.org/docs/app   | Basisadresse, unter der Quellen verlinkt werden                |

### Kostenlos mit Gemini

Den Schlüssel gibt es ohne Zahlungsdaten unter <https://aistudio.google.com/apikey>. Das kostenlose
Kontingent ist pro Tag begrenzt; ist es aufgebraucht, meldet der Chat „Zu viele Anfragen". Die
aktuellen Limits stehen in Google AI Studio. Im kostenlosen Tarif kann Google Eingaben zur
Verbesserung seiner Produkte verwenden – also keine vertraulichen Inhalte eingeben.

## Wissenssuche mit Quellen (RAG)

Optional kann der Chat Fragen anhand von Dokumenten beantworten und die Quellen anzeigen. Das
Verfahren heißt Retrieval-Augmented Generation (RAG): Zur Frage werden die passendsten Textstellen
gesucht, dem Modell mitgegeben, und die Antwort nennt sie als [1], [2] …

```bash
RAG_ENABLED=true
```

Standardmäßig wird die Dokumentation von Next.js durchsucht, die im Projekt unter
`node_modules/next/dist/docs/01-app` liegt. Mit `RAG_SOURCE_DIR` lässt sich ein anderer Ordner mit
Markdown-Dateien angeben, mit `RAG_SOURCE_URL_BASE` die Adresse, unter der die Quellen verlinkt werden.

**So funktioniert es** (`src/lib/rag/`):

1. **Zerlegen:** Jede Seite wird an Überschriften und Absätzen in kurze Abschnitte geteilt.
2. **Indexieren:** Ein BM25-Index zählt, welche Wörter in welchen Abschnitten vorkommen. Seltene Wörter
   zählen mehr, lange Abschnitte werden leicht abgewertet.
3. **Suchen:** Die letzte Nutzerfrage wird zerlegt und gegen den Index bewertet. Die besten vier
   Abschnitte gehen als nummerierte Quellen in die Systemanweisung.
4. **Anzeigen:** Der Server schickt die Quellen als erstes Ereignis, der Browser zeigt sie unter der Antwort.

**Sicherheit:** Die Quellen werden dem Modell ausdrücklich als reine Daten übergeben. Anweisungen,
die in einem Dokument stehen, soll es nicht befolgen.

**Wie gut ist die Suche?** Die Auswertung `src/lib/rag/eval-nextjs.test.ts` stellt 12 vorab festgelegte
Fragen an die echte Dokumentation (299 Seiten) und misst, ob die richtige Seite unter den ersten drei
Treffern steht. Ausgangswert: **83 % der Fragen, mittlere Platzierung (MRR) 0,59**. Mit
`npx vitest run src/lib/rag --reporter=verbose` siehst du die Ergebnisse je Frage.

**Grenzen:** Eine reine Stichwortsuche findet nur Seiten, die die Wörter der Frage enthalten. Bei
anderen Formulierungen scheitert sie (siehe die schwereren Fragen in `eval.test.ts`). Der nächste
Schritt sind Embeddings, die nach Bedeutung statt nach Wörtern suchen. Die Stichprobe ist klein; die
Zahlen zeigen die Richtung, sie sind kein belastbarer Benchmark.

## Architektur

```
Browser                          Next.js-Server                     Modell-API
───────                          ──────────────                     ─────────────
Login-Seite      ── GitHub ──▶  /api/auth  (Sitzungs-Cookie)

Chat-Oberfläche  ── POST ────▶  /api/chat
(useChat-Hook)                    1. Anmeldung prüfen
                                  2. Rate-Limit pro Benutzer
                                  3. Eingabe prüfen (zod)
                                  4. Modell aufrufen  ── Streaming ──▶  Modell
Text erscheint   ◀─ NDJSON ───    5. Antwort weiterreichen ◀─────────
```

| Pfad                        | Inhalt                                                                       |
| --------------------------- | ---------------------------------------------------------------------------- |
| `src/app/api/chat/`         | HTTP-Endpunkt: Anmeldung, Rate-Limit, Validierung, Streaming                 |
| `src/app/login/`            | Anmeldeseite                                                                 |
| `src/lib/server/`           | Nur serverseitig: Anmeldung, Konfiguration, Rate-Limiter                     |
| `src/lib/server/providers/` | Modellaufruf je Anbieter (Gemini, Anthropic)                                 |
| `src/lib/chat/`             | Von Client und Server geteilt: Schemas, Streaming-Protokoll, Texte, Speicher |
| `src/hooks/use-chat.ts`     | Zustand des Chats im Browser (Senden, Streamen, Stoppen, Fehler)             |
| `src/components/`           | Oberfläche: Nachrichtenliste, Eingabefeld, Anmelde-Button                    |
| `e2e/`                      | Browser-Tests mit Playwright                                                 |

Entscheidungen, die man kennen sollte:

- **Zugang nur nach Freigabe.** Jede Anfrage kostet API-Guthaben, deshalb ist ohne Eintrag in
  `AUTH_ALLOWED_USERS` niemand zugelassen. Die Liste wird bei jeder Anfrage geprüft: Wer entfernt
  wird, verliert den Zugang sofort, nicht erst mit Ablauf der Sitzung.
- **Sitzungen ohne Datenbank:** verschlüsseltes, nur für den Server lesbares Cookie (7 Tage gültig).
- **Geprüft wird am Endpunkt selbst** (`getCurrentUser` in `src/lib/server/auth.ts`), nicht nur an
  der Seite. Ein direkter Aufruf von `/api/chat` ohne Anmeldung erhält 401.
- **Modellanbieter austauschbar.** Gemini und Anthropic liegen hinter derselben Schnittstelle
  (`src/lib/server/providers/`); `AI_PROVIDER` wählt aus. Ein weiterer Anbieter ist eine neue Datei.
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

Die Tests rufen weder das Modell noch GitHub wirklich auf, sie brauchen also keine Zugangsdaten.
Einmalig vor dem ersten Browser-Test: `npx playwright install chromium`.

Bei jedem Push und Pull Request führt GitHub Actions alle Prüfungen aus (`.github/workflows/ci.yml`).

## Bekannte Grenzen

- **Kein Kostenlimit pro Benutzer.** Das Rate-Limit begrenzt die Anzahl der Anfragen, nicht die
  Ausgaben. Ein Ausgabenlimit lässt sich beim jeweiligen Anbieter setzen.
- **Der Rate-Limiter zählt im Arbeitsspeicher** einer Serverinstanz. Auf Serverless-Plattformen
  oder bei mehreren Instanzen braucht er einen gemeinsamen Speicher (z. B. Redis); die
  Schnittstelle in `src/lib/server/rate-limit.ts` ist dafür vorbereitet.
- **Der Verlauf liegt nur im Browser** (ein Gespräch pro Benutzer, kein Abgleich zwischen Geräten).
