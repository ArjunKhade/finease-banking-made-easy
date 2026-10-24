import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { MatCardModule } from '@angular/material/card';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';
import { UserRole } from '../../core/models/auth.models';

interface ManagedUser {
  id: string;
  name: string;
  email: string;
  mobile: string;
  role: UserRole;
  status: 'Active' | 'Locked' | 'Pending';
}

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatChipsModule,
    MatCardModule,
    MatSelectModule,
    MatFormFieldModule
  ],
  templateUrl: './admin.component.html',
  styleUrl: './admin.component.scss'
})
export class AdminComponent {
  private readonly auth = inject(AuthService);
  private readonly notification = inject(NotificationService);

  displayedColumns: string[] = ['name', 'mobile', 'role', 'status', 'actions'];

  users = signal<ManagedUser[]>([
    {
      id: 'kc-usr-001',
      name: 'Arjun Khade',
      email: 'arjun@gmail.com',
      mobile: '8788225355',
      role: 'ADMIN',
      status: 'Active'
    },
    {
      id: 'kc-usr-002',
      name: 'Priya Sharma',
      email: 'priya.manager@bank.com',
      mobile: '9822012345',
      role: 'MANAGER',
      status: 'Active'
    },
    {
      id: 'kc-usr-003',
      name: 'Rahul Deshmukh',
      email: 'rahul.d@bank.com',
      mobile: '9765432100',
      role: 'USER',
      status: 'Active'
    },
    {
      id: 'kc-usr-004',
      name: 'Sneha Patel',
      email: 'sneha.patel@bank.com',
      mobile: '9123456780',
      role: 'USER',
      status: 'Active'
    }
  ]);

  getInitials(name: string): string {
    const parts = name.split(' ');
    return parts.length > 1 ? (parts[0][0] + parts[1][0]).toUpperCase() : name.slice(0, 2).toUpperCase();
  }

  changeRole(user: ManagedUser, newRole: UserRole): void {
    this.users.update(list =>
      list.map(u => (u.id === user.id ? { ...u, role: newRole } : u))
    );

    // If updating current logged in user, also update session
    if (this.auth.currentUser()?.email === user.email) {
      this.auth.setMockSession(newRole, user.name, user.email, user.mobile);
    }

    this.notification.success(`Assigned role ${newRole} to ${user.name} in Keycloak Realm.`);
  }

  onSyncKeycloak(): void {
    this.notification.info('Synced with Keycloak realm: eazybank');
  }
}
