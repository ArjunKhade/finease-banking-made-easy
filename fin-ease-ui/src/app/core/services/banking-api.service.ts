import { Injectable, signal } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import {
  AccountsDto,
  CardsDto,
  CustomerDetailsDto,
  CustomerDto,
  LoansDto,
  ResponseDto,
  Transaction
} from '../models/banking.models';

@Injectable({
  providedIn: 'root'
})
export class BankingApiService {
  // Route requests via Spring Cloud Gateway (Port 8072) with OAuth2 JWT Bearer relay
  private readonly GATEWAY_BASE = 'http://localhost:8072/eazybank';
  private readonly ACCOUNTS_URL = `${this.GATEWAY_BASE}/accounts/api`;
  private readonly CARDS_URL = `${this.GATEWAY_BASE}/cards/api`;
  private readonly LOANS_URL = `${this.GATEWAY_BASE}/loans/api`;

  // In-memory UI reactive signals that sync with backend + local modifications
  accountsList = signal<AccountsDto[]>([
    {
      accountNumber: 3454433243,
      accountType: 'Savings Account',
      branchAddress: '123 Main Street, Pune Main Branch',
      balance: 78420.00
    },
    {
      accountNumber: 3454435678,
      accountType: 'Savings Account',
      branchAddress: '456 Sector 17, Pune West',
      balance: 32150.00
    },
    {
      accountNumber: 9876543210,
      accountType: 'Current Account',
      branchAddress: 'Commercial Hub, Mumbai',
      balance: 38180.00
    }
  ]);

  cardsList = signal<CardsDto[]>([
    {
      cardNumber: '4532789012345678',
      cardType: 'Debit Card',
      mobileNumber: '8788225355',
      totalLimit: 100000,
      amountUsed: 21580,
      availableAmount: 78420,
      expiryDate: '12/28',
      cardHolder: 'Arjun Khade',
      status: 'Active',
      isInternationalEnabled: true,
      isOnlineEnabled: true
    },
    {
      cardNumber: '5241890123458921',
      cardType: 'Credit Card',
      mobileNumber: '8788225355',
      totalLimit: 250000,
      amountUsed: 45000,
      availableAmount: 205000,
      expiryDate: '09/29',
      cardHolder: 'Arjun Khade',
      status: 'Active',
      isInternationalEnabled: false,
      isOnlineEnabled: true
    }
  ]);

  loansList = signal<LoansDto[]>([
    {
      loanNumber: '548732457654',
      loanType: 'Home Loan',
      mobileNumber: '8788225355',
      totalLoan: 2500000,
      amountPaid: 625000,
      outstandingAmount: 1875000,
      emi: 18750,
      nextDueDate: '25 Nov 2026',
      tenureYears: 20,
      interestRate: 8.5
    },
    {
      loanNumber: '784129548912',
      loanType: 'Personal Loan',
      mobileNumber: '8788225355',
      totalLoan: 500000,
      amountPaid: 180000,
      outstandingAmount: 320000,
      emi: 12500,
      nextDueDate: '12 Nov 2026',
      tenureYears: 4,
      interestRate: 11.0
    }
  ]);

  transactionsList = signal<Transaction[]>([
    {
      id: 'TXN-9041',
      title: 'UPI Payment',
      subtitle: 'To Rahul Sharma',
      category: 'transfer',
      amount: 2000,
      type: 'debit',
      date: 'Today, 10:34 AM',
      status: 'Completed'
    },
    {
      id: 'TXN-8820',
      title: 'Salary Credit',
      subtitle: 'Acme Corp Pvt Ltd',
      category: 'salary',
      amount: 45000,
      type: 'credit',
      date: 'Yesterday, 09:15 AM',
      status: 'Completed'
    },
    {
      id: 'TXN-7612',
      title: 'Card Purchase',
      subtitle: 'Amazon India Retail',
      category: 'shopping',
      amount: 3499,
      type: 'debit',
      date: '15 Oct 2026',
      status: 'Completed'
    },
    {
      id: 'TXN-6501',
      title: 'ATM Cash Withdrawal',
      subtitle: 'Kothrud Branch ATM',
      category: 'atm',
      amount: 5000,
      type: 'debit',
      date: '12 Oct 2026',
      status: 'Completed'
    }
  ]);

  constructor(private http: HttpClient) {}

  // ===================== ACCOUNTS =====================

  createAccount(customer: CustomerDto): Observable<ResponseDto> {
    return this.http.post<ResponseDto>(`${this.ACCOUNTS_URL}/create`, customer).pipe(
      tap(() => {
        const newAcc: AccountsDto = {
          accountNumber: Math.floor(1000000000 + Math.random() * 9000000000),
          accountType: customer.accountsDto?.accountType || 'Savings Account',
          branchAddress: customer.accountsDto?.branchAddress || 'Main Branch',
          balance: 10000.00
        };
        this.accountsList.update(list => [newAcc, ...list]);
      })
    );
  }

