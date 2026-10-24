import {
  Directive,
  Input,
  TemplateRef,
  ViewContainerRef,
  inject,
  effect,
  signal
} from '@angular/core';
import { AuthService } from '../services/auth.service';

/**
 * Structural Directive for Role-Based UI visibility
 * Conditionally renders elements if the current user possesses any of the specified roles.
 *
 * Example usage:
 *   <button *appHasRole="'ADMIN'">Admin Settings</button>
 *   <div *appHasRole="['ADMIN', 'MANAGER']">Manager Panel</div>
 */
@Directive({
  selector: '[appHasRole]',
  standalone: true
})
export class HasRoleDirective {
  private readonly templateRef = inject(TemplateRef<any>);
  private readonly viewContainer = inject(ViewContainerRef);
  private readonly authService = inject(AuthService);

  private readonly requiredRoles = signal<string[]>([]);
  private isViewCreated = false;

  @Input('appHasRole')
  set roles(value: string | string[] | undefined) {
    if (!value) {
      this.requiredRoles.set([]);
    } else if (Array.isArray(value)) {
      this.requiredRoles.set(value);
    } else {
      this.requiredRoles.set([value]);
    }
  }

  constructor() {
    // Automatically re-evaluate whenever user roles or required roles change
    effect(() => {
      const needed = this.requiredRoles();
      const currentRoles = this.authService.userRoles();

      const hasPermission =
        needed.length === 0 || this.authService.hasAnyRole(needed);

      if (hasPermission && !this.isViewCreated) {
        this.viewContainer.createEmbeddedView(this.templateRef);
        this.isViewCreated = true;
      } else if (!hasPermission && this.isViewCreated) {
        this.viewContainer.clear();
        this.isViewCreated = false;
      }
    });
  }
}
