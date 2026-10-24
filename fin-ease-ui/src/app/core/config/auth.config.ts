export interface OidcConfig {
  keycloakUrl: string;
  realm: string;
  clientId: string;
  scope: string;
  responseType: string;
  redirectUri: string;
  postLogoutRedirectUri: string;
  issuer: string;
  authorizationEndpoint: string;
  tokenEndpoint: string;
  userinfoEndpoint: string;
  logoutEndpoint: string;
  jwksUri: string;
  gatewayUrl: string;
}

export const AUTH_CONFIG: OidcConfig = {
  keycloakUrl: 'http://localhost:7080',
  realm: 'eazybank',
  clientId: 'finease-ui',
  scope: 'openid profile email roles',
  responseType: 'code',
  redirectUri: typeof window !== 'undefined' ? `${window.location.origin}/dashboard` : 'http://localhost:4200/dashboard',
  postLogoutRedirectUri: typeof window !== 'undefined' ? `${window.location.origin}/login` : 'http://localhost:4200/login',
  issuer: 'http://localhost:7080/realms/eazybank',
  authorizationEndpoint: 'http://localhost:7080/realms/eazybank/protocol/openid-connect/auth',
  tokenEndpoint: 'http://localhost:7080/realms/eazybank/protocol/openid-connect/token',
  userinfoEndpoint: 'http://localhost:7080/realms/eazybank/protocol/openid-connect/userinfo',
  logoutEndpoint: 'http://localhost:7080/realms/eazybank/protocol/openid-connect/logout',
  jwksUri: 'http://localhost:7080/realms/eazybank/protocol/openid-connect/certs',
  gatewayUrl: 'http://localhost:8072'
};

/**
 * Standard PKCE (Proof Key for Code Exchange - RFC 7636) Utility functions
 * using native browser Web Crypto API (SubtleCrypto)
 */
export async function generatePkceChallenge(codeVerifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(codeVerifier);
  const digest = await window.crypto.subtle.digest('SHA-256', data);
  return base64UrlEncode(new Uint8Array(digest));
}

export function generateCodeVerifier(length: number = 64): string {
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  const randomValues = new Uint8Array(length);
  window.crypto.getRandomValues(randomValues);
  return Array.from(randomValues)
    .map(val => possible[val % possible.length])
    .join('');
}

function base64UrlEncode(array: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < array.byteLength; i++) {
    binary += String.fromCharCode(array[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}
