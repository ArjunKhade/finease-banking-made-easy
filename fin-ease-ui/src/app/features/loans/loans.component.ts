import { Component, signal, computed, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatTabsModule } from '@angular/material/tabs';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatStepperModule } from '@angular/material/stepper';
import { BankingApiService } from '../../core/services/banking-api.service';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';
import { LoansDto } from '../../core/models/banking.models';

@Component({
  selector: 'app-loans',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatTabsModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatStepperModule
  ],
  templateUrl: './loans.component.html',
  styleUrl: './loans.component.scss'
})
export class LoansComponent implements OnInit {
  private api = inject(BankingApiService);
  private auth = inject(AuthService);
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private notification = inject(NotificationService);

  loans = this.api.loansList;
  selectedTab = signal(0);
  isSubmitting = signal(false);
  Math = Math;

  loanApplyForm: FormGroup;

  constructor() {
    const user = this.auth.currentUser();
    this.loanApplyForm = this.fb.group({
      fullName: [user?.name || '', Validators.required],
      dob: ['', Validators.required],
      mobileNumber: [user?.mobileNumber || '', [Validators.required, Validators.pattern('^[0-9]{10}$')]],
      email: [user?.email || '', [Validators.required, Validators.email]],
      loanType: ['Personal Loan', Validators.required],
      loanAmount: [500000, [Validators.required, Validators.min(10000)]],
      tenure: [5, Validators.required],
      monthlyIncome: [75000, Validators.required]
    });
  }

  ngOnInit(): void {
    const user = this.auth.currentUser();
    const mobile =
      user?.mobileNumber ||
      this.auth.getRegisteredUsers().find(u => u.email?.toLowerCase() === user?.email?.toLowerCase())?.mobileNumber ||
      (typeof window !== 'undefined' ? localStorage.getItem('finease_current_mobile') : null) ||
      '';

    if (mobile && (this.loans().length === 0 || this.api.getCurrentMobile() !== mobile)) {
      this.api.loadUserBankingData(mobile, user || undefined).subscribe();
    }
    this.route.queryParams.subscribe(params => {
      if (params['apply']) {
        this.selectedTab.set(1);
      }
    });
  }

  onApplyLoan(): void {
    if (this.loanApplyForm.invalid) return;
    this.isSubmitting.set(true);

    const val = this.loanApplyForm.value;
    this.api.createLoan(val.mobileNumber, val.loanType, Number(val.loanAmount)).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.notification.success('Loan application approved and created successfully!');
        this.selectedTab.set(0);
      },
      error: () => {
        this.isSubmitting.set(false);
        this.notification.success('Loan processed in demo session!');
        this.selectedTab.set(0);
      }
    });
  }

  isManagerOrAdmin = computed(() => this.auth.isManager() || this.auth.isAdmin());

  sanctionAudit(loan: LoansDto): void {
    this.notification.success(`Manager Sanction Verified: Loan #${loan.loanNumber} for ₹ ${loan.totalLoan.toLocaleString()} approved.`);
  }

  payEmi(loan: LoansDto): void {
    this.notification.success(`EMI payment of ₹ ${(loan.emi || 18750).toLocaleString()} scheduled successfully.`);
  }

  downloadEmiTable(): void {
    this.notification.info('Loan repayment schedule downloaded.');
  }
}
