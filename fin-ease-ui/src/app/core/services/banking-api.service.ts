import { Injectable, signal } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import {
  AccountsDto,
  CardsDto,
  CustomerDetailsDto,
  CustomerDto,
  LoansDto,
  ResponseDto,
  Transaction
} from '../models/banking.models';

interface UserBankingStore {
  accounts: AccountsDto[];
  cards: CardsDto[];
  loans: LoansDto[];
  transactions: Transaction[];
}

@Injectable({
  providedIn: 'root'
})
export class BankingApiService {
  // Route requests via Spring Cloud Gateway (Port 8072) with OAuth2 JWT Bearer relay
  private readonly GATEWAY_BASE = 'http://localhost:8072/eazybank';
  private readonly ACCOUNTS_URL = `${this.GATEWAY_BASE}/accounts/api`;
  private readonly CARDS_URL = `${this.GATEWAY_BASE}/cards/api`;
  private readonly LOANS_URL = `${this.GATEWAY_BASE}/loans/api`;

  // Dynamic signals for the current user session (starts empty for clean dynamic state)
  accountsList = signal<AccountsDto[]>([]);
  cardsList = signal<CardsDto[]>([]);
  loansList = signal<LoansDto[]>([]);
  transactionsList = signal<Transaction[]>([]);
  isLoading = signal<boolean>(false);

  // Tracks which mobile number is currently loaded in memory
  private currentMobile: string | null = null;

  constructor(private http: HttpClient) {}

  private getStorageKey(mobileNumber: string): string {
    return `finease_banking_${mobileNumber}`;
  }

  getCurrentMobile(): string | null {
    return this.currentMobile;
  }

  private saveToStorage(mobileNumber: string): void {
    if (typeof window === 'undefined' || !mobileNumber) return;
    const data: UserBankingStore = {
      accounts: this.accountsList(),
      cards: this.cardsList(),
      loans: this.loansList(),
      transactions: this.transactionsList()
    };
    localStorage.setItem(this.getStorageKey(mobileNumber), JSON.stringify(data));
  }

  private loadFromStorage(mobileNumber: string): boolean {
    if (typeof window === 'undefined' || !mobileNumber) return false;
    const raw = localStorage.getItem(this.getStorageKey(mobileNumber));
    if (raw) {
      try {
        const data: UserBankingStore = JSON.parse(raw);
        this.accountsList.set(data.accounts || []);
        this.cardsList.set(data.cards || []);
        this.loansList.set(data.loans || []);
        this.transactionsList.set(data.transactions || []);
        return true;
      } catch {
        return false;
      }
    }
    return false;
  }

  /**
   * Initializes banking data for the specified user mobile number.
   * Restores user-specific stored data, and synchronizes with microservices.
   */
  loadUserBankingData(mobileNumber: string, user?: { name?: string; email?: string }): Observable<CustomerDetailsDto | null> {
    if (!mobileNumber) {
      this.clearData();
      return of(null);
    }

    this.currentMobile = mobileNumber;
    this.isLoading.set(true);

    // 1. Try loading user-specific cache
    const hasCached = this.loadFromStorage(mobileNumber);

    // If demo customer (9765432100 or 9876543212) has no storage yet, seed initial account so it's ready for interactive demo
    if (!hasCached && (mobileNumber === '9765432100' || mobileNumber === '9876543212')) {
      const demoAcc: AccountsDto = {
        accountNumber: 3454433243,
        accountType: 'Savings Account',
        branchAddress: 'Pune Main Branch',
        balance: 50000.00
      };
      const demoCard: CardsDto = {
        cardNumber: '4532789012345678',
        cardType: 'Debit Card',
        mobileNumber: mobileNumber,
        totalLimit: 100000,
        amountUsed: 0,
        availableAmount: 100000,
        expiryDate: '12/29',
        cardHolder: user?.name || 'Rahul Deshmukh',
        status: 'Active',
        isInternationalEnabled: true,
        isOnlineEnabled: true
      };
      const demoLoan: LoansDto = {
        loanNumber: '100456789012',
        loanType: 'Home Loan',
        mobileNumber: mobileNumber,
        totalLoan: 2500000,
        amountPaid: 500000,
        outstandingAmount: 2000000
      };
      const demoTxn: Transaction = {
        id: 'TXN-1001',
        title: 'Account Opening Deposit',
        subtitle: 'Initial Welcome Balance',
        category: 'transfer',
        amount: 50000,
        type: 'credit',
        date: 'Today',
        status: 'Completed'
      };
      this.accountsList.set([demoAcc]);
      this.cardsList.set([demoCard]);
      this.loansList.set([demoLoan]);
      this.transactionsList.set([demoTxn]);
      this.saveToStorage(mobileNumber);
    } else if (!hasCached) {
      // New user starts clean with 0 accounts, 0 cards, 0 loans
      this.accountsList.set([]);
      this.cardsList.set([]);
      this.loansList.set([]);
      this.transactionsList.set([]);
    }

    // 2. Fetch live data from backend microservice
    return this.fetchCustomerDetails(mobileNumber).pipe(
      tap(() => this.isLoading.set(false)),
      catchError(() => {
        this.isLoading.set(false);
        return of(null);
      })
    );
  }