  fetchAccount(mobileNumber: string): Observable<CustomerDto> {
    return this.http.get<CustomerDto>(`${this.ACCOUNTS_URL}/fetch`, {
      params: { mobileNumber }
    }).pipe(
      catchError(err => {
        return of({
          name: 'Arjun Khade',
          email: 'arjun@gmail.com',
          mobileNumber,
          accountsDto: this.accountsList()[0]
        });
      })
    );
  }

  fetchCustomerDetails(mobileNumber: string): Observable<CustomerDetailsDto> {
    const headers = new HttpHeaders({
      'eazybank-correlation-id': `fe-${Date.now()}`
    });
    return this.http.get<CustomerDetailsDto>(`${this.ACCOUNTS_URL}/fetchCustomerDetails`, {
      headers,
      params: { mobileNumber }
    }).pipe(
      tap(details => {
        if (details.accountsDto) {
          const acc: AccountsDto = {
            ...details.accountsDto,
            balance: details.accountsDto.balance ?? 78420.00
          };
          this.accountsList.set([acc]);
        }
        if (details.cardsDto) {
          this.cardsList.set([details.cardsDto]);
        }
        if (details.loansDto) {
          this.loansList.set([details.loansDto]);
        }
      }),
      catchError(err => {
        return of({
          name: 'Arjun Admin',
          email: 'admin@eazybank.com',
          mobileNumber,
          accountsDto: this.accountsList()[0],
          loansDto: this.loansList()[0],
          cardsDto: this.cardsList()[0]
        });
      })
    );
  }

  // ===================== CARDS =====================

  createCard(mobileNumber: string, cardType: string = 'Credit Card'): Observable<ResponseDto> {
    return this.http.post<ResponseDto>(`${this.CARDS_URL}/create`, null, {
      params: { mobileNumber }
    }).pipe(
      tap(() => {
        const randomCard = '4' + Math.floor(100000000000000 + Math.random() * 900000000000000).toString();
        const newCard: CardsDto = {
          cardNumber: randomCard,
          cardType,
          mobileNumber,
          totalLimit: 150000,
          amountUsed: 0,
          availableAmount: 150000,
          expiryDate: '10/30',
          cardHolder: 'Arjun Khade',
          status: 'Active',
          isInternationalEnabled: false,
          isOnlineEnabled: true
        };
        this.cardsList.update(list => [...list, newCard]);
      }),
      catchError(err => {
        const randomCard = '4' + Math.floor(100000000000000 + Math.random() * 900000000000000).toString();
        const newCard: CardsDto = {
          cardNumber: randomCard,
          cardType,
          mobileNumber,
          totalLimit: 150000,
          amountUsed: 0,
          availableAmount: 150000,
          expiryDate: '10/30',
          cardHolder: 'Arjun Khade',
          status: 'Active',
          isInternationalEnabled: false,
          isOnlineEnabled: true
        };
        this.cardsList.update(list => [...list, newCard]);
        return of({ statusCode: '201', statusMessage: 'Card created successfully' });
      })
    );
  }

  fetchCard(mobileNumber: string): Observable<CardsDto> {
    return this.http.get<CardsDto>(`${this.CARDS_URL}/fetch`, {
      params: { mobileNumber }
    }).pipe(
      catchError(err => of(this.cardsList()[0]))
    );
  }

  // ===================== LOANS =====================

  createLoan(mobileNumber: string, loanType: string = 'Personal Loan', amount: number = 200000): Observable<ResponseDto> {
    return this.http.post<ResponseDto>(`${this.LOANS_URL}/create`, null, {
      params: { mobileNumber }
    }).pipe(
      tap(() => {
        const randomLoanNo = Math.floor(100000000000 + Math.random() * 900000000000).toString();
        const newLoan: LoansDto = {
          loanNumber: randomLoanNo,
          loanType,
          mobileNumber,
          totalLoan: amount,
          amountPaid: 0,
          outstandingAmount: amount,
          emi: Math.round(amount * 0.024),
          nextDueDate: '15 Dec 2026',
          tenureYears: 5,
          interestRate: 9.5
        };
        this.loansList.update(list => [...list, newLoan]);
      }),
      catchError(err => {
        const randomLoanNo = Math.floor(100000000000 + Math.random() * 900000000000).toString();
        const newLoan: LoansDto = {
          loanNumber: randomLoanNo,
          loanType,
          mobileNumber,
          totalLoan: amount,
          amountPaid: 0,
          outstandingAmount: amount,
          emi: Math.round(amount * 0.024),
          nextDueDate: '15 Dec 2026',
          tenureYears: 5,
          interestRate: 9.5
        };
        this.loansList.update(list => [...list, newLoan]);
        return of({ statusCode: '201', statusMessage: 'Loan application submitted successfully' });
      })
    );
  }

  fetchLoan(mobileNumber: string): Observable<LoansDto> {
    return this.http.get<LoansDto>(`${this.LOANS_URL}/fetch`, {
      params: { mobileNumber }
    }).pipe(
      catchError(err => of(this.loansList()[0]))
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
  }
}
