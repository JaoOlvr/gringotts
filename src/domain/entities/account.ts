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
  balanceCents: integer; // We'll use number but store as integer cents
  currency: string;
  color?: string;
  icon?: string;
  isActive: boolean;
  isLocked?: boolean;
  lockType?: LockType;
  createdAt: Date;
  updatedAt: Date;
}

// Helper type to ensure integer (though TypeScript doesn't have integer type, we'll use number and treat as integer)
type integer = number;
