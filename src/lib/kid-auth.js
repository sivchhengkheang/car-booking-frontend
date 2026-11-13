/**
 * KID OAuth - Client-side auth helper
 * Uses @kid-oauth/sdk (KIDOAuthClient) for browser redirect flow with PKCE (S256).
 */

import { KIDOAuthClient } from '@kid-oauth/sdk';

/**
 * Dynamically resolves the redirect URI based on current browser origin.
 * Automatically switches between http://localhost:3000/auth/kid/callback
 * and https://car-rental-service-eta.vercel.app/auth/kid/callback
 */
export function getKidRedirectUri() {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return `${window.location.origin}/auth/kid/callback`;
  }
  return process.env.NEXT_PUBLIC_KID_REDIRECT_URI || 'http://localhost:3000/auth/kid/callback';
}

/** Factory for KIDOAuthClient with dynamic origin-aware redirectUri */
export function getKidClient() {
  return new KIDOAuthClient({
    clientId: process.env.NEXT_PUBLIC_KID_CLIENT_ID || 'pk_cc4a0155-da8a-47fa-a659-8facccfb5eb6',
    redirectUri: getKidRedirectUri(),
    baseUrl: process.env.NEXT_PUBLIC_KID_BASE_URL || 'https://api.kid.koompi.org',
  });
}

/** Singleton KIDOAuthClient for browser */
export const kidClient = getKidClient();

/** Scopes enabled and requested */
export const KID_SCOPES = 'openid profile.basic profile.contact wallet.read';

/**
 * Builds the KID authorization URL with PKCE (S256) and redirects the browser.
 */
export async function redirectToKID() {
  const client = getKidClient();
  const url = await client.getLoginUrl({ scope: KID_SCOPES });
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
      localStorage.setItem('user', JSON.stringify(data.user));
    }
  },

  getUser() {
    try {
      const raw = localStorage.getItem('user') || sessionStorage.getItem('kid_user');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  getToken() {
    return localStorage.getItem('token') || sessionStorage.getItem('kid_access_token');
  },

  getRefreshToken() {
    return localStorage.getItem('refreshToken') || sessionStorage.getItem('kid_refresh_token');
  },

  isAuthenticated() {
    return !!this.getToken() || !!this.getUser();
  },

  clear() {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    sessionStorage.removeItem('kid_access_token');
    sessionStorage.removeItem('kid_refresh_token');
    sessionStorage.removeItem('kid_user');
  },
};
