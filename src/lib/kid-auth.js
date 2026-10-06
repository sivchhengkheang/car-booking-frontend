/**
 * KID OAuth - Client-side auth helper
 * Uses @kid-oauth/sdk (KIDAuth) for frontend redirect flow.
 *
 * Base URL: https://api.kid.koompi.org
 * Scopes: openid profile.basic profile.contact wallet.read
 *
 * Key points from KID docs:
 * - KID handles PKCE (S256) automatically — do NOT generate your own.
 * - Pass `state` from callback query string straight into the token request
 *   so KID can look up the server-side PKCE record.
 * - Token response includes `user` object directly — no separate /userinfo needed.
 * - `sub` is the stable foreign-key identifier, not email/username.
 * - `kid` in the user object (e.g. "KID-000001") is the human identity number,
 *   unrelated to the JWT `kid` header.
 */

import { KIDAuth } from '@kid-oauth/sdk';

/** Singleton KIDAuth instance (client-side) */
export const kidAuth = new KIDAuth({
  clientId: process.env.NEXT_PUBLIC_KID_CLIENT_ID,
  redirectUri: process.env.NEXT_PUBLIC_KID_REDIRECT_URI,
});

/** Scopes requested from KID */
export const KID_SCOPES = 'openid profile.basic profile.contact wallet.read';

/**
 * Builds the KID authorization URL and redirects the browser.
 * KID handles response_type, PKCE (S256), and CSRF state automatically.
 */
export async function redirectToKID() {
  const url = await kidAuth.createLoginUrl({ scope: KID_SCOPES });
  window.location.href = url;
}

/**
 * Session helpers — thin wrappers over sessionStorage so that
 * components have a single, consistent way to read/write auth state.
 */
export const session = {
  /**
   * Persist tokens and user data returned by the server callback.
   * @param {{ access_token, refresh_token, user }} data
   */
  save(data) {
    sessionStorage.setItem('kid_access_token', data.access_token);
    if (data.refresh_token) {
      sessionStorage.setItem('kid_refresh_token', data.refresh_token);
    }
    sessionStorage.setItem('kid_user', JSON.stringify(data.user));
  },

  /** Returns the currently stored KID user object, or null. */
  getUser() {
    try {
      const raw = sessionStorage.getItem('kid_user');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  /** Returns the stored access token string, or null. */
  getAccessToken() {
    return sessionStorage.getItem('kid_access_token');
  },

  /** Returns the stored refresh token string, or null. */
  getRefreshToken() {
    return sessionStorage.getItem('kid_refresh_token');
  },

  /** Returns true if a user is currently signed in. */
  isSignedIn() {
    return !!this.getAccessToken() && !!this.getUser();
  },

  /** Clears all KID session data. */
  clear() {
    sessionStorage.removeItem('kid_access_token');
    sessionStorage.removeItem('kid_refresh_token');
    sessionStorage.removeItem('kid_user');
  },
};
