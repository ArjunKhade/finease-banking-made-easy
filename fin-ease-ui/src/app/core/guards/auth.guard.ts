import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

/**
 * Functional Route Guard ensuring the user has a valid authenticated session
 */
export const authGuard: CanActivateFn = async (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  await authService.ensureInitialized();

  if (authService.isAuthenticated()) {
    return true;
  }

  // Redirect to login preserving the attempted destination
  return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
};

/**
 * Functional Route Guard for guest routes (e.g. /login, /signup)
 * Redirects already logged-in users directly to /dashboard
 */
export const guestGuard: CanActivateFn = async () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  await authService.ensureInitialized();

  if (authService.isAuthenticated()) {
    return router.createUrlTree(['/dashboard']);
  }
  return true;
};
