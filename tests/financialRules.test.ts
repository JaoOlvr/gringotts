import { describe, it, expect } from 'vitest';

// Regras Financeiras do Domínio Gringotts

export function calculateInstallments(totalCents: number, count: number): number[] {
  if (count <= 0) throw new Error('Número de parcelas deve ser positivo');
  const baseAmount = Math.floor(totalCents / count);
  const remainder = totalCents % count;
  
  const installments: number[] = [];
  for (let i = 0; i < count; i++) {
    // Adiciona 1 centavo nas primeiras parcelas para cobrir o resto
    installments.push(i < remainder ? baseAmount + 1 : baseAmount);
  }
  return installments;
}

export function getNextMonthlyRecurrenceDate(currentDate: Date, interval = 1): Date {
  const result = new Date(currentDate);
  const originalDay = currentDate.getDate();
  
  result.setMonth(result.getMonth() + interval);
  
  // Ajuste para fim de mês (ex: 31 de Jan -> 28 ou 29 de Fev)
  if (result.getDate() !== originalDay) {
    result.setDate(0); // Último dia do mês anterior
  }
  return result;
}

export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
}

export function projectCashFlow(initialBalanceCents: number, scheduledTransactions: Array<{ amountCents: number; type: 'INCOME' | 'EXPENSE' }>): number {
  return scheduledTransactions.reduce((balance, tx) => {
    if (tx.type === 'INCOME') {
      return balance + tx.amountCents;
    } else {
      return balance - Math.abs(tx.amountCents);
    }
  }, initialBalanceCents);
}

export function calculateCreditCardLimit(totalLimitCents: number, currentBillCents: number, pendingTransactionsCents: number): number {
  return Math.max(0, totalLimitCents - currentBillCents - pendingTransactionsCents);
}

describe('Regras Financeiras Essenciais (Gringotts Domain)', () => {
  describe('Divisão e Arredondamento de Parcelas em Centavos', () => {
    it('deve dividir R$ 100,00 em 3 parcelas sem perder nenhum centavo', () => {
      const installments = calculateInstallments(10000, 3);
      expect(installments).toEqual([3334, 3333, 3333]);
      const sum = installments.reduce((a, b) => a + b, 0);
      expect(sum).toBe(10000);
    });

    it('deve dividir R$ 50,00 em 4 parcelas exatas de R$ 12,50', () => {
      const installments = calculateInstallments(5000, 4);
      expect(installments).toEqual([1250, 1250, 1250, 1250]);
      expect(installments.reduce((a, b) => a + b, 0)).toBe(5000);
    });
  });

  describe('Cálculo de Recorrência e Casos de Borda de Calendário', () => {
    it('deve lidar corretamente com avanço de 31 de janeiro para fevereiro em ano bissexto (2024)', () => {
      const jan31 = new Date(2024, 0, 31);
      const nextDate = getNextMonthlyRecurrenceDate(jan31, 1);
      expect(nextDate.getMonth()).toBe(1); // Fevereiro
      expect(nextDate.getDate()).toBe(29); // 29 de Fev em 2024
      expect(isLeapYear(2024)).toBe(true);
    });

    it('deve lidar corretamente com avanço de 31 de janeiro para fevereiro em ano não bissexto (2025)', () => {
      const jan31 = new Date(2025, 0, 31);
      const nextDate = getNextMonthlyRecurrenceDate(jan31, 1);
      expect(nextDate.getMonth()).toBe(1); // Fevereiro
      expect(nextDate.getDate()).toBe(28); // 28 de Fev em 2025
      expect(isLeapYear(2025)).toBe(false);
    });

    it('deve avançar corretamente de 31 de março para 30 de abril', () => {
      const mar31 = new Date(2026, 2, 31);
      const nextDate = getNextMonthlyRecurrenceDate(mar31, 1);
      expect(nextDate.getMonth()).toBe(3); // Abril
      expect(nextDate.getDate()).toBe(30);
    });
  });

  describe('Projeção de Fluxo de Caixa', () => {
    it('deve calcular saldo final projetado com receitas e despesas futuras', () => {
      const initial = 250000; // R$ 2.500,00
      const txs: Array<{ amountCents: number; type: 'INCOME' | 'EXPENSE' }> = [
        { amountCents: 500000, type: 'INCOME' }, // Salário + R$ 5.000,00
        { amountCents: 180000, type: 'EXPENSE' }, // Aluguel - R$ 1.800,00
        { amountCents: 60000, type: 'EXPENSE' }, // Mercado - R$ 600,00
      ];
      const finalBalance = projectCashFlow(initial, txs);
      expect(finalBalance).toBe(510000); // R$ 5.100,00
    });
  });

  describe('Limite de Cartão de Crédito', () => {
    it('deve calcular limite disponível subtraindo fatura atual e lançamentos pendentes', () => {
      const totalLimit = 1000000; // R$ 10.000,00
      const currentBill = 350000; // R$ 3.500,00
      const pending = 120000; // R$ 1.200,00
      const available = calculateCreditCardLimit(totalLimit, currentBill, pending);
      expect(available).toBe(530000); // R$ 5.300,00
    });
  });
});
