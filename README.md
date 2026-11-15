# KI-Chat

Chat-Anwendung mit gestreamten KI-Antworten und GitHub-Login, gebaut mit Next.js (App Router),
TypeScript und dem Anthropic SDK.

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

## Konfiguration

| Variable                     | Pflicht | Standard          | Bedeutung                                                      |
| ---------------------------- | ------- | ----------------- | -------------------------------------------------------------- |
| `ANTHROPIC_API_KEY`          | ja      | –                 | API-Schlüssel, bleibt auf dem Server                           |
| `NEXTAUTH_SECRET`            | ja      | –                 | Verschlüsselt die Sitzungs-Cookies                             |
| `NEXTAUTH_URL`               | ja      | –                 | Öffentliche Adresse der App                                    |
| `GITHUB_ID`, `GITHUB_SECRET` | ja      | –                 | Zugangsdaten der GitHub OAuth App                              |
| `AUTH_ALLOWED_USERS`         | ja      | leer (niemand)    | Erlaubte GitHub-Benutzernamen, kommagetrennt; `*` erlaubt alle |
| `ANTHROPIC_MODEL`            | nein    | `claude-opus-5-5` | Verwendetes Modell                                             |
| `CHAT_MAX_OUTPUT_TOKENS`     | nein    | `16000`           | Obergrenze für die Länge einer Antwort                         |
| `CHAT_RATE_LIMIT_PER_MINUTE` | nein    | `20`              | Erlaubte Anfragen pro Minute und Benutzer                      |

## Architektur

```
Browser                          Next.js-Server                     Anthropic API
───────                          ──────────────                     ─────────────
Login-Seite      ── GitHub ──▶  /api/auth  (Sitzungs-Cookie)

Chat-Oberfläche  ── POST ────▶  /api/chat
(useChat-Hook)                    1. Anmeldung prüfen
                                  2. Rate-Limit pro Benutzer
                                  3. Eingabe prüfen (zod)
                                  4. Modell aufrufen  ── Streaming ──▶  Modell
Text erscheint   ◀─ NDJSON ───    5. Antwort weiterreichen ◀─────────
```

| Pfad                    | Inhalt                                                                       |
| ----------------------- | ---------------------------------------------------------------------------- |
| `src/app/api/chat/`     | HTTP-Endpunkt: Anmeldung, Rate-Limit, Validierung, Streaming                 |
| `src/app/login/`        | Anmeldeseite                                                                 |
| `src/lib/server/`       | Nur serverseitig: Anmeldung, Modellaufruf, Konfiguration, Rate-Limiter       |
| `src/lib/chat/`         | Von Client und Server geteilt: Schemas, Streaming-Protokoll, Texte, Speicher |
| `src/hooks/use-chat.ts` | Zustand des Chats im Browser (Senden, Streamen, Stoppen, Fehler)             |
| `src/components/`       | Oberfläche: Nachrichtenliste, Eingabefeld, Anmelde-Button                    |
| `e2e/`                  | Browser-Tests mit Playwright                                                 |

Entscheidungen, die man kennen sollte:

- **Zugang nur nach Freigabe.** Jede Anfrage kostet API-Guthaben, deshalb ist ohne Eintrag in
  `AUTH_ALLOWED_USERS` niemand zugelassen. Die Liste wird bei jeder Anfrage geprüft: Wer entfernt
  wird, verliert den Zugang sofort, nicht erst mit Ablauf der Sitzung.
- **Sitzungen ohne Datenbank:** verschlüsseltes, nur für den Server lesbares Cookie (7 Tage gültig).
- **Geprüft wird am Endpunkt selbst** (`getCurrentUser` in `src/lib/server/auth.ts`), nicht nur an
  der Seite. Ein direkter Aufruf von `/api/chat` ohne Anmeldung erhält 401.
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
  Ausgaben. Ein Ausgabenlimit lässt sich in der Anthropic-Konsole setzen.
- **Der Rate-Limiter zählt im Arbeitsspeicher** einer Serverinstanz. Auf Serverless-Plattformen
  oder bei mehreren Instanzen braucht er einen gemeinsamen Speicher (z. B. Redis); die
  Schnittstelle in `src/lib/server/rate-limit.ts` ist dafür vorbereitet.
- **Der Verlauf liegt nur im Browser** (ein Gespräch pro Benutzer, kein Abgleich zwischen Geräten).
