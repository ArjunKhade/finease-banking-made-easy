import { Component, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { BankingApiService } from '../../core/services/banking-api.service';
import { AuthService } from '../../core/services/auth.service';
import { CreateAccountDialogComponent } from '../accounts/create-account-dialog/create-account-dialog.component';
import { AddCardDialogComponent } from '../cards/add-card-dialog/add-card-dialog.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatIconModule,
    MatButtonModule,
    MatDialogModule
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent implements OnInit {
  private api = inject(BankingApiService);
  private auth = inject(AuthService);
  private dialog = inject(MatDialog);

  accounts = this.api.accountsList;
  cards = this.api.cardsList;
  loans = this.api.loansList;
  transactions = this.api.transactionsList;

  ngOnInit(): void {
    const user = this.auth.currentUser();
    const mobile =
      user?.mobileNumber ||
      this.auth.getRegisteredUsers().find(u => u.email?.toLowerCase() === user?.email?.toLowerCase())?.mobileNumber ||
      (typeof window !== 'undefined' ? localStorage.getItem('finease_current_mobile') : null) ||
      '';

    if (mobile) {
      this.api.loadUserBankingData(mobile, user || undefined).subscribe();
    }
  }

  totalBalance = computed(() => {
    return this.accounts().reduce((acc, curr) => acc + (curr.balance || 0), 0);
  });

  totalLoanOutstanding = computed(() => {
    return this.loans().reduce((acc, curr) => acc + (curr.outstandingAmount || 0), 0);
  });

  creditCardsCount = computed(() => {
    return this.cards().filter(c => c.cardType.toLowerCase().includes('credit')).length;
  });

  debitCardsCount = computed(() => {
    return this.cards().filter(c => c.cardType.toLowerCase().includes('debit')).length;
  });

  openAddAccount(): void {
    this.dialog.open(CreateAccountDialogComponent, { width: '520px' });
  }

  openAddCard(): void {
    this.dialog.open(AddCardDialogComponent, { width: '480px' });
  }
}
