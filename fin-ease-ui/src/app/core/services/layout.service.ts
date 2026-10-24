import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class LayoutService {
  readonly isMobileNavOpen = signal<boolean>(false);

  toggleMobileNav(): void {
    this.isMobileNavOpen.update(v => !v);
  }

  closeMobileNav(): void {
    this.isMobileNavOpen.set(false);
  }

  openMobileNav(): void {
    this.isMobileNavOpen.set(true);
  }
}
