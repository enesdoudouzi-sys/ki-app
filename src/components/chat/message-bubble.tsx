import { memo } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

import type { StoredMessage } from "@/lib/chat/storage";

interface Props {
  message: StoredMessage;
  isStreaming: boolean;
}

function MessageBubbleComponent({ message, isStreaming }: Props) {
  if (message.role === "user") {
    return (
      <li className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-br-md bg-accent px-4 py-2.5 whitespace-pre-wrap text-accent-foreground">
          <span className="sr-only">Du: </span>
          {message.content}
        </div>
      </li>
    );
  }

  return (
    <li className="flex justify-start">
      <div className="max-w-full min-w-0 sm:max-w-[90%]">
        <span className="sr-only">Assistent: </span>
        {message.content === "" && isStreaming ? (
          <p className="animate-pulse text-muted" role="status">
            Denkt nach …
          </p>
        ) : (
          <div className="markdown">
            <Markdown remarkPlugins={[remarkGfm]}>{message.content}</Markdown>
          </div>
        )}
        {message.sources?.length ? (
          <section aria-label="Quellen" className="mt-3 text-sm">
            <h3 className="font-medium text-muted">Quellen</h3>
            <ol className="mt-1 list-decimal space-y-0.5 pl-5">
              {message.sources.map((source, index) => (
                <li key={`${source.path}-${index}`}>
                  {source.url ? (
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-accent underline"
                    >
                      {source.title}
                    </a>
                  ) : (
                    source.title
                  )}
                </li>
              ))}
            </ol>
          </section>
        ) : null}
        {message.notice ? <p className="mt-2 text-sm text-muted">{message.notice}</p> : null}
      </div>
    </li>
  );
}

export const MessageBubble = memo(MessageBubbleComponent);
