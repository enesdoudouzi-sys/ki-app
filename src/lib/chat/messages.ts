import type { ErrorCode, StopReason } from "./protocol";

export const ERROR_MESSAGES: Record<ErrorCode, string> = {
  bad_request:
    "Die Anfrage war ungültig. Bitte kürze deine Nachricht oder starte einen neuen Chat.",
  unauthorized: "Deine Sitzung ist abgelaufen. Bitte lade die Seite neu und melde dich erneut an.",
  rate_limited: "Zu viele Anfragen. Bitte warte einen Moment und versuche es erneut.",
  not_configured: "Der Server ist nicht konfiguriert: Es fehlt ein gültiger API-Schlüssel.",
  upstream_unavailable:
    "Der KI-Dienst ist gerade nicht erreichbar. Bitte versuche es gleich noch einmal.",
  internal: "Es ist ein unerwarteter Fehler aufgetreten. Bitte versuche es erneut.",
};

export const STOP_NOTICES: Partial<Record<StopReason, string>> = {
  max_tokens: "Die Antwort wurde wegen der Längenbegrenzung abgeschnitten.",
  refusal: "Die Anfrage wurde vom Modell abgelehnt.",
};
