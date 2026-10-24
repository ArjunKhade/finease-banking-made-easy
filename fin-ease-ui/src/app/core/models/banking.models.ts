export interface AccountsDto {
  accountNumber?: number;
  accountType: string;
  branchAddress: string;
  balance?: number;
}

export interface CustomerDto {
  name: string;
  email: string;
  mobileNumber: string;
  accountsDto?: AccountsDto;
}

export interface CardsDto {
  cardNumber?: string;
  cardType: string;
  mobileNumber: string;
  totalLimit?: number;
  amountUsed?: number;
  availableAmount?: number;
  expiryDate?: string;
  cvv?: string;
  cardHolder?: string;
  status?: 'Active' | 'Blocked' | 'Inactive';
  isInternationalEnabled?: boolean;
  isOnlineEnabled?: boolean;
}

export interface LoansDto {
  loanNumber?: string;
  loanType: string;
  mobileNumber: string;
  totalLoan: number;
  amountPaid: number;
  outstandingAmount: number;
  emi?: number;
  nextDueDate?: string;
  tenureYears?: number;
  interestRate?: number;
}

export interface CustomerDetailsDto {
  name: string;
  email: string;
  mobileNumber: string;
  accountsDto?: AccountsDto;
  loansDto?: LoansDto;
  cardsDto?: CardsDto;
}

export interface ResponseDto {
  statusCode: string;
  statusMessage: string;
}

export interface Transaction {
  id: string;
  title: string;
  subtitle: string;
  category: 'transfer' | 'salary' | 'shopping' | 'atm' | 'bill';
  amount: number;
  type: 'credit' | 'debit';
  date: string;
  status: 'Completed' | 'Pending' | 'Failed';
}

export interface UserSession {
  name: string;
  email: string;
  mobileNumber: string;
  token?: string;
}
