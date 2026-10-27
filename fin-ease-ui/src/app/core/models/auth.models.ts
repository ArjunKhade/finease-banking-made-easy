export type UserRole = 'ADMIN' | 'MANAGER' | 'CUSTOMER';

export interface RealmAccess {
  roles: string[];
}

export interface ResourceAccess {
  [clientId: string]: {
    roles: string[];
  };
}

export interface JwtClaims {
  sub: string;
  preferred_username?: string;
  name?: string;
  given_name?: string;
  family_name?: string;
  email?: string;
  email_verified?: boolean;
  mobileNumber?: string;
  realm_access?: RealmAccess;
  resource_access?: ResourceAccess;
  exp: number;
  iat?: number;
  auth_time?: number;
  iss?: string;
  aud?: string | string[];
  [key: string]: any;
}

export interface AuthTokens {
  access_token: string;
  refresh_token?: string;
  id_token?: string;
  expires_in?: number;
  token_type?: string;
  scope?: string;
}

export interface AuthUser {
  id: string;
  username: string;
  name: string;
  email: string;
  mobileNumber?: string;
  roles: UserRole[];
  rawClaims?: JwtClaims;
}

export type AuthState = 'INITIALIZING' | 'AUTHENTICATED' | 'UNAUTHENTICATED' | 'ERROR';