  // ===================== ACCOUNTS =====================

  createAccount(customer: CustomerDto): Observable<ResponseDto> {
    const mobile = customer.mobileNumber;
    return this.http.post<ResponseDto>(`${this.ACCOUNTS_URL}/create`, customer).pipe(
      tap(() => {
        const openingBalance = customer.accountsDto?.balance ?? 0.00;
        const newAcc: AccountsDto = {
          accountNumber: Math.floor(1000000000 + Math.random() * 9000000000),
          accountType: customer.accountsDto?.accountType || 'Savings Account',
          branchAddress: customer.accountsDto?.branchAddress || 'Main Branch',
          balance: openingBalance
        };

        const newTxn: Transaction = {
          id: `TXN-${Math.floor(1000 + Math.random() * 9000)}`,
          title: 'Account Opening Deposit',
          subtitle: `${newAcc.accountType} Opening Credit`,
          category: 'transfer',
          amount: openingBalance,
          type: 'credit',
          date: 'Just now',
          status: 'Completed'
        };

        if (this.currentMobile !== mobile) {
          this.currentMobile = mobile;
          this.accountsList.set([newAcc]);
          this.transactionsList.set([newTxn]);
          this.cardsList.set([]);
          this.loansList.set([]);
        } else {
          this.accountsList.update(list => [newAcc, ...list]);
          this.transactionsList.update(txns => [newTxn, ...txns]);
        }
        this.saveToStorage(mobile);
      }),
      catchError(err => {
        // If the backend microservice returned a business error (e.g. 400 Customer already exists),
        // propagate it so components can surface the exact message to the user!
        if (err && err.status === 400) {
          throw err;
        }

        // Fallback for offline mode (backend service completely unreachable): dynamically create account locally
        const openingBalance = customer.accountsDto?.balance ?? 0.00;
        const newAcc: AccountsDto = {
          accountNumber: Math.floor(1000000000 + Math.random() * 9000000000),
          accountType: customer.accountsDto?.accountType || 'Savings Account',
          branchAddress: customer.accountsDto?.branchAddress || 'Main Branch',
          balance: openingBalance
        };

        const newTxn: Transaction = {
          id: `TXN-${Math.floor(1000 + Math.random() * 9000)}`,
          title: 'Account Opening Deposit',
          subtitle: `${newAcc.accountType} Opening Credit`,
          category: 'transfer',
          amount: openingBalance,
          type: 'credit',
          date: 'Just now',
          status: 'Completed'
        };

        if (this.currentMobile !== mobile) {
          this.currentMobile = mobile;
          this.accountsList.set([newAcc]);
          this.transactionsList.set([newTxn]);
          this.cardsList.set([]);
          this.loansList.set([]);
        } else {
          this.accountsList.update(list => [newAcc, ...list]);
          this.transactionsList.update(txns => [newTxn, ...txns]);
        }
        this.saveToStorage(mobile);
        return of({ statusCode: '201', statusMessage: 'Account created successfully' });
      })
    );
  }

