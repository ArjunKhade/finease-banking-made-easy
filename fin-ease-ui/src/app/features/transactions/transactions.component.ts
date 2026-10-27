import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatTabsModule } from '@angular/material/tabs';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { BankingApiService } from '../../core/services/banking-api.service';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';

@Component({
  selector: 'app-transactions',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatTabsModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule
  ],
  templateUrl: './transactions.component.html',
  styleUrl: './transactions.component.scss'
})
export class TransactionsComponent implements OnInit {
  private api = inject(BankingApiService);
  private auth = inject(AuthService);
  private notification = inject(NotificationService);

  transactions = this.api.transactionsList;
  filterType = signal<'all' | 'debit' | 'credit'>('all');
  searchQuery = signal('');

  ngOnInit(): void {
    const user = this.auth.currentUser();
    if (user?.mobileNumber && this.transactions().length === 0) {
      this.api.loadUserBankingData(user.mobileNumber, user).subscribe();
    }
  }

  filteredTransactions = computed(() => {
    const type = this.filterType();
    const query = this.searchQuery().toLowerCase().trim();

    return this.transactions().filter(t => {
      const matchesType = type === 'all' || t.type === type;
      const matchesQuery = !query ||
        t.title.toLowerCase().includes(query) ||
        t.subtitle.toLowerCase().includes(query) ||
        t.id.toLowerCase().includes(query);
      return matchesType && matchesQuery;
    });
  });

  exportTransactions(): void {
    this.notification.success('Transactions CSV export initiated.');
  }
}
