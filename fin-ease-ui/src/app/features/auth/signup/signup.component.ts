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
      branchAddress: ['123 Main Street, Pune', Validators.required],
      password: ['Password123!', [Validators.required, Validators.minLength(6)]]
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
        branchAddress: formVal.branchAddress
      }
    };

    this.api.createAccount(customerDto).subscribe({
      next: (res) => {
        this.auth.register(formVal.name, formVal.email, formVal.mobileNumber);
        this.isSubmitting.set(false);
        this.notification.success('Account created successfully! Welcome to FinEase.');
        this.router.navigate(['/dashboard']);
      },
      error: () => {
        this.auth.register(formVal.name, formVal.email, formVal.mobileNumber);
        this.isSubmitting.set(false);
        this.notification.info('Created in local demo session.');
        this.router.navigate(['/dashboard']);
      }
    });
  }
}
