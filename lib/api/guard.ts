import { NextResponse } from "next/server";

export const MAX_BODY_BYTES = 32768;
const RATE_LIMIT_MAX = 20;
const RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000;

// Temporary in-process ceiling: resets on deploy, not shared across instances.
const buckets = new Map<string, { count: number; resetAt: number }>();

interface GuardOptions {
  request: Request;
  userId: string;
  module: string;
}

interface GuardedBody<T> {
  body: T;
}

export async function guardRequest<T = unknown>({
  request,
  userId,
  module,
}: GuardOptions): Promise<GuardedBody<T> | NextResponse> {
  const raw = await readBodyWithLimit(request);

  if (raw === null) {
    return NextResponse.json(
      { error: "payload_too_large", limit: MAX_BODY_BYTES },
      { status: 413 }
    );
  }

  let body: T;
  try {
    body = (raw.length === 0 ? {} : JSON.parse(raw)) as T;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const limited = checkRateLimit(`${userId}:${module}`);
  if (limited) {
    return NextResponse.json(
      { error: "rate_limited", retryAfter: limited.retryAfter },
      { status: 429, headers: { "Retry-After": String(limited.retryAfter) } }
    );
  }

  return { body };
}

/** Returns the decoded body, or null when the bytes actually read exceed the cap. */
async function readBodyWithLimit(request: Request): Promise<string | null> {
  const reader = request.body?.getReader();
  if (!reader) {
    return "";
  }

  const chunks: Uint8Array[] = [];
  let total = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;

    total += value.byteLength;
    if (total > MAX_BODY_BYTES) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }

  const merged = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return new TextDecoder().decode(merged);
}

function checkRateLimit(key: string): { retryAfter: number } | null {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return null;
  }

  if (bucket.count >= RATE_LIMIT_MAX) {
    return { retryAfter: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)) };
  }

  bucket.count += 1;
  return null;
}
