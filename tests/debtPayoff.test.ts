import { describe, it, expect } from 'vitest';
import { 
  sortDebtsByStrategy, 
  simulateDebtPayoff, 
  compareStrategies,
  type DebtInput 
} from '../renderer/src/lib/debtPayoff';

describe('Planejador de Dívidas - Algoritmos Financeiros (Snowball & Avalanche)', () => {
  const sampleDebts: DebtInput[] = [
    {
      id: 'debt-cartao',
      name: 'Cartão de Crédito',
      remainingAmountCents: 200000, // R$ 2.000,00
      interestRateMonthly: 12.0, // 12% a.m. (juro alto de rotativo)
      minimumPaymentCents: 15000, // R$ 150,00
    },
    {
      id: 'debt-cheque',
      name: 'Cheque Especial',
      remainingAmountCents: 50000, // R$ 500,00
      interestRateMonthly: 8.0, // 8% a.m.
      minimumPaymentCents: 8000, // R$ 80,00
    },
    {
      id: 'debt-carro',
      name: 'Financiamento Carro',
      remainingAmountCents: 1500000, // R$ 15.000,00
      interestRateMonthly: 1.8, // 1.8% a.m.
      minimumPaymentCents: 45000, // R$ 450,00
    },
  ];

  describe('Ordenação por Estratégia (sortDebtsByStrategy)', () => {
    it('deve ordenar pelo menor saldo devedor primeiro na estratégia Bola de Neve (Snowball)', () => {
      const sorted = sortDebtsByStrategy(sampleDebts, 'SNOWBALL');
      expect(sorted[0]!.id).toBe('debt-cheque'); // R$ 500
      expect(sorted[1]!.id).toBe('debt-cartao'); // R$ 2.000
      expect(sorted[2]!.id).toBe('debt-carro');  // R$ 15.000
    });

    it('deve ordenar pela maior taxa de juros primeiro na estratégia Avalanche', () => {
      const sorted = sortDebtsByStrategy(sampleDebts, 'AVALANCHE');
      expect(sorted[0]!.id).toBe('debt-cartao'); // 12% a.m.
      expect(sorted[1]!.id).toBe('debt-cheque'); // 8% a.m.
      expect(sorted[2]!.id).toBe('debt-carro');  // 1.8% a.m.
    });
  });

  describe('Simulação de Quitação (simulateDebtPayoff)', () => {
    it('deve lidar com lista vazia de dívidas ativas', () => {
      const result = simulateDebtPayoff([], 'SNOWBALL');
      expect(result.monthsToDebtFree).toBe(0);
      expect(result.totalInterestPaidCents).toBe(0);
      expect(result.debtOrder).toHaveLength(0);
    });

    it('deve quitar uma dívida sem juros no número exato de meses', () => {
      const zeroInterestDebt: DebtInput[] = [
        {
          id: 'emprestimo-amigo',
          name: 'Empréstimo Amigo',
          remainingAmountCents: 100000, // R$ 1.000,00
          interestRateMonthly: 0,
          minimumPaymentCents: 20000, // R$ 200,00/mês
        },
      ];

      const result = simulateDebtPayoff(zeroInterestDebt, 'SNOWBALL', 0);
      expect(result.monthsToDebtFree).toBe(5); // 1000 / 200 = 5 meses
      expect(result.totalInterestPaidCents).toBe(0);
      expect(result.totalPaidCents).toBe(100000);
    });

    it('deve aplicar o efeito bola de neve (rollover) acelerando a quitação das próximas dívidas', () => {
      const result = simulateDebtPayoff(sampleDebts, 'SNOWBALL', 0);

      expect(result.monthsToDebtFree).toBeGreaterThan(0);
      expect(result.totalPaidCents).toBeGreaterThan(result.totalInitialDebtCents);
      expect(result.debtOrder).toHaveLength(3);

      // Na bola de neve, o Cheque Especial (menor saldo) deve ser quitado primeiro
      const firstPaid = result.debtOrder.find((d) => d.id === 'debt-cheque');
      expect(firstPaid?.rank).toBe(1);
    });

    it('o método Avalanche deve resultar em custo total de juros menor ou igual ao da Bola de Neve', () => {
      const snowball = simulateDebtPayoff(sampleDebts, 'SNOWBALL', 20000);
      const avalanche = simulateDebtPayoff(sampleDebts, 'AVALANCHE', 20000);

      expect(avalanche.totalInterestPaidCents).toBeLessThanOrEqual(snowball.totalInterestPaidCents);
    });

    it('aporte extra mensal deve reduzir os meses até a liberdade financeira e o total de juros pagos', () => {
      const withoutExtra = simulateDebtPayoff(sampleDebts, 'AVALANCHE', 0);
      const withExtra = simulateDebtPayoff(sampleDebts, 'AVALANCHE', 30000); // +R$ 300,00/mês

      expect(withExtra.monthsToDebtFree).toBeLessThan(withoutExtra.monthsToDebtFree);
      expect(withExtra.totalInterestPaidCents).toBeLessThan(withoutExtra.totalInterestPaidCents);
    });
  });

  describe('Comparação entre Estratégias (compareStrategies)', () => {
    it('deve calcular a diferença de juros e meses entre Bola de Neve e Avalanche', () => {
      const comp = compareStrategies(sampleDebts, 15000);

      expect(comp.snowball).toBeDefined();
      expect(comp.avalanche).toBeDefined();
      expect(comp.interestDifferenceCents).toBeGreaterThanOrEqual(0);
      expect(comp.baselineMinimumOnly).toBeDefined();
    });
  });
});
