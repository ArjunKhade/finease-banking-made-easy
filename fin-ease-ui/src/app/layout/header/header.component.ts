import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatBadgeModule } from '@angular/material/badge';
import { MatMenuModule } from '@angular/material/menu';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';
import { LayoutService } from '../../core/services/layout.service';

interface NotificationItem {
  id: string;
  title: string;
  description: string;
  time: string;
  icon: string;
  type: 'success' | 'warning' | 'info' | 'danger';
  unread: boolean;
}

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatIconModule,
    MatBadgeModule,
    MatMenuModule,
    MatButtonModule,
    MatDividerModule
  ],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss'
})
export class HeaderComponent {
  private auth = inject(AuthService);
  private notification = inject(NotificationService);
  protected layoutService = inject(LayoutService);

  notifications = signal<NotificationItem[]>([
    {
      id: '1',
      title: 'Salary Credited',
      description: '₹ 45,000 credited to your primary savings account.',
      time: '14 Oct',
      icon: 'work',
      type: 'success',
      unread: true
    },
    {
      id: '2',
      title: 'Card Payment Due',
      description: 'Your credit card bill of ₹ 18,750 is due in 3 days.',
      time: '12 Oct',
      icon: 'credit_card',
      type: 'warning',
      unread: true
    },
    {
      id: '3',
      title: 'Loan EMI Reminder',
      description: 'Your Home Loan EMI of ₹ 18,750 is due on 25 Nov.',
      time: '10 Oct',
      icon: 'monetization_on',
      type: 'info',
      unread: true
    },
    {
      id: '4',
      title: 'Security Alert',
      description: 'New login detected from Pune, Maharashtra (Chrome/Win).',
      time: '09 Oct',
      icon: 'shield',
      type: 'danger',
      unread: false
    }
  ]);

  unreadCount = signal(3);

  userName(): string {
    return this.auth.currentUser()?.name || 'Arjun';
  }

  userEmail(): string {
    return this.auth.currentUser()?.email || 'arjun@gmail.com';
  }

  userInitials(): string {
    const name = this.userName();
    const parts = name.split(' ');
    if (parts.length > 1) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }

  markAllAsRead(): void {
    this.notifications.update(items => items.map(item => ({ ...item, unread: false })));
    this.unreadCount.set(0);
    this.notification.success('All notifications marked as read.');
  }

  markAsRead(item: NotificationItem): void {
    if (item.unread) {
      this.notifications.update(items =>
        items.map(i => (i.id === item.id ? { ...i, unread: false } : i))
      );
      this.unreadCount.update(c => Math.max(0, c - 1));
    }
  }

  clearNotifications(): void {
    this.notifications.set([]);
    this.unreadCount.set(0);
    this.notification.info('Notifications cleared.');
  }

  openHelp(): void {
    this.notification.info('FinEase Microservices: Accounts (8080), Cards (9000), Loans (8090), Gateway (8072)');
  }

  isAdmin = this.auth.isAdmin;
  isManager = this.auth.isManager;
  primaryRole = computed(() => this.auth.userRoles()[0] || 'USER');

  switchRole(role: 'ADMIN' | 'MANAGER' | 'USER'): void {
    const user = this.auth.currentUser();
    this.auth.setMockSession(role, user?.name, user?.email, user?.mobileNumber);
    this.notification.success(`Switched active persona to ${role}`);
  }

  logout(): void {
    this.auth.logout();
  }
}
