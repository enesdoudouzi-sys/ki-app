import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { ChatStreamEvent } from "@/lib/chat/protocol";
import { streamFromEvents } from "@/test/streams";

import { Chat } from "./chat";

function mockFetchWithEvents(events: ChatStreamEvent[]) {
  const fetchMock = vi.fn<typeof fetch>(async () => {
    return new Response(streamFromEvents(events));
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

async function sendMessage(text: string) {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText("Nachricht"), text);
  await user.click(screen.getByRole("button", { name: "Senden" }));
}

describe("Chat", () => {
  it("sends the message and renders the streamed reply", async () => {
    const fetchMock = mockFetchWithEvents([
      { type: "text", delta: "Hallo, " },
      { type: "text", delta: "**Welt**!" },
      { type: "done", stopReason: "complete" },
    ]);
    render(<Chat />);

    await sendMessage("Wer bist du?");

    expect(await screen.findByText("Welt")).toBeInTheDocument();
    expect(screen.getByText("Wer bist du?")).toBeInTheDocument();
    expect(screen.getByLabelText("Nachricht")).toHaveValue("");

    const init = fetchMock.mock.calls[0]?.[1];
    expect(JSON.parse(String(init?.body))).toEqual({
      messages: [{ role: "user", content: "Wer bist du?" }],
    });
  });

  it("sends the whole conversation on follow-up messages", async () => {
    const fetchMock = mockFetchWithEvents([
      { type: "text", delta: "Antwort" },
      { type: "done", stopReason: "complete" },
    ]);
    render(<Chat />);

    await sendMessage("Erste Frage");
    await screen.findByText("Antwort");
    await sendMessage("Zweite Frage");
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));

    expect(JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body))).toEqual({
      messages: [
        { role: "user", content: "Erste Frage" },
        { role: "assistant", content: "Antwort" },
        { role: "user", content: "Zweite Frage" },
      ],
    });
  });

  it("shows an error and keeps the user's message when the stream reports a failure", async () => {
    mockFetchWithEvents([{ type: "error", code: "upstream_unavailable" }]);
    render(<Chat />);

    await sendMessage("Hallo");

    expect(await screen.findByRole("alert")).toHaveTextContent("nicht erreichbar");
    expect(screen.getByText("Hallo")).toBeInTheDocument();
  });

  it("shows an error for a rejected request", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json({ error: { code: "rate_limited" } }, { status: 429 })),
    );
    render(<Chat />);

    await sendMessage("Hallo");

    expect(await screen.findByRole("alert")).toHaveTextContent("Zu viele Anfragen");
  });

  it("tells the user when the reply was cut off", async () => {
    mockFetchWithEvents([
      { type: "text", delta: "Lange Antwort" },
      { type: "done", stopReason: "max_tokens" },
    ]);
    render(<Chat />);

    await sendMessage("Schreib viel");

    expect(await screen.findByText(/abgeschnitten/)).toBeInTheDocument();
  });

  it("restores the saved conversation and clears it with 'Neuer Chat'", async () => {
    mockFetchWithEvents([
      { type: "text", delta: "Gespeicherte Antwort" },
      { type: "done", stopReason: "complete" },
    ]);
    const first = render(<Chat />);
    await sendMessage("Merk dir das");
    await screen.findByText("Gespeicherte Antwort");
    first.unmount();

    render(<Chat />);
    expect(screen.getByText("Merk dir das")).toBeInTheDocument();
    expect(screen.getByText("Gespeicherte Antwort")).toBeInTheDocument();

    await userEvent.setup().click(screen.getByRole("button", { name: "Neuer Chat" }));
    expect(screen.queryByText("Merk dir das")).not.toBeInTheDocument();
    expect(screen.getByText("Wie kann ich helfen?")).toBeInTheDocument();
  });

  it("does not send blank messages", async () => {
    const fetchMock = mockFetchWithEvents([]);
    render(<Chat />);

    await userEvent.setup().type(screen.getByLabelText("Nachricht"), "   ");

    expect(screen.getByRole("button", { name: "Senden" })).toBeDisabled();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
