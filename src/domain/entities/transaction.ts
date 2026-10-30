export type TransactionType = 'INCOME' | 'EXPENSE' | 'TRANSFER';
export type TransactionStatus = 'PENDING' | 'PAID' | 'RECONCILED';

export interface Transaction {
  id: string;
  amountCents: integer; // integer (cents)
  date: Date;
  description?: string;
  accountId: string;
  categoryId?: string; // nullable for transfers?
  type: TransactionType;
  status: TransactionStatus;
  tags: string[];
  attachmentPath?: string;
  recurrenceId?: string;
  createdAt: Date;
}

// Helper type for integer (cents)
type integer = number;
