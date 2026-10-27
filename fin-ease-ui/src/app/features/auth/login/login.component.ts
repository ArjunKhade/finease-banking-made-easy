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
      identifier: ['', [Validators.required]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      rememberMe: [true]
    });
  }

  async onSubmit(): Promise<void> {
    if (this.loginForm.invalid) return;

    this.isLoading.set(true);
    const { identifier, password } = this.loginForm.value;

    try {
      const success = await this.authService.loginWithCredentials(identifier, password);
      if (success) {
        this.notification.success('Welcome back to FinEase!');
        this.router.navigate(['/dashboard']);
      }
    } catch (err: any) {
      this.notification.error(err?.message || 'Invalid email or password. Please try again.');
    } finally {
      this.isLoading.set(false);
    }
  }

  async loginWithKeycloak(): Promise<void> {
    try {
      this.notification.info('Redirecting to Keycloak IAM OIDC login...');
      await this.authService.loginWithKeycloakSso('/dashboard');
    } catch {
      this.notification.warn('Could not connect to Keycloak. Switching to local session.');
      this.authService.setMockSession('CUSTOMER');
      this.router.navigate(['/dashboard']);
    }
  }

  quickLoginAs(role: 'ADMIN' | 'MANAGER' | 'CUSTOMER', email: string): void {
    const user = this.authService.getRegisteredUsers().find(u => u.email === email);
    const name = user ? user.name : (role === 'ADMIN' ? 'System Administrator' : role === 'MANAGER' ? 'Priya Sharma' : 'Rahul Deshmukh');
    const mobile = user ? (user.mobileNumber || '') : (role === 'ADMIN' ? '9876543210' : role === 'MANAGER' ? '9822012345' : '9765432100');
    this.authService.setMockSession(role, name, email, mobile);
    this.notification.success(`Logged in as ${role}: ${name}`);
    this.router.navigate(['/dashboard']);
  }

  onForgotPassword(): void {
    this.notification.info('Password reset instructions sent to your email.');
  }
}
