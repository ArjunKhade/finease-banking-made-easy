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

  users = signal<ManagedUser[]>([]);

  constructor() {
    this.refreshUsers();
  }

  async refreshUsers(): Promise<void> {
    try {
      const liveUsers = await this.auth.fetchKeycloakUsers();
      this.renderUsers(liveUsers);
    } catch {
      const fallback = this.auth.getRegisteredUsers();
      this.renderUsers(fallback);
    }
  }

  private renderUsers(registered: any[]): void {
    const mapped: ManagedUser[] = registered.map((u, idx) => ({
      id: u.id || `usr-${idx}`,
      name: u.name,
      email: u.email,
      mobile: u.mobileNumber || 'N/A',
      role: (u.roles && u.roles[0]) === 'USER' ? 'CUSTOMER' : ((u.roles && u.roles[0]) || 'CUSTOMER'),
      status: 'Active'
    }));
    this.users.set(mapped);
  }

  getInitials(name: string): string {
    const parts = name.split(' ');
    return parts.length > 1 ? (parts[0][0] + parts[1][0]).toUpperCase() : name.slice(0, 2).toUpperCase();
  }

  changeRole(user: ManagedUser, newRole: UserRole): void {
    this.auth.updateUserRole(user.id, newRole);
    this.refreshUsers();
    this.notification.success(`Assigned role ${newRole} to ${user.name} in IAM Directory.`);
  }

  async onSyncKeycloak(): Promise<void> {
    await this.refreshUsers();
    this.notification.success('Synced live users from Keycloak IAM Directory.');
  }
}
