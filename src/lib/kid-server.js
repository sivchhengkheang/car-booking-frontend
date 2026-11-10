import { KIDOAuthServer } from '@kid-oauth/sdk/server';

let kidServerInstance = null;

export function getKidServer() {
  if (!kidServerInstance) {
    kidServerInstance = new KIDOAuthServer({
      clientId: process.env.KID_CLIENT_ID || 'pk_cc4a0155-da8a-47fa-a659-8facccfb5eb6',
      clientSecret: process.env.KID_CLIENT_SECRET || 'sk_6ce0550e-1ec8-4426-a12f-760d9223cd10',
      redirectUri: process.env.KID_REDIRECT_URI || 'http://localhost:3000/auth/kid/callback',
      baseUrl: process.env.KID_BASE_URL || 'https://api.kid.koompi.org',
    });
  }
  return kidServerInstance;
}
