import { encodeEvent, STREAM_CONTENT_TYPE, type ErrorCode } from "@/lib/chat/protocol";
import { chatRequestSchema } from "@/lib/chat/schema";
import { streamChat } from "@/lib/server/anthropic";
import { getCurrentUser } from "@/lib/server/auth";
import { getServerConfig } from "@/lib/server/config";
import { createRateLimiter, type RateLimiter } from "@/lib/server/rate-limit";

let limiter: RateLimiter | undefined;

function errorResponse(status: number, code: ErrorCode, headers?: HeadersInit): Response {
  return Response.json({ error: { code } }, { status, headers });
}

export async function POST(request: Request): Promise<Response> {
  const user = await getCurrentUser();
  if (!user) return errorResponse(401, "unauthorized");

  const config = getServerConfig();

  limiter ??= createRateLimiter({ limit: config.rateLimitPerMinute, windowMs: 60_000 });
  const rate = limiter.check(user.login);
  if (!rate.allowed) {
    return errorResponse(429, "rate_limited", { "Retry-After": String(rate.retryAfterSeconds) });
  }

  const body: unknown = await request.json().catch(() => undefined);
  const parsed = chatRequestSchema.safeParse(body);
  if (!parsed.success) return errorResponse(400, "bad_request");

  if (!config.hasCredentials) return errorResponse(503, "not_configured");

  // Aborts the upstream request when the browser disconnects or presses stop.
  const abort = new AbortController();
  request.signal.addEventListener("abort", () => abort.abort(), { once: true });

  const encoder = new TextEncoder();
  const events = streamChat(parsed.data.messages, abort.signal);

  const stream = new ReadableStream<Uint8Array>({
    async pull(controller) {
      const { done, value } = await events.next();
      if (done) {
        controller.close();
        return;
      }
      controller.enqueue(encoder.encode(encodeEvent(value)));
    },
    cancel() {
      abort.abort();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": STREAM_CONTENT_TYPE,
      "Cache-Control": "no-store",
      "X-Accel-Buffering": "no",
    },
  });
}
