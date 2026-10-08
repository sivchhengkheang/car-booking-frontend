/**
 * KID OAuth — Token Exchange API Route
 * POST /api/auth/kid/callback
 *
 * Rules:
 * 1. Client secret stays on the server (@kid-oauth/sdk/server).
 * 2. PKCE (S256): codeVerifier generated in browser is passed here to exchangeCode.
 * 3. Key users by `sub`.
 * 4. Handle merged accounts via tokens.user.merged_from.
 * 15. Import from @kid-oauth/sdk/server, never root.
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
    const body = await request.json();
    const { code, codeVerifier } = body;

    if (!code || !codeVerifier) {
      return NextResponse.json(
        { error: 'invalid_request', message: 'Missing authorization code or code_verifier' },
        { status: 400 }
      );
    }

    // Server-side code exchange with PKCE verifier
    const tokens = await kidServer.exchangeCode({ code, codeVerifier });

    // Handle merged accounts (Rule 4):
    // When accounts merge, survivor claims include merged_from: [{ sub, kid }]
    if (tokens.user?.merged_from?.length) {
      for (const closed of tokens.user.merged_from) {
        // In a database: update records where user_sub == closed.sub to tokens.user.sub
        console.log(`[KID] Merging records from closed sub: ${closed.sub} -> survivor sub: ${tokens.user.sub}`);
      }
    }

    // Synchronize KID user with Express backend & MongoDB
    let backendAuth = null;
    try {
      const backendBase =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      const syncRes = await fetch(`${backendBase}/api/v1/auth/kid-login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accessToken: tokens.access_token,
          sub: tokens.user?.sub,
          kid: tokens.user?.kid,
          name: tokens.user?.name,
          email: tokens.user?.email,
          phoneNumber: tokens.user?.phone || tokens.user?.phoneNumber,
          walletAddress: tokens.user?.wallet?.address,
          merged_from: tokens.user?.merged_from,
        }),
      });

      if (syncRes.ok) {
        backendAuth = await syncRes.json();
      } else {
        const errData = await syncRes.json().catch(() => ({}));
        console.warn(
          "[KID callback] Express backend sync warning:",
          syncRes.status,
          errData
        );
      }
    } catch (syncErr) {
      console.warn(
        "[KID callback] Could not connect to Express backend:",
        syncErr.message
      );
    }

    // Merge response: prioritize backend JWT & MongoDB user profile, while retaining KID tokens
    return NextResponse.json({
      access_token: backendAuth?.accessToken || backendAuth?.token || tokens.access_token,
      refresh_token: backendAuth?.refreshToken || tokens.refresh_token,
      kid_access_token: tokens.access_token,
      kid_refresh_token: tokens.refresh_token,
      expires_in: tokens.expires_in,
      scope: tokens.scope,
      user: backendAuth?.user || tokens.user, // Includes MongoDB _id, sub, kid, role, walletAddress
    });
  } catch (err) {
    console.error('[KID callback] token exchange failed:', err);
    const message = isKIDError(err) ? err.message : 'Failed to exchange authorization code';
    const status = err?.statusCode || (err?.code === 'token_expired' ? 400 : 500);

    return NextResponse.json(
      {
        error: err?.code || 'token_exchange_failed',
        message,
      },
      { status }
    );
  }
}
