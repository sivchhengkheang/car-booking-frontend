/**
 * KID OAuth - Client-side auth helper
 * Uses @kid-oauth/sdk (KIDOAuthClient) for browser redirect flow with PKCE (S256).
 *
 * Rules:
 * 1. Client secret stays on server (KIDOAuthServer).
 * 2. Browser generates PKCE S256 via KIDOAuthClient; getLoginUrl stores
 *    verifier in sessionStorage, and extractCallback retrieves it.
 * 3. Key users by `sub` (opaque, stable). `kid` is a 9-digit display string.
 */

import { KIDOAuthClient } from '@kid-oauth/sdk';

/** Singleton KIDOAuthClient for browser */
export const kidClient = new KIDOAuthClient({
  clientId: process.env.NEXT_PUBLIC_KID_CLIENT_ID || 'pk_cc4a0155-da8a-47fa-a659-8facccfb5eb6',
  redirectUri: process.env.NEXT_PUBLIC_KID_REDIRECT_URI || 'http://localhost:3000/auth/kid/callback',
  baseUrl: process.env.NEXT_PUBLIC_KID_BASE_URL || 'https://api.kid.koompi.org',
});

/** Scopes enabled and requested */
export const KID_SCOPES = 'openid profile.basic profile.contact wallet.read';

/**
 * Builds the KID authorization URL with PKCE (S256) and redirects the browser.
 */
export async function redirectToKID() {
  const url = await kidClient.getLoginUrl({ scope: KID_SCOPES });
  window.location.assign(url);
}

/**
 * Session helpers
 */
export const session = {
  save(data) {
    const backendToken = data.accessToken || data.token || data.access_token;
    const backendRefresh = data.refreshToken || data.refresh_token;

    if (backendToken) {
      localStorage.setItem('token', backendToken);
    }
    if (backendRefresh) {
      localStorage.setItem('refreshToken', backendRefresh);
      sessionStorage.setItem('kid_refresh_token', backendRefresh);
    }
    if (data.kid_access_token) {
      sessionStorage.setItem('kid_access_token', data.kid_access_token);
    }
    if (data.user) {
      sessionStorage.setItem('kid_user', JSON.stringify(data.user));
      localStorage.setItem('user', JSON.stringify(data.user));
    }
  },

  updateTokens(tokens) {
    const backendToken = tokens.accessToken || tokens.token || tokens.access_token;
    const backendRefresh = tokens.refreshToken || tokens.refresh_token;

    if (backendToken) {
      localStorage.setItem('token', backendToken);
    }
    if (backendRefresh) {
      localStorage.setItem('refreshToken', backendRefresh);
      sessionStorage.setItem('kid_refresh_token', backendRefresh);
    }
    if (tokens.kid_access_token) {
      sessionStorage.setItem('kid_access_token', tokens.kid_access_token);
    }
  },

  getUser() {
    try {
      const raw = sessionStorage.getItem('kid_user') || localStorage.getItem('user');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  getAccessToken() {
    return localStorage.getItem('token') || sessionStorage.getItem('kid_access_token');
  },

  getRefreshToken() {
    return localStorage.getItem('refreshToken') || sessionStorage.getItem('kid_refresh_token');
  },

  isSignedIn() {
    return !!this.getAccessToken() && !!this.getUser();
  },

  clear() {
    sessionStorage.removeItem('kid_access_token');
    sessionStorage.removeItem('kid_refresh_token');
    sessionStorage.removeItem('kid_user');
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
  },
};
