import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { BankingApiService } from '../../../core/services/banking-api.service';
import { NotificationService } from '../../../core/services/notification.service';
import { AuthService } from '../../../core/services/auth.service';
import { CustomerDto } from '../../../core/models/banking.models';

@Component({
  selector: 'app-create-account-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule
  ],
  templateUrl: './create-account-dialog.component.html',
  styleUrl: './create-account-dialog.component.scss'
})
export class CreateAccountDialogComponent {
  accountForm: FormGroup;
  isSubmitting = false;

  constructor(
    public dialogRef: MatDialogRef<CreateAccountDialogComponent>,
    private fb: FormBuilder,
    private api: BankingApiService,
    private auth: AuthService,
    private notification: NotificationService
  ) {
    const user = this.auth.currentUser();
    this.accountForm = this.fb.group({
      name: [user?.name || 'Arjun Khade', [Validators.required, Validators.minLength(3)]],
      email: [user?.email || 'arjun@gmail.com', [Validators.required, Validators.email]],
      mobileNumber: [user?.mobileNumber || '8788225355', [Validators.required, Validators.pattern('^[0-9]{10}$')]],
      accountType: ['Savings Account', Validators.required],
      branchAddress: ['123 Main Street, Pune Main Branch', Validators.required]
    });
  }

  onSubmit(): void {
    if (this.accountForm.invalid) return;
    this.isSubmitting = true;

    const val = this.accountForm.value;
    const customer: CustomerDto = {
      name: val.name,
      email: val.email,
      mobileNumber: val.mobileNumber,
      accountsDto: {
        accountType: val.accountType,
        branchAddress: val.branchAddress
      }
    };

    this.api.createAccount(customer).subscribe({
      next: (res) => {
        this.isSubmitting = false;
        this.notification.success('Account created successfully in EazyBank!');
        this.dialogRef.close(true);
      },
      error: (err) => {
        this.isSubmitting = false;
        const serverMsg = err?.error?.errorMessage;
        if (serverMsg) {
          this.notification.error(serverMsg);
        } else {
          this.notification.error('Failed to create account. Please ensure the mobile number is unique.');
        }
      }
    });
  }
}
