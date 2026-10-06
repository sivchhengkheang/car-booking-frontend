/**
 * KID OAuth — Token Exchange API Route
 * POST /api/auth/kid/callback
 *
 * Receives: { code, state }  (from the browser callback page)
 * Calls:    POST https://api.kid.koompi.org/oauth/token  (server-side only)
 * Returns:  { access_token, refresh_token, expires_in, user }
 *
 * Uses KIDAuthServer from '@kid-oauth/sdk/server' so that client_secret
 * never reaches the browser.
 *
 * Key KID docs notes:
 * - `state` MUST be forwarded exactly as received from the callback URL;
 *   KID uses it to look up the server-side PKCE record.
 * - Token response includes `user` directly — no separate /userinfo call needed.
 * - Every token exchange also returns `refresh_token`; store the latest one
 *   because each rotation immediately invalidates the previous.
 */

import { KIDOAuthServer } from '@kid-oauth/sdk/server';
import { NextResponse } from 'next/server';

const kidServer = new KIDOAuthServer({
  clientId: process.env.KID_CLIENT_ID,
  clientSecret: process.env.KID_CLIENT_SECRET,
  redirectUri: process.env.KID_REDIRECT_URI,
});

export async function POST(request) {
  try {
    const body = await request.json();
    const { code, state } = body;

    if (!code) {
      return NextResponse.json(
        { error: 'missing_code', message: 'Authorization code is required' },
        { status: 400 }
      );
    }

    // Exchange the authorization code for tokens + user data.
    // `state` is forwarded so KID can validate the server-side PKCE record.
    const tokens = await kidServer.exchangeCode({ code, state });

    // `tokens.user` is populated by KID when openid / profile scopes are granted.
    // Use `tokens.user.sub` as the stable foreign key — never email or username.
    return NextResponse.json({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_in: tokens.expires_in,
      scope: tokens.scope,
      user: tokens.user,
    });
  } catch (err) {
    console.error('[KID callback] token exchange failed:', err);

    const status = err?.status ?? 500;
    return NextResponse.json(
      {
        error: err?.error ?? 'token_exchange_failed',
        message: err?.message ?? 'Failed to exchange authorization code',
      },
      { status }
    );
  }
}