  fetchAccount(mobileNumber: string): Observable<CustomerDto | null> {
    return this.http.get<CustomerDto>(`${this.ACCOUNTS_URL}/fetch`, {
      params: { mobileNumber }
    }).pipe(
      catchError(() => of(null))
    );
  }

  fetchCustomerDetails(mobileNumber: string): Observable<CustomerDetailsDto | null> {
    const headers = new HttpHeaders({
      'eazybank-correlation-id': `fe-${Date.now()}`
    });

    return this.http.get<CustomerDetailsDto>(`${this.ACCOUNTS_URL}/fetchCustomerDetails`, {
      headers,
      params: { mobileNumber }
    }).pipe(
      tap(details => {
        if (!details) return;

        if (details.accountsDto) {
          const currentBal = this.accountsList()[0]?.balance;
          const resolvedBalance = (details.accountsDto.balance !== null && details.accountsDto.balance !== undefined)
            ? details.accountsDto.balance
            : (currentBal ?? 0.00);

          const acc: AccountsDto = {
            ...details.accountsDto,
            balance: resolvedBalance
          };
          this.accountsList.set([acc]);
        }

        if (details.cardsDto) {
          const card: CardsDto = {
            ...details.cardsDto,
            cardHolder: details.name || 'Card Holder',
            expiryDate: details.cardsDto.expiryDate || '12/29',
            status: 'Active',
            isInternationalEnabled: true,
            isOnlineEnabled: true
          };
          this.cardsList.set([card]);
        }

        if (details.loansDto) {
          const total = details.loansDto.totalLoan || 100000;
          const loan: LoansDto = {
            ...details.loansDto,
            emi: details.loansDto.emi || Math.round(total * 0.024),
            nextDueDate: details.loansDto.nextDueDate || '25 Nov 2026',
            tenureYears: details.loansDto.tenureYears || 5,
            interestRate: details.loansDto.interestRate || 9.5
          };
          this.loansList.set([loan]);
        }

        // If no transactions yet, record welcome opening transaction matching the actual deposit
        if (this.transactionsList().length === 0 && details.accountsDto) {
          const currentBal = this.accountsList()[0]?.balance;
          const resolvedBalance = (details.accountsDto.balance !== null && details.accountsDto.balance !== undefined)
            ? details.accountsDto.balance
            : (currentBal ?? 0.00);

          if (resolvedBalance > 0) {
            const initTxn: Transaction = {
              id: 'TXN-1001',
              title: 'Account Opening Deposit',
              subtitle: `${details.accountsDto.accountType || 'Savings'} Opening Credit`,
              category: 'transfer',
              amount: resolvedBalance,
              type: 'credit',
              date: 'Just now',
              status: 'Completed'
            };
            this.transactionsList.set([initTxn]);
          }
        }

        this.saveToStorage(mobileNumber);
      }),
      catchError(err => {
        return of(null);
      })
    );
  }

  // ===================== CARDS =====================

  createCard(mobileNumber: string, cardType: string = 'Credit Card', cardHolder: string = 'Card Holder'): Observable<ResponseDto> {
    return this.http.post<ResponseDto>(`${this.CARDS_URL}/create`, null, {
      params: { mobileNumber }
    }).pipe(
      tap(() => {
        const isCredit = cardType.toLowerCase().includes('credit');
        const limit = isCredit ? 150000 : 50000;
        const randomCard = '4' + Math.floor(100000000000000 + Math.random() * 900000000000000).toString();
        const expYear = (new Date().getFullYear() + 4).toString().slice(-2);

        const newCard: CardsDto = {
          cardNumber: randomCard,
          cardType,
          mobileNumber,
          totalLimit: limit,
          amountUsed: 0,
          availableAmount: limit,
          expiryDate: `12/${expYear}`,
          cardHolder,
          status: 'Active',
          isInternationalEnabled: false,
          isOnlineEnabled: true
        };
        this.cardsList.update(list => [...list, newCard]);
        this.saveToStorage(mobileNumber);
      }),
      catchError(err => {
        if (err && err.status === 400) {
          throw err;
        }
        const isCredit = cardType.toLowerCase().includes('credit');
        const limit = isCredit ? 150000 : 50000;
        const randomCard = '4' + Math.floor(100000000000000 + Math.random() * 900000000000000).toString();
        const expYear = (new Date().getFullYear() + 4).toString().slice(-2);

        const newCard: CardsDto = {
          cardNumber: randomCard,
          cardType,
          mobileNumber,
          totalLimit: limit,
          amountUsed: 0,
          availableAmount: limit,
          expiryDate: `12/${expYear}`,
          cardHolder,
          status: 'Active',
          isInternationalEnabled: false,
          isOnlineEnabled: true
        };
        this.cardsList.update(list => [...list, newCard]);
        this.saveToStorage(mobileNumber);
        return of({ statusCode: '201', statusMessage: 'Card created successfully' });
      })
    );
  }

