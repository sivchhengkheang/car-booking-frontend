import { KIDOAuthServer } from '@kid-oauth/sdk/server';

export function getKidServer(customRedirectUri) {
  const redirectUri =
    customRedirectUri ||
    process.env.KID_REDIRECT_URI ||
    process.env.NEXT_PUBLIC_KID_REDIRECT_URI ||
    'https://car-rental-service-eta.vercel.app/auth/kid/callback';

  return new KIDOAuthServer({
    clientId: process.env.KID_CLIENT_ID || process.env.NEXT_PUBLIC_KID_CLIENT_ID || 'pk_cc4a0155-da8a-47fa-a659-8facccfb5eb6',
    clientSecret: process.env.KID_CLIENT_SECRET || 'sk_6ce0550e-1ec8-4426-a12f-760d9223cd10',
    redirectUri,
    baseUrl: process.env.KID_BASE_URL || 'https://api.kid.koompi.org',
  });
}
