import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSliderModule } from '@angular/material/slider';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule } from '@angular/forms';
import { CardsDto } from '../../../core/models/banking.models';
import { BankingApiService } from '../../../core/services/banking-api.service';
import { NotificationService } from '../../../core/services/notification.service';

@Component({
  selector: 'app-card-controls-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatSlideToggleModule,
    MatSliderModule,
    MatButtonModule,
    MatIconModule
  ],
  templateUrl: './card-controls-dialog.component.html',
  styleUrl: './card-controls-dialog.component.scss'
})
export class CardControlsDialogComponent {
  spendingLimit: number = 75000;

  constructor(
    public dialogRef: MatDialogRef<CardControlsDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public card: CardsDto,
    private api: BankingApiService,
    private notification: NotificationService
  ) {}

  toggleSetting(field: 'isInternationalEnabled' | 'isOnlineEnabled'): void {
    if (this.card.cardNumber) {
      this.api.toggleCardSetting(this.card.cardNumber, field);
      this.card[field] = !this.card[field];
      this.notification.success('Security setting updated');
    }
  }

  toggleStatus(): void {
    if (this.card.cardNumber) {
      this.api.toggleCardSetting(this.card.cardNumber, 'status');
      this.card.status = this.card.status === 'Active' ? 'Blocked' : 'Active';
      this.notification.info(`Card status set to: ${this.card.status}`);
    }
  }

  resetPin(): void {
    this.notification.info('OTP sent to your registered mobile number for PIN reset.');
  }
}
