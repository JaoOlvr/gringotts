export type AccountType = 
  | 'checking'
  | 'savings'
  | 'credit_card'
  | 'cash'
  | 'investment'
  | 'loan';

export type LockType = 'PIN' | 'PASSWORD';

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  balanceCents: number;
  currency: string;
  color?: string;
  icon?: string;
  isActive: boolean;
  includeInTotal?: boolean;
  isLocked?: boolean;
  lockType?: LockType;
  createdAt: Date;
  updatedAt: Date;
}

export type CategoryType = 'INCOME' | 'EXPENSE';

export interface Category {
  id: string;
  name: string;
  group?: string;
  icon?: string;
  color?: string;
  type: CategoryType;
  parentId?: string;
  createdAt: Date;
}

export type TransactionType = 'INCOME' | 'EXPENSE' | 'TRANSFER';
export type TransactionStatus = 'PENDING' | 'PAID' | 'RECONCILED';

export interface Transaction {
  id: string;
  amountCents: number;
  date: Date;
  description?: string;
  accountId: string;
  categoryId?: string;
  type: TransactionType;
  status: TransactionStatus;
  tags: string[];
  attachmentPath?: string;
  recurrenceId?: string;
  createdAt: Date;
}

export interface Budget {
  id: string;
  categoryId: string;
  amountCents: number;
  month: number;
  year: number;
  createdAt: Date;
}

export interface Goal {
  id: string;
  name: string;
  targetAmountCents: number;
  currentAmountCents: number;
  deadline: Date | null;
  color?: string;
  createdAt: Date;
}

export type StatementType = 'OFX' | 'OPEN_FINANCE_JSON' | 'CSV';

export interface ParsedStatementTransaction {
  id: string;
  fitid?: string;
  date: string; // "YYYY-MM-DD"
  rawDate: string;
  amountCents: number;
  absAmountCents: number;
  type: 'INCOME' | 'EXPENSE';
  description: string;
  memo?: string;
  payeeName?: string;
  suggestedCategoryId?: string;
  suggestedCategoryName?: string;
  isDuplicate?: boolean;
  duplicateReason?: string;
  selected?: boolean;
}

export interface ParsedStatement {
  bankId?: string;
  bankName?: string;
  accountNumber?: string;
  accountType?: 'checking' | 'savings' | 'credit_card';
  currency: string;
  startDate?: string;
  endDate?: string;
  ledgerBalanceCents?: number;
  balanceDate?: string;
  transactions: ParsedStatementTransaction[];
  totalIncomeCents: number;
  totalExpenseCents: number;
  statementType: StatementType;
}

export interface ImportTransactionsParams {
  accountId: string;
  transactions: Array<{
    amountCents: number;
    date: string;
    description: string;
    type: 'INCOME' | 'EXPENSE';
    categoryId?: string;
    fitid?: string;
    status?: 'PAID' | 'PENDING' | 'RECONCILED';
  }>;
  updateAccountBalance?: boolean;
}

export interface ImportTransactionsResult {
  importedCount: number;
  skippedCount: number;
  newAccountBalanceCents?: number;
}

