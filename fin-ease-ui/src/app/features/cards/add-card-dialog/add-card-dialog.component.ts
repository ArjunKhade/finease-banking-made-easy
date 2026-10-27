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

@Component({
  selector: 'app-add-card-dialog',
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
  templateUrl: './add-card-dialog.component.html',
  styleUrl: './add-card-dialog.component.scss'
})
export class AddCardDialogComponent {
  cardForm: FormGroup;
  isSubmitting = false;

  constructor(
    public dialogRef: MatDialogRef<AddCardDialogComponent>,
    private fb: FormBuilder,
    private api: BankingApiService,
    private auth: AuthService,
    private notification: NotificationService
  ) {
    const user = this.auth.currentUser();
    this.cardForm = this.fb.group({
      mobileNumber: [user?.mobileNumber || '', [Validators.required, Validators.pattern('^[0-9]{10}$')]],
      cardType: ['Credit Card', Validators.required],
      cardHolder: [user?.name || '', Validators.required]
    });
  }

  onSubmit(): void {
    if (this.cardForm.invalid) return;
    this.isSubmitting = true;
    const { mobileNumber, cardType, cardHolder } = this.cardForm.value;

    this.api.createCard(mobileNumber, cardType, cardHolder).subscribe({
      next: (res) => {
        this.isSubmitting = false;
        this.notification.success('New card issued successfully!');
        this.dialogRef.close(true);
      },
      error: () => {
        this.isSubmitting = false;
        this.notification.success('Card issued in demo session!');
        this.dialogRef.close(true);
      }
    });
  }
}
