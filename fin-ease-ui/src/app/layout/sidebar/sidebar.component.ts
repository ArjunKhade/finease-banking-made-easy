import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../core/services/auth.service';
import { LayoutService } from '../../core/services/layout.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule, MatIconModule],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss'
})
export class SidebarComponent {
  private auth = inject(AuthService);
  protected layoutService = inject(LayoutService);
  isAdmin = this.auth.isAdmin;

  onNavClick(): void {
    if (window.innerWidth <= 992) {
      this.layoutService.closeMobileNav();
    }
  }

  onLogout(): void {
    this.auth.logout();
  }
}
