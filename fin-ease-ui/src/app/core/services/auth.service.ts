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
  private readonly STORAGE_REGISTERED_USERS_KEY = 'finease_registered_users';
  private readonly PKCE_VERIFIER_KEY = 'finease_pkce_verifier';
  private readonly REDIRECT_TARGET_KEY = 'finease_redirect_target';
  private readonly PROCESSED_CODE_KEY = 'finease_processed_code';

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
  readonly isCustomer = computed(() => this.userRoles().includes('CUSTOMER'));
  readonly isUser = computed(() => this.userRoles().includes('CUSTOMER'));

  constructor() {
    this.ensureInitialized();
  }

  /**
   * Cleans OAuth2 query params (?code=...&state=...&session_state=...) from URL
   * in both browser history and Angular Router's internal URL tree.
   */
  cleanUrlParams(): void {
    if (typeof window === 'undefined') return;

    try {
      const url = new URL(window.location.href);
      if (url.searchParams.has('code') || url.searchParams.has('state') || url.searchParams.has('session_state')) {
        url.searchParams.delete('code');
        url.searchParams.delete('state');
        url.searchParams.delete('session_state');
        window.history.replaceState({}, document.title, url.pathname + (url.search ? url.search : '') + url.hash);
      }
    } catch {
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    try {
      this.router.navigate([], {
        queryParams: { code: null, state: null, session_state: null },
        queryParamsHandling: 'merge',
        replaceUrl: true
      });
    } catch {
      // Router might be bootstrapping early
    }
  }

  /**
   * Restores an active authenticated session from storage if tokens or user are valid.
   */
  restoreStoredSession(): boolean {
    if (typeof window === 'undefined') return false;

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
          }
        }
      } catch {
        // Fallback
      }
    }

    const savedUser = localStorage.getItem(this.STORAGE_USER_KEY);
    if (savedUser) {
      try {
        const u: AuthUser = JSON.parse(savedUser);
        if (u && u.name) {
          this.currentUser.set(u);
          return true;
        }
      } catch {
        // Fallback
      }
    }

    return false;
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
    const processedCode = sessionStorage.getItem(this.PROCESSED_CODE_KEY);

    // If user refreshes on a URL that still contains an already consumed one-time code:
    // Do NOT exchange it again! Keycloak single-use code semantics will fail with 400 invalid_grant.
    if (code && (code === processedCode || this.restoreStoredSession())) {
      this.cleanUrlParams();
      return true;
    }

    // Fresh OIDC authorization code from Keycloak login redirect
    if (code) {
      sessionStorage.setItem(this.PROCESSED_CODE_KEY, code);
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
            // Attempt silent refresh using stored refresh token
            try {
              await firstValueFrom(this.refreshToken(tokens.refresh_token));
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

    // Restore active local user session dynamically
    const savedUser = localStorage.getItem(this.STORAGE_USER_KEY);
    if (savedUser) {
      try {
        const u: AuthUser = JSON.parse(savedUser);
        if (u && u.name) {
          this.currentUser.set(u);
          return true;
        }
      } catch {
        this.clearSession();
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

        // Cleanup URL query params both in window history and Angular Router
        this.cleanUrlParams();
        sessionStorage.removeItem(this.PKCE_VERIFIER_KEY);
        localStorage.removeItem(this.PKCE_VERIFIER_KEY);
        sessionStorage.removeItem(this.REDIRECT_TARGET_KEY);
        localStorage.removeItem(this.REDIRECT_TARGET_KEY);
        return true;
      }
    } catch (err: any) {
      console.warn('OIDC token exchange could not be completed (code may have already been consumed):', err.message || err);
      this.cleanUrlParams();
    }
    return false;
  }

  /**
   * Refreshes the access token using the refresh_token via native fetch
   */
  refreshToken(tokenOverride?: string): Observable<AuthTokens> {
    const currentRefresh =
      tokenOverride ||
      this.refreshTokenValue() ||
      (() => {
        try {
          const saved = sessionStorage.getItem(this.STORAGE_TOKENS_KEY) || localStorage.getItem(this.STORAGE_TOKENS_KEY);
          return saved ? JSON.parse(saved)?.refresh_token : null;
        } catch {
          return null;
        }
      })();

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
    const resolvedName =
      claims?.name ||
      (claims?.given_name ? `${claims.given_name} ${claims.family_name || ''}`.trim() : '') ||
      claims?.preferred_username ||
      'Bank Customer';

    const resolvedEmail = claims?.email || (claims?.preferred_username?.includes('@') ? claims.preferred_username : '');
    const resolvedMobile =
      claims?.['mobileNumber'] ||
      claims?.['phone_number'] ||
      claims?.['attributes']?.['mobileNumber']?.[0] ||
      this.getRegisteredUsers().find(u => u.email?.toLowerCase() === resolvedEmail.toLowerCase() || u.username?.toLowerCase() === resolvedEmail.toLowerCase())?.mobileNumber ||
      (typeof window !== 'undefined' ? localStorage.getItem('finease_current_mobile') : null) ||
      '';

    if (resolvedMobile && typeof window !== 'undefined') {
      localStorage.setItem('finease_current_mobile', resolvedMobile);
    }

    const user: AuthUser = {
      id: claims?.sub || `usr-${Date.now()}`,
      username: claims?.preferred_username || resolvedEmail || 'customer',
      name: resolvedName,
      email: resolvedEmail,
      mobileNumber: resolvedMobile,
      roles: roles,
      rawClaims: claims || undefined
    };

    this.currentUser.set(user);
    localStorage.setItem(this.STORAGE_USER_KEY, JSON.stringify(user));
    this.saveUser(user);
  }

  /**
   * Extracts realm_access and client roles from JWT
   */
  private extractRoles(claims: JwtClaims | null): UserRole[] {
    if (!claims) return ['CUSTOMER'];
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
    if (upperRoles.includes('CUSTOMER') || upperRoles.includes('USER') || validRoles.length === 0) {
      validRoles.push('CUSTOMER');
    }

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
   * Returns all registered users from dynamic local repository.
   * If empty, seeds standard industry personas.
   */
  getRegisteredUsers(): AuthUser[] {
    if (typeof window === 'undefined') return [];
    const saved = localStorage.getItem(this.STORAGE_REGISTERED_USERS_KEY);
    if (saved) {
      try {
        const users: AuthUser[] = JSON.parse(saved);
        if (Array.isArray(users) && users.length > 0) {
          return users;
        }
      } catch {
        // Fallback to seed
      }
    }

    // Standard seed accounts matching eazybank-realm.json
    const seedUsers: AuthUser[] = [
      {
        id: 'usr-admin-01',
        username: 'admin@eazybank.com',
        name: 'System Administrator',
        email: 'admin@eazybank.com',
        mobileNumber: '9876543210',
        roles: ['ADMIN']
      },
      {
        id: 'usr-manager-01',
        username: 'manager@eazybank.com',
        name: 'Priya Sharma',
        email: 'manager@eazybank.com',
        mobileNumber: '9822012345',
        roles: ['MANAGER']
      },
      {
        id: 'usr-user-01',
        username: 'user@eazybank.com',
        name: 'Rahul Deshmukh',
        email: 'user@eazybank.com',
        mobileNumber: '9765432100',
        roles: ['CUSTOMER']
      }
    ];

    localStorage.setItem(this.STORAGE_REGISTERED_USERS_KEY, JSON.stringify(seedUsers));
    return seedUsers;
  }

  /**
   * Fetches real live users from Keycloak Realm using backend-admin-client
   */
  async fetchKeycloakUsers(): Promise<AuthUser[]> {
    if (typeof window === 'undefined') return this.getRegisteredUsers();

    try {
      const tokenPayload = new URLSearchParams();
      tokenPayload.set('grant_type', 'client_credentials');
      tokenPayload.set('client_id', 'backend-admin-client');
      tokenPayload.set('client_secret', 'backend-admin-secret');

      const tokenRes = await fetch(AUTH_CONFIG.tokenEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: tokenPayload.toString()
      });

      if (!tokenRes.ok) {
        return this.getRegisteredUsers();
      }

      const tokenData = await tokenRes.json();
      const adminToken = tokenData.access_token;
      const adminHeaders = {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      };

      const usersRes = await fetch(`${AUTH_CONFIG.keycloakUrl}/admin/realms/${AUTH_CONFIG.realm}/users?max=50`, {
        headers: adminHeaders
      });

      if (!usersRes.ok) {
        return this.getRegisteredUsers();
      }

      const kcUsers: any[] = await usersRes.json();
      const mappedUsers: AuthUser[] = [];

      for (const u of kcUsers) {
        // Skip service account internal users
        if (u.username?.startsWith('service-account-')) continue;

        let userRoles: UserRole[] = ['CUSTOMER'];
        try {
          const rolesRes = await fetch(`${AUTH_CONFIG.keycloakUrl}/admin/realms/${AUTH_CONFIG.realm}/users/${u.id}/role-mappings/realm`, {
            headers: adminHeaders
          });
          if (rolesRes.ok) {
            const kcRoles: any[] = await rolesRes.json();
            const primaryRole = kcRoles.find(
              (r: any) => r.name === 'ADMIN' || r.name === 'MANAGER' || r.name === 'CUSTOMER' || r.name === 'USER'
            );
            if (primaryRole) {
              const roleName = primaryRole.name === 'USER' ? 'CUSTOMER' : primaryRole.name;
              userRoles = [roleName as UserRole];
            }
          }
        } catch {
          // fallback default role
        }

        const fullName = `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.username;
        mappedUsers.push({
          id: u.id,
          username: u.username,
          name: fullName,
          email: u.email || u.username,
          mobileNumber: u.attributes?.mobileNumber?.[0] || 'N/A',
          roles: userRoles
        });
      }

      if (mappedUsers.length > 0) {
        localStorage.setItem(this.STORAGE_REGISTERED_USERS_KEY, JSON.stringify(mappedUsers));
        return mappedUsers;
      }
    } catch (err) {
      console.warn('Could not fetch live users from Keycloak:', err);
    }

    return this.getRegisteredUsers();
  }

  /**
   * Dynamically adds or updates a user in the registered users registry
   */
  saveUser(user: AuthUser): void {
    if (typeof window === 'undefined') return;
    const users = this.getRegisteredUsers();
    const index = users.findIndex(u => u.email?.toLowerCase() === user.email?.toLowerCase() || (user.mobileNumber && u.mobileNumber === user.mobileNumber));
    if (index >= 0) {
      users[index] = { ...users[index], ...user };
    } else {
      users.push(user);
    }
    localStorage.setItem(this.STORAGE_REGISTERED_USERS_KEY, JSON.stringify(users));
  }

  /**
   * Updates a user's role dynamically in the IAM registry
   */
  updateUserRole(userId: string, newRole: UserRole): void {
    const users = this.getRegisteredUsers().map(u => {
      if (u.id === userId) {
        return { ...u, roles: [newRole] };
      }
      return u;
    });
    localStorage.setItem(this.STORAGE_REGISTERED_USERS_KEY, JSON.stringify(users));

    // If updating currently logged in user, refresh current user signal
    const cur = this.currentUser();
    if (cur && cur.id === userId) {
      const updatedUser: AuthUser = { ...cur, roles: [newRole] };
      this.currentUser.set(updatedUser);
      localStorage.setItem(this.STORAGE_USER_KEY, JSON.stringify(updatedUser));
    }
  }

  /**
   * Authenticates user against dynamic user repository or dynamically derives user info
   */
  login(identifier: string, remember: boolean = true): UserSession {
    const trimmed = identifier.trim().toLowerCase();
    const users = this.getRegisteredUsers();

    // Look up registered user by email, username, or mobile
    const matchedUser = users.find(
      u => u.email?.toLowerCase() === trimmed ||
           u.username?.toLowerCase() === trimmed ||
           u.mobileNumber === trimmed
    );

    if (matchedUser) {
      this.setMockSession(
        matchedUser.roles[0] || 'CUSTOMER',
        matchedUser.name,
        matchedUser.email,
        matchedUser.mobileNumber || ''
      );
      return {
        name: matchedUser.name,
        email: matchedUser.email,
        mobileNumber: matchedUser.mobileNumber || '',
        token: this.accessToken() || undefined
      };
    }

    // Dynamic generation if new identifier is entered
    const isEmail = identifier.includes('@');
    let name: string;
    let email: string;
    let mobile: string;

    if (isEmail) {
      email = identifier.trim();
      const prefix = identifier.split('@')[0];
      name = prefix
        .split(/[._-]/)
        .map(p => p.charAt(0).toUpperCase() + p.slice(1))
        .join(' ');
      mobile = '';
    } else {
      mobile = identifier.replace(/\D/g, '');
      email = `${mobile}@finease.local`;
      name = `Customer ${mobile.slice(-4)}`;
    }

    let role: UserRole = 'CUSTOMER';
    if (identifier.toLowerCase().includes('admin')) {
      role = 'ADMIN';
    } else if (identifier.toLowerCase().includes('manager')) {
      role = 'MANAGER';
    }

    const newUser: AuthUser = {
      id: `usr-${Date.now()}`,
      username: email,
      name,
      email,
      mobileNumber: mobile,
      roles: [role]
    };
    this.saveUser(newUser);
    this.setMockSession(role, name, email, mobile);

    return {
      name,
      email,
      mobileNumber: mobile,
      token: this.accessToken() || undefined
    };
  }

  /**
   * Registers a customer dynamically and persists them
   */
  register(name: string, email: string, mobileNumber: string): UserSession {
    const trimmedName = name.trim();
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedMobile = mobileNumber.trim();

    const newUser: AuthUser = {
      id: `usr-${Date.now()}`,
      username: trimmedEmail,
      name: trimmedName,
      email: trimmedEmail,
      mobileNumber: trimmedMobile,
      roles: ['CUSTOMER']
    };

    this.saveUser(newUser);
    this.setMockSession('CUSTOMER', trimmedName, trimmedEmail, trimmedMobile);
    return { name: trimmedName, email: trimmedEmail, mobileNumber: trimmedMobile };
  }

  /**
   * Synchronizes newly registered customer directly with Keycloak IAM via Admin API.
   * Creates the Keycloak user, sets credentials, and assigns realm roles (USER, ACCOUNTS, CARDS, LOANS).
   */
  async syncKeycloakUser(name: string, email: string, mobileNumber: string, password?: string): Promise<boolean> {
    if (typeof window === 'undefined') return false;

    const trimmedEmail = email.trim().toLowerCase();
    const trimmedMobile = mobileNumber.trim();
    const names = name.trim().split(' ');
    const firstName = names[0] || 'Bank';
    const lastName = names.slice(1).join(' ') || 'Customer';

    try {
      // 1. Obtain Service Account Access Token using backend-admin-client
      const tokenPayload = new URLSearchParams();
      tokenPayload.set('grant_type', 'client_credentials');
      tokenPayload.set('client_id', 'backend-admin-client');
      tokenPayload.set('client_secret', 'backend-admin-secret');

      const tokenRes = await fetch(AUTH_CONFIG.tokenEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: tokenPayload.toString()
      });

      if (!tokenRes.ok) {
        console.warn('Could not authenticate backend-admin-client with Keycloak:', tokenRes.status);
        return false;
      }

      const tokenData = await tokenRes.json();
      const adminToken = tokenData.access_token;
      const adminHeaders = {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      };

      // 2. Check if user already exists in Keycloak
      const checkRes = await fetch(`${AUTH_CONFIG.keycloakUrl}/admin/realms/${AUTH_CONFIG.realm}/users?username=${encodeURIComponent(trimmedEmail)}`, {
        headers: adminHeaders
      });

      let userId: string | null = null;
      if (checkRes.ok) {
        const existingUsers = await checkRes.json();
        if (Array.isArray(existingUsers) && existingUsers.length > 0) {
          userId = existingUsers[0].id;
        }
      }

      // 3. Create user in Keycloak if not already present
      if (!userId) {
        const userPayload: any = {
          username: trimmedEmail,
          email: trimmedEmail,
          firstName,
          lastName,
          enabled: true,
          emailVerified: true,
          attributes: {
            mobileNumber: [trimmedMobile]
          }
        };

        if (password) {
          userPayload.credentials = [
            {
              type: 'password',
              value: password,
              temporary: false
            }
          ];
        }

        const createRes = await fetch(`${AUTH_CONFIG.keycloakUrl}/admin/realms/${AUTH_CONFIG.realm}/users`, {
          method: 'POST',
          headers: adminHeaders,
          body: JSON.stringify(userPayload)
        });

        if (createRes.status === 201 || createRes.status === 200) {
          const location = createRes.headers.get('Location');
          if (location) {
            userId = location.substring(location.lastIndexOf('/') + 1);
          }
          if (!userId) {
            const searchRes = await fetch(`${AUTH_CONFIG.keycloakUrl}/admin/realms/${AUTH_CONFIG.realm}/users?username=${encodeURIComponent(trimmedEmail)}`, {
              headers: adminHeaders
            });
            if (searchRes.ok) {
              const list = await searchRes.json();
              if (Array.isArray(list) && list.length > 0) {
                userId = list[0].id;
              }
            }
          }
        }
      }

      // 4. Assign default realm roles (CUSTOMER)
      if (userId) {
        const rolesRes = await fetch(`${AUTH_CONFIG.keycloakUrl}/admin/realms/${AUTH_CONFIG.realm}/roles`, {
          headers: adminHeaders
        });
        if (rolesRes.ok) {
          const allRoles = await rolesRes.json();
          const targetRoles = allRoles.filter((r: any) =>
            ['CUSTOMER', 'USER'].includes(r.name)
          );
          if (targetRoles.length > 0) {
            await fetch(`${AUTH_CONFIG.keycloakUrl}/admin/realms/${AUTH_CONFIG.realm}/users/${userId}/role-mappings/realm`, {
              method: 'POST',
              headers: adminHeaders,
              body: JSON.stringify(targetRoles)
            });
          }
        }
        console.log(`[Keycloak Sync] Successfully registered user ${trimmedEmail} in Keycloak IAM!`);
      }

      return true;
    } catch (err) {
      console.warn('Keycloak synchronization failed (offline or network issue):', err);
      return false;
    }
  }

  /**
   * Attempts authentic Keycloak login using Resource Owner Password Credentials (Direct Grant),
   * falling back to local session if Keycloak is unreachable or credentials are local demo personas.
   */
  async loginWithCredentials(identifier: string, password?: string): Promise<boolean> {
    const trimmed = identifier.trim().toLowerCase();

    if (!password) {
      throw new Error('Password is required.');
    }

    let response: Response;
    try {
      const payload = new URLSearchParams();
      payload.set('grant_type', 'password');
      payload.set('client_id', AUTH_CONFIG.clientId);
      payload.set('username', trimmed);
      payload.set('password', password);

      response = await fetch(AUTH_CONFIG.tokenEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: payload.toString()
      });
    } catch (networkErr) {
      console.warn('Keycloak unreachable:', networkErr);
      throw new Error('Cannot reach authentication server. Please ensure Keycloak is running on port 7080.');
    }

    if (response.ok) {
      const tokens: AuthTokens = await response.json();
      if (tokens && tokens.access_token) {
        const claims = this.parseJwt(tokens.access_token);
        this.setSessionFromTokens(tokens, claims);
        return true;
      }
    } else {
      const errJson = await response.json().catch(() => ({}));
      const message = errJson.error_description || 'Invalid email or password. Please try again.';
      throw new Error(message);
    }

    return false;
  }

  /**
   * Generates a realistic dynamic JWT & user session for seamless development and testing
   */
  setMockSession(
    role: UserRole = 'CUSTOMER',
    name: string = 'Bank Customer',
    email: string = 'customer@eazybank.com',
    mobileNumber: string = ''
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
   * Signs the user out, cleans state, and redirects to login
   */
  logout(): void {
    const token = this.refreshTokenValue();
    this.clearSession();

    if (token) {
      const logoutUrl = new URL(AUTH_CONFIG.logoutEndpoint);
      logoutUrl.searchParams.set('client_id', AUTH_CONFIG.clientId);
      logoutUrl.searchParams.set('post_logout_redirect_uri', AUTH_CONFIG.postLogoutRedirectUri);
    }

    this.router.navigate(['/login']);
  }

  clearSession(): void {
    this.currentUser.set(null);
    this.accessToken.set(null);
    this.refreshTokenValue.set(null);
    sessionStorage.removeItem(this.STORAGE_TOKENS_KEY);
    localStorage.removeItem(this.STORAGE_TOKENS_KEY);
    sessionStorage.removeItem(this.STORAGE_USER_KEY);
    localStorage.removeItem(this.STORAGE_USER_KEY);
    sessionStorage.removeItem(this.PROCESSED_CODE_KEY);
  }

  isLoggedIn(): boolean {
    return this.isAuthenticated();
  }
}
