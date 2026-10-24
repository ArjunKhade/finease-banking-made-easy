import { Component, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTabsModule } from '@angular/material/tabs';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { BankingApiService } from '../../core/services/banking-api.service';
import { NotificationService } from '../../core/services/notification.service';
import { CreateAccountDialogComponent } from './create-account-dialog/create-account-dialog.component';
import { AccountsDto } from '../../core/models/banking.models';

@Component({
  selector: 'app-accounts',
  standalone: true,
  imports: [
    CommonModule,
    MatTabsModule,
    MatButtonModule,
    MatIconModule,
    MatDialogModule
  ],
  templateUrl: './accounts.component.html',
  styleUrl: './accounts.component.scss'
})
export class AccountsComponent {
  private api = inject(BankingApiService);
  private dialog = inject(MatDialog);
  private notification = inject(NotificationService);

  accounts = this.api.accountsList;
  selectedTab = signal(0);
  selectedAccount = signal<AccountsDto | null>(this.accounts()[0] || null);

  filteredAccounts = computed(() => {
    const tabIndex = this.selectedTab();
    if (tabIndex === 0) {
      return this.accounts().filter(a => a.accountType.includes('Savings'));
    } else if (tabIndex === 1) {
      return this.accounts().filter(a => a.accountType.includes('Current'));
    } else {
      return this.accounts().filter(a => a.accountType.includes('Fixed'));
    }
  });

  onTabChange(index: number): void {
    this.selectedTab.set(index);
    const list = this.filteredAccounts();
    if (list.length > 0) {
      this.selectedAccount.set(list[0]);
    } else {
      this.selectedAccount.set(null);
    }
  }

  openAddAccount(): void {
    const dialogRef = this.dialog.open(CreateAccountDialogComponent, { width: '520px' });
    dialogRef.afterClosed().subscribe((created) => {
      if (created) {
        this.selectedAccount.set(this.accounts()[0]);
      }
    });
  }

  downloadStatement(): void {
    this.notification.success('Account statement PDF generated and ready for download.');
  }
}
