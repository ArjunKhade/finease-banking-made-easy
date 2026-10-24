import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatCheckboxModule
  ],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent {
  loginForm: FormGroup;
  hidePassword = signal(true);
  isLoading = signal(false);

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private notification: NotificationService
  ) {
    this.loginForm = this.fb.group({
      identifier: ['arjun@gmail.com', [Validators.required]],
      password: ['Password123!', [Validators.required, Validators.minLength(6)]],
      rememberMe: [true]
    });
  }

  onSubmit(): void {
    if (this.loginForm.invalid) return;

    this.isLoading.set(true);
    const { identifier, rememberMe } = this.loginForm.value;

    setTimeout(() => {
      this.authService.login(identifier, rememberMe);
      this.isLoading.set(false);
      this.notification.success('Welcome back to FinEase!');
      this.router.navigate(['/dashboard']);
    }, 400);
  }

  async loginWithKeycloak(): Promise<void> {
    try {
      this.notification.info('Redirecting to Keycloak IAM OIDC login...');
      await this.authService.loginWithKeycloakSso('/dashboard');
    } catch {
      this.notification.warn('Could not connect to Keycloak. Switching to local session.');
      this.authService.setMockSession('USER');
      this.router.navigate(['/dashboard']);
    }
  }

  quickLoginAs(role: 'ADMIN' | 'MANAGER' | 'USER', email: string): void {
    const name = role === 'ADMIN' ? 'Arjun Khade (Admin)' : role === 'MANAGER' ? 'Priya Sharma (Manager)' : 'Arjun Khade';
    this.authService.setMockSession(role, name, email);
    this.notification.success(`Logged in as ${role}: ${name}`);
    this.router.navigate(['/dashboard']);
  }

  onForgotPassword(): void {
    this.notification.info('Password reset instructions sent to your email.');
  }
}
