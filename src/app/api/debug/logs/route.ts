import { NextResponse } from 'next/server';
import { isDebugEnabled } from '@/lib/debug/env';
import { getEntries, clearEntries } from '@/lib/debug/log-store';

function forbidden(): NextResponse {
  return NextResponse.json({ error: 'Not available in this environment.' }, { status: 403 });
}

/** GET /api/debug/logs — Returns all stored log entries. */
export async function GET(): Promise<NextResponse> {
  if (!isDebugEnabled()) return forbidden();
  return NextResponse.json(getEntries());
}

/** DELETE /api/debug/logs — Clears all stored log entries. */
export async function DELETE(): Promise<NextResponse> {
  if (!isDebugEnabled()) return forbidden();
  clearEntries();
  return NextResponse.json({ cleared: true });
}
