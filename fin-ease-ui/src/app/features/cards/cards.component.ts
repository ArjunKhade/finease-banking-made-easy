import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { BankingApiService } from '../../core/services/banking-api.service';
import { AuthService } from '../../core/services/auth.service';
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
export class CardsComponent implements OnInit {
  private api = inject(BankingApiService);
  private dialog = inject(MatDialog);
  private notification = inject(NotificationService);
  public auth = inject(AuthService);

  cards = this.api.cardsList;
  selectedCard = signal<CardsDto | null>(null);

  activeCard = computed(() => {
    const list = this.cards();
    if (list.length === 0) return null;
    const current = this.selectedCard();
    if (current && list.some(c => c.cardNumber === current.cardNumber)) {
      return current;
    }
    return list[0];
  });

  ngOnInit(): void {
    const user = this.auth.currentUser();
    const mobile =
      user?.mobileNumber ||
      this.auth.getRegisteredUsers().find(u => u.email?.toLowerCase() === user?.email?.toLowerCase())?.mobileNumber ||
      (typeof window !== 'undefined' ? localStorage.getItem('finease_current_mobile') : null) ||
      '';

    if (mobile && (this.cards().length === 0 || this.api.getCurrentMobile() !== mobile)) {
      this.api.loadUserBankingData(mobile, user || undefined).subscribe();
    }
  }

  selectCard(card: CardsDto): void {
    this.selectedCard.set(card);
  }

  openAddCard(): void {
    const dialogRef = this.dialog.open(AddCardDialogComponent, { width: '480px' });
    dialogRef.afterClosed().subscribe((created) => {
      if (created) {
        const list = this.cards();
        if (list.length > 0) {
          this.selectedCard.set(list[list.length - 1]);
        }
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
