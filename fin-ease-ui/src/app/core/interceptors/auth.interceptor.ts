import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject, Injector } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { NotificationService } from '../services/notification.service';

/**
 * Functional HTTP Interceptor for OAuth2 / OIDC & JWT Bearer Token Injection
 * Relays the Keycloak Access Token to API Gateway & Microservices.
 * Reads token from storage without eager injection of AuthService to prevent NG0200 circular dependencies.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  // Skip token injection for public authentication and registration endpoints
  const isPublicUrl =
    req.url.includes('/api/register') ||
    req.url.includes('/protocol/openid-connect') ||
    req.url.includes('/.well-known/openid-configuration');

  if (isPublicUrl) {
    return next(req);
  }

  const injector = inject(Injector);
  const notification = inject(NotificationService);

  // Read access token directly from storage to eliminate any DI circular dependencies
  let token: string | null = null;
  let isMock = false;
  try {
    const saved =
      sessionStorage.getItem('finease_auth_tokens') ||
      localStorage.getItem('finease_auth_tokens');
    if (saved) {
      token = JSON.parse(saved)?.access_token || null;
      if (token && (token.includes('mock-signature') || token.startsWith('mock-'))) {
        isMock = true;
      }
    }
  } catch {
    token = null;
  }

  let authReq = req;
  // Only inject real Bearer tokens. Mock tokens fail cryptographic validation at the API Gateway.
  if (token && !isMock) {
    authReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      // In local dev/mock sessions, do not force-logout when an unauthenticated endpoint responds with 401
      if (isMock) {
        return throwError(() => error);
      }

      if (error.status === 401 && !isPublicUrl) {
        // Lazily retrieve AuthService only if token refresh is needed
        const authService = injector.get(AuthService);
        const refreshVal = authService.refreshTokenValue();
        if (token && refreshVal && !refreshVal.startsWith('mock-')) {
          return authService.refreshToken().pipe(
            switchMap(newTokens => {
              const retryReq = req.clone({
                setHeaders: {
                  Authorization: `Bearer ${newTokens.access_token}`
                }
              });
              return next(retryReq);
            }),
            catchError(refreshErr => {
              authService.logout();
              notification.error('Your session has expired. Please log in again.');
              return throwError(() => refreshErr);
            })
          );
        } else if (token) {
          authService.logout();
          notification.error('Your session has expired. Please sign in again.');
        }
      } else if (error.status === 403) {
        notification.error('Access Denied: You do not have permission to access this resource.');
      }

      return throwError(() => error);
    })
  );
};
