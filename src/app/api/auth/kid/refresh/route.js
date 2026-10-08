/**
 * KID OAuth — Refresh Token API Route
 * POST /api/auth/kid/refresh
 *
 * Rules:
 * 5. Access tokens last 15 mins; refresh tokens rotate. Every call to refreshToken()
 *    returns a NEW refresh_token — save the new one and drop the old one.
 * 6. The refresh response has no user or id_token; preserve claims from sign-in.
 * 15. Import from @kid-oauth/sdk/server.
 */

import { KIDOAuthServer, isKIDError } from '@kid-oauth/sdk/server';
import { NextResponse } from 'next/server';

const kidServer = new KIDOAuthServer({
  clientId: process.env.KID_CLIENT_ID,
  clientSecret: process.env.KID_CLIENT_SECRET,
  redirectUri: process.env.KID_REDIRECT_URI,
  baseUrl: process.env.KID_BASE_URL || 'https://api.kid.koompi.org',
});

export async function POST(request) {
  try {
    const { refresh_token } = await request.json();

    if (!refresh_token) {
      return NextResponse.json(
        { error: 'invalid_request', message: 'Missing refresh_token' },
        { status: 400 }
      );
    }

    // Refresh token with grant_type=refresh_token
    const tokens = await kidServer.refreshToken({ refreshToken: refresh_token });

    return NextResponse.json({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token, // Rotated! Must replace old refresh_token
      expires_in: tokens.expires_in,
      token_type: tokens.token_type,
      scope: tokens.scope,
    });
  } catch (err) {
    console.error('[KID refresh] token refresh failed:', err);
    const message = isKIDError(err) ? err.message : 'Token refresh failed';
    const status = err?.statusCode || (err?.code === 'token_expired' ? 401 : 500);

    return NextResponse.json(
      { error: err?.code || 'invalid_grant', message },
      { status }
    );
  }
}
