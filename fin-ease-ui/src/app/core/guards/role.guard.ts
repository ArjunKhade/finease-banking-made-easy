import { CanActivateFn, Router, ActivatedRouteSnapshot } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { NotificationService } from '../services/notification.service';

/**
 * Functional Route Guard enforcing Role-Based Access Control (RBAC)
 * Reads allowed roles from route data (e.g. data: { roles: ['ADMIN', 'MANAGER'] })
 * or from explicit guard parameters.
 */
export const roleGuard = (requiredRoles?: string[]): CanActivateFn => {
  return async (route: ActivatedRouteSnapshot, state) => {
    const authService = inject(AuthService);
    const router = inject(Router);
    const notification = inject(NotificationService);

    await authService.ensureInitialized();

    if (!authService.isAuthenticated()) {
      return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
    }

    const roles = requiredRoles || (route.data?.['roles'] as string[]) || [];

    if (roles.length === 0 || authService.hasAnyRole(roles)) {
      return true;
    }

    notification.warn(`Access Restricted: This page requires ${roles.join(' or ')} permissions.`);
    return router.createUrlTree(['/dashboard']);
  };
};
