import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { AuthService } from '../../../core/services/auth.service';
import { BankingApiService } from '../../../core/services/banking-api.service';
import { NotificationService } from '../../../core/services/notification.service';
import { CustomerDto } from '../../../core/models/banking.models';

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatSelectModule
  ],
  templateUrl: './signup.component.html',
  styleUrl: './signup.component.scss'
})
export class SignupComponent {
  signupForm: FormGroup;
  hidePassword = signal(true);
  isSubmitting = signal(false);

  constructor(
    private fb: FormBuilder,
    private api: BankingApiService,
    private auth: AuthService,
    private router: Router,
    private notification: NotificationService
  ) {
    this.signupForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email]],
      mobileNumber: ['', [Validators.required, Validators.pattern('^[0-9]{10}$')]],
      accountType: ['Savings Account', Validators.required],
      branchAddress: ['Pune Main Branch', Validators.required],
      depositAmount: [5000, [Validators.required, Validators.min(0)]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  onSubmit(): void {
    if (this.signupForm.invalid) return;

    this.isSubmitting.set(true);
    const formVal = this.signupForm.value;

    const customerDto: CustomerDto = {
      name: formVal.name,
      email: formVal.email,
      mobileNumber: formVal.mobileNumber,
      accountsDto: {
        accountType: formVal.accountType,
        branchAddress: formVal.branchAddress,
        balance: Number(formVal.depositAmount) || 0
      }
    };

    this.api.clearData();
    this.api.createAccount(customerDto).subscribe({
      next: async (res) => {
        // Sync user with Keycloak IAM
        await this.auth.syncKeycloakUser(formVal.name, formVal.email, formVal.mobileNumber, formVal.password);
        this.auth.register(formVal.name, formVal.email, formVal.mobileNumber);
        localStorage.setItem('finease_current_mobile', formVal.mobileNumber);

        this.isSubmitting.set(false);
        this.notification.success('Account created and synced with Keycloak IAM successfully! Welcome to FinEase.');
        this.router.navigate(['/dashboard']);
      },
      error: async (err) => {
        this.isSubmitting.set(false);
        const serverMsg = err?.error?.errorMessage || err?.error?.message ||
          (typeof err?.error === 'object' && err?.error ? Object.values(err.error)[0] : null);
        if (serverMsg) {
          this.notification.error(String(serverMsg));
        } else {
          // If completely offline (status 0), fallback to local demo registration & sync
          await this.auth.syncKeycloakUser(formVal.name, formVal.email, formVal.mobileNumber, formVal.password);
          this.auth.register(formVal.name, formVal.email, formVal.mobileNumber);
          localStorage.setItem('finease_current_mobile', formVal.mobileNumber);
          this.notification.info('Created in local demo session.');
          this.router.navigate(['/dashboard']);
        }
      }
    });
  }
}
