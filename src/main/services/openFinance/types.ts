export type StatementType = 'OFX' | 'OPEN_FINANCE_JSON' | 'CSV';

export interface ParsedStatementTransaction {
  id: string; // ID temporário gerado para a interface
  fitid?: string; // ID único atribuído pelo banco (Financial Institution Transaction ID)
  date: string; // ISO date string "YYYY-MM-DD"
  rawDate: string; // Data original do extrato
  amountCents: number; // Valor em centavos (positivo para receita, negativo para despesa no extrato)
  absAmountCents: number; // Valor absoluto em centavos
  type: 'INCOME' | 'EXPENSE';
  description: string;
  memo?: string;
  payeeName?: string;
  suggestedCategoryId?: string;
  suggestedCategoryName?: string;
  isDuplicate?: boolean;
  duplicateReason?: string;
  selected?: boolean; // Se o usuário selecionou para importar
}

export interface ParsedStatement {
  bankId?: string; // Código COMPE (ex: "260" Nubank, "077" Inter, "341" Itaú)
  bankName?: string; // Nome da instituição (ex: "Nu Pagamentos S.A.")
  accountNumber?: string;
  accountType?: 'checking' | 'savings' | 'credit_card';
  currency: string;
  startDate?: string;
  endDate?: string;
  ledgerBalanceCents?: number; // Saldo do extrato
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

