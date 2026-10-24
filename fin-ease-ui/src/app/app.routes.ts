import { Routes } from '@angular/router';
import { LoginComponent } from './features/auth/login/login.component';
import { SignupComponent } from './features/auth/signup/signup.component';
import { MainLayoutComponent } from './layout/main-layout/main-layout.component';
import { DashboardComponent } from './features/dashboard/dashboard.component';
import { AccountsComponent } from './features/accounts/accounts.component';
import { CardsComponent } from './features/cards/cards.component';
import { LoansComponent } from './features/loans/loans.component';
import { TransactionsComponent } from './features/transactions/transactions.component';
import { ProfileComponent } from './features/profile/profile.component';
import { AdminComponent } from './features/admin/admin.component';
import { authGuard, guestGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';

export const routes: Routes = [
  {
    path: 'login',
    component: LoginComponent,
    canActivate: [guestGuard],
    title: 'Sign In - FinEase'
  },
  {
    path: 'signup',
    component: SignupComponent,
    canActivate: [guestGuard],
    title: 'Open Account - FinEase'
  },
  {
    path: '',
    component: MainLayoutComponent,
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: DashboardComponent, title: 'Dashboard - FinEase' },
      { path: 'accounts', component: AccountsComponent, title: 'Accounts - FinEase' },
      { path: 'cards', component: CardsComponent, title: 'Cards - FinEase' },
      { path: 'loans', component: LoansComponent, title: 'Loans - FinEase' },
      { path: 'transactions', component: TransactionsComponent, title: 'Transactions - FinEase' },
      { path: 'profile', component: ProfileComponent, title: 'Profile - FinEase' },
      {
        path: 'admin',
        component: AdminComponent,
        canActivate: [roleGuard(['ADMIN'])],
        title: 'IAM Admin - FinEase'
      }
    ]
  },
  { path: '**', redirectTo: 'dashboard' }
];