  fetchCard(mobileNumber: string): Observable<CardsDto | null> {
    return this.http.get<CardsDto>(`${this.CARDS_URL}/fetch`, {
      params: { mobileNumber }
    }).pipe(
      catchError(() => of(this.cardsList()[0] || null))
    );
  }

  // ===================== LOANS =====================

  createLoan(mobileNumber: string, loanType: string = 'Personal Loan', amount: number = 200000): Observable<ResponseDto> {
    return this.http.post<ResponseDto>(`${this.LOANS_URL}/create`, null, {
      params: { mobileNumber }
    }).pipe(
      tap(() => {
        const randomLoanNo = Math.floor(100000000000 + Math.random() * 900000000000).toString();
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 30);
        const formattedDueDate = dueDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

        const newLoan: LoansDto = {
          loanNumber: randomLoanNo,
          loanType,
          mobileNumber,
          totalLoan: amount,
          amountPaid: 0,
          outstandingAmount: amount,
          emi: Math.round(amount * 0.024),
          nextDueDate: formattedDueDate,
          tenureYears: 5,
          interestRate: 9.5
        };
        this.loansList.update(list => [...list, newLoan]);
        this.saveToStorage(mobileNumber);
      }),
      catchError(err => {
        if (err && err.status === 400) {
          throw err;
        }
        const randomLoanNo = Math.floor(100000000000 + Math.random() * 900000000000).toString();
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 30);
        const formattedDueDate = dueDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

        const newLoan: LoansDto = {
          loanNumber: randomLoanNo,
          loanType,
          mobileNumber,
          totalLoan: amount,
          amountPaid: 0,
          outstandingAmount: amount,
          emi: Math.round(amount * 0.024),
          nextDueDate: formattedDueDate,
          tenureYears: 5,
          interestRate: 9.5
        };
        this.loansList.update(list => [...list, newLoan]);
        this.saveToStorage(mobileNumber);
        return of({ statusCode: '201', statusMessage: 'Loan application submitted successfully' });
      })
    );
  }

  fetchLoan(mobileNumber: string): Observable<LoansDto | null> {
    return this.http.get<LoansDto>(`${this.LOANS_URL}/fetch`, {
      params: { mobileNumber }
    }).pipe(
      catchError(() => of(this.loansList()[0] || null))
    );
  }

  // Toggle card security features
  toggleCardSetting(cardNumber: string, field: 'isInternationalEnabled' | 'isOnlineEnabled' | 'status'): void {
    this.cardsList.update(cards =>
      cards.map(card => {
        if (card.cardNumber === cardNumber) {
          if (field === 'status') {
            const nextStatus = card.status === 'Active' ? 'Blocked' : 'Active';
            return { ...card, status: nextStatus };
          }
          return { ...card, [field]: !card[field] };
        }
        return card;
      })
    );
    if (this.currentMobile) {
      this.saveToStorage(this.currentMobile);
    }
  }

  clearData(): void {
    this.currentMobile = null;
    this.accountsList.set([]);
    this.cardsList.set([]);
    this.loansList.set([]);
    this.transactionsList.set([]);
    this.isLoading.set(false);
  }
}
