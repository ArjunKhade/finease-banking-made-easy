import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatSlideToggleModule
  ],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss'
})
export class ProfileComponent {
  private auth = inject(AuthService);
  private notification = inject(NotificationService);

  user = this.auth.currentUser;

  userInitials(): string {
    const name = this.user()?.name || 'Arjun';
    return name.slice(0, 1).toUpperCase();
  }

  openDetail(section: string): void {
    this.notification.info(`${section} panel opened.`);
  }

  toggleAlerts(): void {
    this.notification.success('Notification preferences updated.');
  }

  onLogout(): void {
    this.auth.logout();
  }
}
