import { Injectable, signal, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, of, throwError, from, firstValueFrom } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import {
  AUTH_CONFIG,
  generateCodeVerifier,
  generatePkceChallenge
} from '../config/auth.config';
import {
  AuthTokens,
  AuthUser,
  JwtClaims,
  UserRole
} from '../models/auth.models';
import { UserSession } from '../models/banking.models';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly router = inject(Router);

  private readonly STORAGE_TOKENS_KEY = 'finease_auth_tokens';
  private readonly STORAGE_USER_KEY = 'finease_current_user';
  private readonly PKCE_VERIFIER_KEY = 'finease_pkce_verifier';
  private readonly REDIRECT_TARGET_KEY = 'finease_redirect_target';

  private initPromise: Promise<boolean> | null = null;

  // Reactive state signals
  readonly currentUser = signal<AuthUser | null>(null);
  readonly accessToken = signal<string | null>(null);
  readonly refreshTokenValue = signal<string | null>(null);

  // Computed state signals
  readonly isAuthenticated = computed(() => !!this.currentUser());
  readonly userRoles = computed<UserRole[]>(() => this.currentUser()?.roles || []);
  readonly isAdmin = computed(() => this.userRoles().includes('ADMIN'));
  readonly isManager = computed(() => this.userRoles().includes('MANAGER'));
  readonly isUser = computed(() => this.userRoles().includes('USER'));

  constructor() {
    this.ensureInitialized();
  }

  /**
   * Guarantees asynchronous session initialization & OIDC code exchange finishes
   * before route guards evaluate authentication.
   */
  ensureInitialized(): Promise<boolean> {
    if (!this.initPromise) {
      this.initPromise = this.initAuthSession();
    }
    return this.initPromise;
  }

  /**
   * Initializes session on application startup:
   * 1. Check for OIDC authorization code in URL (?code=...)
   * 2. Otherwise restore from sessionStorage / localStorage
   */
  async initAuthSession(): Promise<boolean> {
    if (typeof window === 'undefined') return false;

    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');

    if (code) {
      const success = await this.handleOidcCodeCallback(code);
      if (success) {
        return true;
      }
    }

    // Try restoring existing stored tokens
    const savedTokens =
      sessionStorage.getItem(this.STORAGE_TOKENS_KEY) ||
      localStorage.getItem(this.STORAGE_TOKENS_KEY);

    if (savedTokens) {
      try {
        const tokens: AuthTokens = JSON.parse(savedTokens);
        if (tokens.access_token) {
          const claims = this.parseJwt(tokens.access_token);
          if (claims && !this.isTokenExpired(claims.exp)) {
            this.setSessionFromTokens(tokens, claims);
            return true;
          } else if (tokens.refresh_token) {
            // Attempt silent refresh
            try {
              await firstValueFrom(this.refreshToken());
              return true;
            } catch {
              this.clearSession();
            }
          }
        }
      } catch {
        this.clearSession();
      }
    }

    // Fallback: Check local user session for smooth offline dev experience
    const savedUser = localStorage.getItem(this.STORAGE_USER_KEY);
    if (savedUser) {
      try {
        const u = JSON.parse(savedUser);
        if (u && u.roles) {
          this.setMockSession(u.roles[0] || 'USER', u.name, u.email, u.mobileNumber);
          return true;
        }
      } catch {
        // Fallback default
      }
    }

    return false;
  }

  /**
   * Triggers the OIDC Authorization Code Flow with PKCE (RFC 7636)
   * Redirects user to Keycloak /protocol/openid-connect/auth
   */
  async loginWithKeycloakSso(targetUrl: string = '/dashboard'): Promise<void> {
    const codeVerifier = generateCodeVerifier(64);
    const codeChallenge = await generatePkceChallenge(codeVerifier);

    sessionStorage.setItem(this.PKCE_VERIFIER_KEY, codeVerifier);
    localStorage.setItem(this.PKCE_VERIFIER_KEY, codeVerifier);
    sessionStorage.setItem(this.REDIRECT_TARGET_KEY, targetUrl);
    localStorage.setItem(this.REDIRECT_TARGET_KEY, targetUrl);

    const authUrl = new URL(AUTH_CONFIG.authorizationEndpoint);
    authUrl.searchParams.set('client_id', AUTH_CONFIG.clientId);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', AUTH_CONFIG.scope);
    authUrl.searchParams.set('redirect_uri', AUTH_CONFIG.redirectUri);
    authUrl.searchParams.set('code_challenge', codeChallenge);
    authUrl.searchParams.set('code_challenge_method', 'S256');

    window.location.href = authUrl.toString();
  }

  /**
   * Exchanges authorization code for tokens via Keycloak token endpoint
   */
  private async handleOidcCodeCallback(code: string): Promise<boolean> {
    const codeVerifier =
      sessionStorage.getItem(this.PKCE_VERIFIER_KEY) ||
      localStorage.getItem(this.PKCE_VERIFIER_KEY) ||
      '';

    const payload = new URLSearchParams();
    payload.set('grant_type', 'authorization_code');
    payload.set('client_id', AUTH_CONFIG.clientId);
    payload.set('code', code);
    payload.set('redirect_uri', AUTH_CONFIG.redirectUri);
    payload.set('code_verifier', codeVerifier);

    try {
      const response = await fetch(AUTH_CONFIG.tokenEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: payload.toString()
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const tokens: AuthTokens = await response.json();

      if (tokens && tokens.access_token) {
        const claims = this.parseJwt(tokens.access_token);
        this.setSessionFromTokens(tokens, claims);

        // Cleanup URL query params without reloading
        window.history.replaceState({}, document.title, window.location.pathname);
        sessionStorage.removeItem(this.PKCE_VERIFIER_KEY);
        localStorage.removeItem(this.PKCE_VERIFIER_KEY);
        sessionStorage.removeItem(this.REDIRECT_TARGET_KEY);
        localStorage.removeItem(this.REDIRECT_TARGET_KEY);
        return true;
      }
    } catch (err: any) {
      console.error('OIDC token exchange failed:', err);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
    return false;
  }

  /**
   * Refreshes the access token using the refresh_token via native fetch
   */
  refreshToken(): Observable<AuthTokens> {
    const currentRefresh = this.refreshTokenValue();
    if (!currentRefresh) {
      return throwError(() => new Error('No refresh token available'));
    }

    const payload = new URLSearchParams();
    payload.set('grant_type', 'refresh_token');
    payload.set('client_id', AUTH_CONFIG.clientId);
    payload.set('refresh_token', currentRefresh);

    return from(
      fetch(AUTH_CONFIG.tokenEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: payload.toString()
      }).then(async res => {
        if (!res.ok) {
          throw new Error(`Token refresh failed: ${res.status}`);
        }
        return (await res.json()) as AuthTokens;
      })
    ).pipe(
      tap(tokens => {
        const claims = this.parseJwt(tokens.access_token);
        this.setSessionFromTokens(tokens, claims);
      }),
      catchError(err => {
        this.clearSession();
        return throwError(() => err);
      })
    );
  }

  /**
   * Sets user session from authentic Keycloak JWT tokens
   */
  private setSessionFromTokens(tokens: AuthTokens, claims: JwtClaims | null): void {
    this.accessToken.set(tokens.access_token);
    this.refreshTokenValue.set(tokens.refresh_token || null);
    sessionStorage.setItem(this.STORAGE_TOKENS_KEY, JSON.stringify(tokens));
    localStorage.setItem(this.STORAGE_TOKENS_KEY, JSON.stringify(tokens));

    const roles = this.extractRoles(claims);
    const user: AuthUser = {
      id: claims?.sub || 'unknown',
      username: claims?.preferred_username || claims?.email || 'User',
      name: claims?.name || claims?.preferred_username || 'Bank Customer',
      email: claims?.email || 'user@eazybank.com',
      mobileNumber: claims?.['mobileNumber'] || '8788225355',
      roles: roles,
      rawClaims: claims || undefined
    };

    this.currentUser.set(user);
    localStorage.setItem(this.STORAGE_USER_KEY, JSON.stringify(user));
  }

  /**
   * Extracts realm_access and client roles from JWT
   */
  private extractRoles(claims: JwtClaims | null): UserRole[] {
    if (!claims) return ['USER'];
    const roles: string[] = [];

    // Realm roles from Keycloak
    if (claims.realm_access?.roles) {
      roles.push(...claims.realm_access.roles);
    }

    // Resource / Client roles
    if (claims.resource_access) {
      Object.values(claims.resource_access).forEach((res: any) => {
        if (res?.roles && Array.isArray(res.roles)) {
          roles.push(...res.roles);
        }
      });
    }

    // Normalize roles to uppercase
    const upperRoles = roles.map(r => r.toUpperCase());
    const validRoles: UserRole[] = [];

    if (upperRoles.includes('ADMIN')) validRoles.push('ADMIN');
    if (upperRoles.includes('MANAGER')) validRoles.push('MANAGER');
    if (upperRoles.includes('USER') || validRoles.length === 0) validRoles.push('USER');

    return validRoles;
  }

  /**
   * Decodes a JWT token payload
   */
  parseJwt(token: string): JwtClaims | null {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;
      const base64Url = parts[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      return JSON.parse(jsonPayload);
    } catch {
      return null;
    }
  }

  private isTokenExpired(exp?: number): boolean {
    if (!exp) return false;
    const nowInSeconds = Math.floor(Date.now() / 1000);
    return exp < nowInSeconds + 30; // 30s buffer
  }

  /**
   * Local Login / Demo Login (backward-compatible with mockup forms)
   */
  login(identifier: string, remember: boolean = true): UserSession {
    const isEmail = identifier.includes('@');
    const name = isEmail ? identifier.split('@')[0].toUpperCase() : 'Arjun Khade';
    const email = isEmail ? identifier : 'arjun@gmail.com';
    const mobile = isEmail ? '8788225355' : identifier;

    // Detect role from identifier for easy testing: e.g. admin@bank.com -> ADMIN
    let role: UserRole = 'USER';
    if (identifier.toLowerCase().includes('admin')) {
      role = 'ADMIN';
    } else if (identifier.toLowerCase().includes('manager')) {
      role = 'MANAGER';
    }

    this.setMockSession(role, name, email, mobile);

    return {
      name,
      email,
      mobileNumber: mobile,
      token: this.accessToken() || undefined
    };
  }

  /**
   * Registers a customer (used by Signup form)
   */
  register(name: string, email: string, mobileNumber: string): UserSession {
    this.setMockSession('USER', name, email, mobileNumber);
    return { name, email, mobileNumber };
  }

  /**
   * Generates a realistic mock JWT & User session for testing roles
   * when Keycloak container is not yet initialized or for quick dev testing.
   */
  setMockSession(
    role: UserRole = 'USER',
    name: string = 'Arjun Khade',
    email: string = 'arjun@gmail.com',
    mobileNumber: string = '8788225355'
  ): void {
    const claims: JwtClaims = {
      sub: `user-${Date.now()}`,
      preferred_username: email,
      name: name,
      email: email,
      mobileNumber: mobileNumber,
      realm_access: {
        roles: [role, 'default-roles-eazybank']
      },
      exp: Math.floor(Date.now() / 1000) + 3600,
      iat: Math.floor(Date.now() / 1000),
      iss: AUTH_CONFIG.issuer
    };

    // Construct mock JWT structure (header.payload.signature)
    const header = btoa(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
    const payload = btoa(JSON.stringify(claims));
    const mockToken = `${header}.${payload}.mock-signature-dev`;

    const tokens: AuthTokens = {
      access_token: mockToken,
      refresh_token: `mock-refresh-${Date.now()}`,
      id_token: mockToken,
      expires_in: 3600,
      token_type: 'Bearer'
    };

    this.setSessionFromTokens(tokens, claims);
  }

  /**
   * Checks whether the current user holds the specified role
   */
  hasRole(role: string): boolean {
    return this.userRoles().includes(role.toUpperCase() as UserRole);
  }

  /**
   * Checks whether current user has any of the specified roles
   */
  hasAnyRole(roles: string[]): boolean {
    const userRoleSet = new Set(this.userRoles().map(r => r.toUpperCase()));
    return roles.some(role => userRoleSet.has(role.toUpperCase()));
  }

  /**
   * Returns current access token
   */
  getAccessToken(): string | null {
    return this.accessToken();
  }

  /**
   * Signs the user out, cleans state, and optionally calls Keycloak logout
   */
  logout(): void {
    const token = this.refreshTokenValue();
    this.clearSession();

    if (token) {
      const logoutUrl = new URL(AUTH_CONFIG.logoutEndpoint);
      logoutUrl.searchParams.set('client_id', AUTH_CONFIG.clientId);
      logoutUrl.searchParams.set('post_logout_redirect_uri', AUTH_CONFIG.postLogoutRedirectUri);
      // Optional direct logout redirect
    }

    this.router.navigate(['/login']);
  }

  private clearSession(): void {
    this.currentUser.set(null);
    this.accessToken.set(null);
    this.refreshTokenValue.set(null);
    sessionStorage.removeItem(this.STORAGE_TOKENS_KEY);
    localStorage.removeItem(this.STORAGE_TOKENS_KEY);
    sessionStorage.removeItem(this.STORAGE_USER_KEY);
    localStorage.removeItem(this.STORAGE_USER_KEY);
  }

  isLoggedIn(): boolean {
    return this.isAuthenticated();
  }
}
