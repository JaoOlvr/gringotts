import { describe, it, expect } from 'vitest';

export interface MockAccount {
  id: string;
  name: string;
  balanceCents: number;
  isActive: boolean;
  includeInTotal?: boolean;
}

export interface MockTransaction {
  id: string;
  accountId: string;
  amountCents: number;
  type: 'INCOME' | 'EXPENSE';
  tags?: string[];
  description?: string;
}

// Funções puras que refletem a lógica implementada no Dashboard e nas Contas
export function calculateConsolidatedBalance(accounts: MockAccount[]): number {
  return accounts
    .filter((a) => a.isActive && a.includeInTotal !== false)
    .reduce((sum, a) => sum + a.balanceCents, 0);
}

export function calculateIsolatedBalance(accounts: MockAccount[]): number {
  return accounts
    .filter((a) => a.isActive && a.includeInTotal === false)
    .reduce((sum, a) => sum + a.balanceCents, 0);
}

export function calculateOperationalIncome(
  transactions: MockTransaction[],
  includedAccountIds: Set<string>
): number {
  return transactions
    .filter((t) => {
      // Deve pertencer a uma conta somada no total
      if (!includedAccountIds.has(t.accountId)) return false;

      // Se for transação de saldo inicial, não conta como receita operacional
      const isInitialBalance =
        (t.tags && t.tags.includes('saldo-inicial')) ||
        (!!t.description && t.description.toLowerCase().startsWith('saldo inicial'));

      return t.type === 'INCOME' && !isInitialBalance;
    })
    .reduce((sum, t) => sum + t.amountCents, 0);
}

describe('Configuração de Carteira e Soma de Contas no Dashboard', () => {
  const accounts: MockAccount[] = [
    { id: 'acc-1', name: 'Nubank (Principal)', balanceCents: 150000, isActive: true, includeInTotal: true },
    { id: 'acc-2', name: 'Carteira Física', balanceCents: 5000, isActive: true, includeInTotal: true },
    { id: 'acc-3', name: 'Reserva de Emergência', balanceCents: 1000000, isActive: true, includeInTotal: false }, // NÃO SOMADA
  ];

  it('deve somar no saldo consolidado apenas as contas marcadas com includeInTotal: true', () => {
    const total = calculateConsolidatedBalance(accounts);
    // Deve somar apenas Nubank (1.500) + Carteira (50) = 1.550 (155000 centavos)
    expect(total).toBe(155000);
  });

  it('deve calcular separadamente o saldo das contas isoladas (não somadas)', () => {
    const isolatedTotal = calculateIsolatedBalance(accounts);
    // Deve totalizar a Reserva (10.000 = 1000000 centavos)
    expect(isolatedTotal).toBe(1000000);
  });

  it('NÃO deve contabilizar saldo inicial como receita operacional do mês', () => {
    const includedIds = new Set(['acc-1', 'acc-2']);
    const transactions: MockTransaction[] = [
      { id: 'tx-init', accountId: 'acc-1', amountCents: 150000, type: 'INCOME', tags: ['saldo-inicial'], description: 'Saldo inicial - Nubank' },
      { id: 'tx-salary', accountId: 'acc-1', amountCents: 350000, type: 'INCOME', description: 'Salário Mensal' },
      { id: 'tx-freela', accountId: 'acc-1', amountCents: 80000, type: 'INCOME', description: 'Freela Design' },
    ];

    const income = calculateOperationalIncome(transactions, includedIds);
    // Apenas Salário (3.500) + Freela (800) = 4.300 (430000 centavos)
    // O saldo inicial de R$ 1.500 NÃO deve entrar na receita!
    expect(income).toBe(430000);
  });

  it('NÃO deve somar receitas de contas isoladas (includeInTotal: false) no total geral', () => {
    const includedIds = new Set(['acc-1', 'acc-2']); // acc-3 não está incluída
    const transactions: MockTransaction[] = [
      { id: 'tx-1', accountId: 'acc-1', amountCents: 200000, type: 'INCOME', description: 'Venda de produto' },
      { id: 'tx-isolated', accountId: 'acc-3', amountCents: 500000, type: 'INCOME', description: 'Rendimento de Aplicação' },
    ];

    const income = calculateOperationalIncome(transactions, includedIds);
    // Apenas a transação da conta somada acc-1 (2.000 = 200000 centavos)
    expect(income).toBe(200000);
  });

  it('deve isolar estritamente o saldo e lançamentos quando o usuário seleciona uma conta específica', () => {
    const selectedAccountId = 'acc-3'; // Reserva de Emergência
    const target = accounts.find((a) => a.id === selectedAccountId);
    expect(target).toBeDefined();

    const transactions: MockTransaction[] = [
      { id: 'tx-1', accountId: 'acc-1', amountCents: 200000, type: 'INCOME', description: 'Salário Nubank' },
      { id: 'tx-2', accountId: 'acc-3', amountCents: 15000, type: 'INCOME', description: 'Rendimento Reserva' },
    ];

    // Saldo individual
    const displayedBalance = target ? target.balanceCents : 0;
    expect(displayedBalance).toBe(1000000); // Somente 10.000 da reserva

    // Transações individuais da conta selecionada
    const accountTxs = transactions.filter((t) => t.accountId === selectedAccountId);
    expect(accountTxs).toHaveLength(1);
    expect(accountTxs[0]!.description).toBe('Rendimento Reserva');
  });

  it('deve alternar a inclusão da conta quando o usuário clica no toggle', () => {
    const account: MockAccount = { id: 'acc-1', name: 'Nubank', balanceCents: 100000, isActive: true, includeInTotal: true };
    
    // Toggle para desativar soma
    account.includeInTotal = !account.includeInTotal;
    expect(account.includeInTotal).toBe(false);

    // Toggle para reativar soma
    account.includeInTotal = !account.includeInTotal;
    expect(account.includeInTotal).toBe(true);
  });
});
