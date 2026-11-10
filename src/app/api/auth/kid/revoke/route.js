/**
 * KID OAuth — Revoke / Sign-Out API Route
 * POST /api/auth/kid/revoke
 *
 * Receives: { refresh_token }
 * Calls:    POST https://api.kid.koompi.org/oauth/revoke  (server-side only)
 *
 * Per KID docs (RFC 7009): always returns 200 OK even if the token is invalid.
 * The client should clear its local session regardless of the response.
 */

import { NextResponse } from 'next/server';
import { getKidServer } from '@/lib/kid-server';

export async function POST(request) {
  const kidServer = getKidServer();
  try {
    const body = await request.json();
    const { refresh_token } = body;

    if (refresh_token) {
      await kidServer.revokeToken({ token: refresh_token });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    // Still return 200 — the client clears its session either way (RFC 7009).
    console.error('[KID revoke] failed (non-fatal):', err?.message);
    return NextResponse.json({ success: true });
  }
}
