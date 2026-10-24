import { Injectable } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  constructor(private snackBar: MatSnackBar) {}

  success(message: string, duration: number = 3500): void {
    this.snackBar.open(message, '✕', {
      duration,
      panelClass: ['fe-snackbar', 'fe-snackbar-success'],
      horizontalPosition: 'right',
      verticalPosition: 'bottom'
    });
  }

  error(message: string, duration: number = 5000): void {
    this.snackBar.open(message, '✕', {
      duration,
      panelClass: ['fe-snackbar', 'fe-snackbar-error'],
      horizontalPosition: 'right',
      verticalPosition: 'bottom'
    });
  }

  info(message: string, duration: number = 3000): void {
    this.snackBar.open(message, '✕', {
      duration,
      panelClass: ['fe-snackbar', 'fe-snackbar-info'],
      horizontalPosition: 'right',
      verticalPosition: 'bottom'
    });
  }

  warn(message: string, duration: number = 4000): void {
    this.snackBar.open(message, '✕', {
      duration,
      panelClass: ['fe-snackbar', 'fe-snackbar-warn'],
      horizontalPosition: 'right',
      verticalPosition: 'bottom'
    });
  }
}
