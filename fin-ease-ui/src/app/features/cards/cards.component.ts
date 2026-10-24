import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { BankingApiService } from '../../core/services/banking-api.service';
import { NotificationService } from '../../core/services/notification.service';
import { AddCardDialogComponent } from './add-card-dialog/add-card-dialog.component';
import { CardControlsDialogComponent } from './card-controls-dialog/card-controls-dialog.component';
import { CardsDto } from '../../core/models/banking.models';

@Component({
  selector: 'app-cards',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatDialogModule
  ],
  templateUrl: './cards.component.html',
  styleUrl: './cards.component.scss'
})
export class CardsComponent {
  private api = inject(BankingApiService);
  private dialog = inject(MatDialog);
  private notification = inject(NotificationService);

  cards = this.api.cardsList;
  activeCard = signal<CardsDto | null>(this.cards()[0] || null);

  openAddCard(): void {
    const dialogRef = this.dialog.open(AddCardDialogComponent, { width: '480px' });
    dialogRef.afterClosed().subscribe((created) => {
      if (created) {
        this.activeCard.set(this.cards()[this.cards().length - 1]);
      }
    });
  }

  openCardControls(card: CardsDto): void {
    this.dialog.open(CardControlsDialogComponent, {
      width: '540px',
      data: card
    });
  }

  toggleStatus(card: CardsDto): void {
    if (card.cardNumber) {
      this.api.toggleCardSetting(card.cardNumber, 'status');
      card.status = card.status === 'Active' ? 'Blocked' : 'Active';
      this.notification.info(`Card ${card.status.toLowerCase()} successfully.`);
    }
  }

  copyCardNumber(num: string): void {
    navigator.clipboard?.writeText(num);
    this.notification.success('Card number copied to clipboard.');
  }

  viewTransactions(): void {
    this.notification.info('Viewing transactions for this card.');
  }
}
