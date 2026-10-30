export type TransactionType = 'INCOME' | 'EXPENSE';

export interface Category {
  id: string;
  name: string;
  group?: string; // e.g., HOUSING, FOOD, TRANSPORT
  icon?: string;
  color?: string;
  type: TransactionType;
  parentId?: string;
  createdAt: Date;
}
