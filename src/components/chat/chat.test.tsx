import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { ChatStreamEvent } from "@/lib/chat/protocol";
import { streamFromEvents } from "@/test/streams";

import { Chat } from "./chat";

const signOut = vi.hoisted(() => vi.fn());
vi.mock("next-auth/react", () => ({ signOut }));

const alice = { login: "alice", name: "Alice" };

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
    render(<Chat user={alice} />);

    await sendMessage("Wer bist du?");

    expect(await screen.findByText("Welt")).toBeInTheDocument();
    expect(screen.getByText("Wer bist du?")).toBeInTheDocument();
    expect(screen.getByLabelText("Nachricht")).toHaveValue("");

    const init = fetchMock.mock.calls[0]?.[1];
    expect(JSON.parse(String(init?.body))).toEqual({
      messages: [{ role: "user", content: "Wer bist du?" }],
    });
  });

  it("zeigt Quellen unter der Antwort an, mit Link wenn vorhanden", async () => {
    mockFetchWithEvents([
      {
        type: "sources",
        sources: [
          { title: "Fonts", path: "a/fonts", url: "https://example.com/fonts" },
          { title: "Ohne Link", path: "a/x" },
        ],
      },
      { type: "text", delta: "Antwort [1]" },
      { type: "done", stopReason: "complete" },
    ]);
    render(<Chat user={alice} />);

    await sendMessage("Frage");

    const link = await screen.findByRole("link", { name: "Fonts" });
    expect(link).toHaveAttribute("href", "https://example.com/fonts");
    expect(link).toHaveAttribute("rel", expect.stringContaining("noopener"));
    expect(screen.getByText("Ohne Link")).toBeInTheDocument();
  });

  it("sends the whole conversation on follow-up messages", async () => {
    const fetchMock = mockFetchWithEvents([
      { type: "text", delta: "Antwort" },
      { type: "done", stopReason: "complete" },
    ]);
    render(<Chat user={alice} />);

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
    render(<Chat user={alice} />);

    await sendMessage("Hallo");

    expect(await screen.findByRole("alert")).toHaveTextContent("nicht erreichbar");
    expect(screen.getByText("Hallo")).toBeInTheDocument();
  });

  it("shows an error for a rejected request", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json({ error: { code: "rate_limited" } }, { status: 429 })),
    );
    render(<Chat user={alice} />);

    await sendMessage("Hallo");

    expect(await screen.findByRole("alert")).toHaveTextContent("Zu viele Anfragen");
  });

  it("tells the user when the reply was cut off", async () => {
    mockFetchWithEvents([
      { type: "text", delta: "Lange Antwort" },
      { type: "done", stopReason: "max_tokens" },
    ]);
    render(<Chat user={alice} />);

    await sendMessage("Schreib viel");

    expect(await screen.findByText(/abgeschnitten/)).toBeInTheDocument();
  });

  it("restores the saved conversation and clears it with 'Neuer Chat'", async () => {
    mockFetchWithEvents([
      { type: "text", delta: "Gespeicherte Antwort" },
      { type: "done", stopReason: "complete" },
    ]);
    const first = render(<Chat user={alice} />);
    await sendMessage("Merk dir das");
    await screen.findByText("Gespeicherte Antwort");
    first.unmount();

    render(<Chat user={alice} />);
    expect(screen.getByText("Merk dir das")).toBeInTheDocument();
    expect(screen.getByText("Gespeicherte Antwort")).toBeInTheDocument();

    await userEvent.setup().click(screen.getByRole("button", { name: "Neuer Chat" }));
    expect(screen.queryByText("Merk dir das")).not.toBeInTheDocument();
    expect(screen.getByText("Wie kann ich helfen?")).toBeInTheDocument();
  });

  it("keeps conversations of different users separate", async () => {
    mockFetchWithEvents([
      { type: "text", delta: "Nur für Alice" },
      { type: "done", stopReason: "complete" },
    ]);
    const first = render(<Chat user={alice} />);
    await sendMessage("Geheim");
    await screen.findByText("Nur für Alice");
    first.unmount();

    render(<Chat user={{ login: "bob", name: "Bob" }} />);

    expect(screen.queryByText("Geheim")).not.toBeInTheDocument();
    expect(screen.getByText("Wie kann ich helfen?")).toBeInTheDocument();
  });

  it("signs the user out", async () => {
    render(<Chat user={alice} />);

    await userEvent.setup().click(screen.getByRole("button", { name: "Abmelden" }));

    expect(signOut).toHaveBeenCalledWith({ callbackUrl: "/login" });
  });

  it("does not send blank messages", async () => {
    const fetchMock = mockFetchWithEvents([]);
    render(<Chat user={alice} />);

    await userEvent.setup().type(screen.getByLabelText("Nachricht"), "   ");

    expect(screen.getByRole("button", { name: "Senden" })).toBeDisabled();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
