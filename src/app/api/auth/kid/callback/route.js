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

import { isKIDError } from '@kid-oauth/sdk/server';
import { NextResponse } from 'next/server';
import { getKidServer } from '@/lib/kid-server';

export async function POST(request) {
  try {
    const body = await request.json();
    const { code, codeVerifier, redirectUri: clientRedirectUri } = body;

    if (!code || !codeVerifier) {
      return NextResponse.json(
        { error: 'invalid_request', message: 'Missing authorization code or code_verifier' },
        { status: 400 }
      );
    }

    // Determine the redirect URI matching where the request originated
    let redirectUri = clientRedirectUri;
    if (!redirectUri) {
      const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
      const proto = request.headers.get("x-forwarded-proto") || "https";
      if (host) {
        redirectUri = `${proto}://${host}/auth/kid/callback`;
      } else {
        redirectUri =
          process.env.KID_REDIRECT_URI ||
          process.env.NEXT_PUBLIC_KID_REDIRECT_URI ||
          'https://car-rental-service-eta.vercel.app/auth/kid/callback';
      }
    }

    const kidServer = getKidServer(redirectUri);

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

    // Fetch full OIDC UserInfo if access_token is present to guarantee all claims (Telegram, Gmail, etc.)
    let fullUserInfo = null;
    if (tokens.access_token) {
      try {
        fullUserInfo = await kidServer.getUserInfo(tokens.access_token);
      } catch (uiErr) {
        console.warn("[KID callback] getUserInfo warning:", uiErr.message);
      }
    }

    const kidProfile = { ...(tokens.user || {}), ...(fullUserInfo || {}) };

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
          sub: kidProfile.sub,
          kid: kidProfile.kid,
          name: kidProfile.name || (kidProfile.given_name ? `${kidProfile.given_name} ${kidProfile.family_name || ""}`.trim() : ""),
          email: kidProfile.email,
          emailVerified: kidProfile.email_verified ?? Boolean(kidProfile.email),
          phoneNumber: kidProfile.phone || kidProfile.phone_number || kidProfile.phoneNumber,
          phoneVerified: Boolean(kidProfile.phone_number_verified),
          walletAddress: kidProfile.wallet_address || kidProfile.wallet?.address,
          telegramUsername: kidProfile.telegram_username,
          telegramId: kidProfile.telegram_id ? String(kidProfile.telegram_id) : "",
          picture: kidProfile.picture,
          preferredUsername: kidProfile.preferred_username,
          merged_from: kidProfile.merged_from,
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
    const mergedUser = {
      ...(kidProfile || {}),
      ...(backendAuth?.user || {}),
    };

    return NextResponse.json({
      access_token: backendAuth?.accessToken || backendAuth?.token || tokens.access_token,
      token: backendAuth?.accessToken || backendAuth?.token || tokens.access_token,
      refresh_token: backendAuth?.refreshToken || tokens.refresh_token,
      kid_access_token: tokens.access_token,
      kid_refresh_token: tokens.refresh_token,
      expires_in: tokens.expires_in,
      scope: tokens.scope,
      user: mergedUser, // Includes MongoDB _id, sub, kid, role, walletAddress, telegramUsername, picture, etc.
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
