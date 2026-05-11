import { randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { isDebugEnabled } from '@/lib/debug/env';
import { getEntries, clearEntries, addEntry } from '@/lib/debug/log-store';
import type { LogLevel, LogCategory, LogEntry } from '@/types/debug';

/** Valid values for each discriminated field. */
const VALID_LEVELS = new Set<string>(['debug', 'info', 'warn', 'error']);
const VALID_CATEGORIES = new Set<string>(['general', 'request', 'response', 'exception']);

/** Payload accepted from a browser client. */
interface ClientLogPayload {
  level: LogLevel;
  message: string;
  category?: LogCategory;
  metadata?: Record<string, unknown>;
  requestId?: string;
}

/** Maximum character length for the message field. */
const MAX_MESSAGE_LENGTH = 2_000;
/** Maximum number of top-level keys allowed in metadata. */
const MAX_METADATA_KEYS = 50;

function forbidden(): NextResponse {
  return NextResponse.json({ error: 'Not available in this environment.' }, { status: 403 });
}

function badRequest(detail: string): NextResponse {
  return NextResponse.json({ error: detail }, { status: 400 });
}

/**
 * Validates the raw body from a client POST request.
 * Returns a typed payload or an error string.
 */
function parsePayload(body: unknown): ClientLogPayload | string {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return 'Request body must be a JSON object.';
  }

  const raw = body as Record<string, unknown>;

  if (!VALID_LEVELS.has(raw.level as string)) {
    return `"level" must be one of: ${[...VALID_LEVELS].join(', ')}.`;
  }

  if (typeof raw.message !== 'string' || raw.message.trim() === '') {
    return '"message" must be a non-empty string.';
  }

  if (raw.message.length > MAX_MESSAGE_LENGTH) {
    return `"message" must not exceed ${MAX_MESSAGE_LENGTH} characters.`;
  }

  if (raw.category !== undefined && !VALID_CATEGORIES.has(raw.category as string)) {
    return `"category" must be one of: ${[...VALID_CATEGORIES].join(', ')}.`;
  }

  if (raw.metadata !== undefined) {
    if (typeof raw.metadata !== 'object' || Array.isArray(raw.metadata) || raw.metadata === null) {
      return '"metadata" must be a plain object.';
    }
    if (Object.keys(raw.metadata).length > MAX_METADATA_KEYS) {
      return `"metadata" must not exceed ${MAX_METADATA_KEYS} top-level keys.`;
    }
  }

  if (raw.requestId !== undefined && typeof raw.requestId !== 'string') {
    return '"requestId" must be a string.';
  }

  return {
    level: raw.level as LogLevel,
    message: raw.message as string,
    ...(raw.category !== undefined ? { category: raw.category as LogCategory } : {}),
    ...(raw.metadata !== undefined
      ? { metadata: raw.metadata as Record<string, unknown> }
      : {}),
    ...(raw.requestId !== undefined ? { requestId: raw.requestId as string } : {}),
  };
}

/** GET /api/debug/logs — Returns all stored log entries. */
export async function GET(): Promise<NextResponse> {
  if (!isDebugEnabled()) return forbidden();
  return NextResponse.json(getEntries());
}

/**
 * POST /api/debug/logs — Accepts a log entry from client-side code and stores it.
 * The `source` field is always forced to `'client'` regardless of what the
 * caller sends; `id` and `timestamp` are generated server-side to prevent
 * client manipulation.
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  if (!isDebugEnabled()) return forbidden();

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return badRequest('Request body must be valid JSON.');
  }

  const payloadOrError = parsePayload(body);
  if (typeof payloadOrError === 'string') {
    return badRequest(payloadOrError);
  }

  const { level, message, category = 'general', metadata, requestId } = payloadOrError;

  const entry: LogEntry = {
    id: randomUUID(),
    timestamp: new Date().toISOString(),
    level,
    source: 'client',
    category,
    message,
    ...(metadata !== undefined ? { metadata } : {}),
    ...(requestId !== undefined ? { requestId } : {}),
  };

  addEntry(entry);
  return NextResponse.json(entry, { status: 201 });
}

/** DELETE /api/debug/logs — Clears all stored log entries. */
export async function DELETE(): Promise<NextResponse> {
  if (!isDebugEnabled()) return forbidden();
  clearEntries();
  return NextResponse.json({ cleared: true });
}
