import { describe, it, expect } from 'vitest';
import { calculateInstallments, getNextMonthlyRecurrenceDate } from '../renderer/src/lib/utils';

describe('Regras de Lançamentos Recorrentes e Parcelamento nos Meses', () => {
  describe('Manutenção do Dia do Mês e Ajuste para Meses Mais Curtos', () => {
    it('deve manter o mesmo dia do mês cadastrado ao avançar nos meses', () => {
      const baseDate = new Date(2026, 4, 15, 12, 0, 0); // 15 de Maio de 2026

      const month1 = getNextMonthlyRecurrenceDate(baseDate, 0);
      const month2 = getNextMonthlyRecurrenceDate(baseDate, 1);
      const month3 = getNextMonthlyRecurrenceDate(baseDate, 2);
      const month12 = getNextMonthlyRecurrenceDate(baseDate, 11);

      expect(month1.getDate()).toBe(15);
      expect(month1.getMonth()).toBe(4); // Maio
      expect(month1.getFullYear()).toBe(2026);

      expect(month2.getDate()).toBe(15);
      expect(month2.getMonth()).toBe(5); // Junho
      expect(month2.getFullYear()).toBe(2026);

      expect(month3.getDate()).toBe(15);
      expect(month3.getMonth()).toBe(6); // Julho
      expect(month3.getFullYear()).toBe(2026);

      expect(month12.getDate()).toBe(15);
      expect(month12.getMonth()).toBe(3); // Abril do ano seguinte
      expect(month12.getFullYear()).toBe(2027);
    });

    it('deve ajustar adequadamente para o último dia do mês quando o mês tiver menos dias (ex: dia 31 para Fevereiro e Abril)', () => {
      const baseDate = new Date(2026, 0, 31, 12, 0, 0); // 31 de Janeiro de 2026

      // Fevereiro 2026 (não bissexto -> 28 dias)
      const febDate = getNextMonthlyRecurrenceDate(baseDate, 1);
      expect(febDate.getFullYear()).toBe(2026);
      expect(febDate.getMonth()).toBe(1);
      expect(febDate.getDate()).toBe(28);

      // Março 2026 (tem 31 dias)
      const marDate = getNextMonthlyRecurrenceDate(baseDate, 2);
      expect(marDate.getMonth()).toBe(2);
      expect(marDate.getDate()).toBe(31);

      // Abril 2026 (tem 30 dias)
      const aprDate = getNextMonthlyRecurrenceDate(baseDate, 3);
      expect(aprDate.getMonth()).toBe(3);
      expect(aprDate.getDate()).toBe(30);
    });
  });

  describe('Divisão em Parcelas sem Perda de Centavos', () => {
    it('deve dividir R$ 100,00 em 3 parcelas exatas (33,34 + 33,33 + 33,33 = 100,00)', () => {
      const totalCents = 10000;
      const count = 3;
      const installments = calculateInstallments(totalCents, count);

      expect(installments).toHaveLength(3);
      expect(installments[0]).toBe(3334);
      expect(installments[1]).toBe(3333);
      expect(installments[2]).toBe(3333);

      const totalCalculated = installments.reduce((acc, curr) => acc + curr, 0);
      expect(totalCalculated).toBe(totalCents);
    });

    it('deve dividir R$ 1.500,00 em 12 parcelas exatas de R$ 125,00', () => {
      const totalCents = 150000;
      const count = 12;
      const installments = calculateInstallments(totalCents, count);

      expect(installments).toHaveLength(12);
      expect(installments.every((inst) => inst === 12500)).toBe(true);
      expect(installments.reduce((acc, curr) => acc + curr, 0)).toBe(totalCents);
    });

    it('deve suportar até 120 parcelas com integridade monetária total', () => {
      const totalCents = 35000000; // R$ 350.000,00
      const count = 120;
      const installments = calculateInstallments(totalCents, count);

      expect(installments).toHaveLength(120);
      expect(installments.reduce((acc, curr) => acc + curr, 0)).toBe(totalCents);
    });
  });

  describe('Geração de Lote de Lançamentos Recorrentes', () => {
    it('deve gerar lote com descrições indexadas (1/N ... N/N), recurrenceId compartilhado e status correto', () => {
      const count = 5;
      const recurrenceId = 'test-rec-id-123';
      const baseDescription = 'Curso de Inglês';
      const totalCents = 50000; // R$ 500,00
      const baseDate = new Date(2026, 10, 10); // 10 de Novembro de 2026

      const installments = calculateInstallments(totalCents, count);
      const transactions = installments.map((cents, i) => {
        const txDate = getNextMonthlyRecurrenceDate(baseDate, i);
        return {
          amountCents: cents,
          date: txDate,
          description: `${baseDescription} (${i + 1}/${count})`,
          accountId: 'acc-nubank',
          type: 'EXPENSE' as const,
          status: i === 0 ? ('PAID' as const) : ('PENDING' as const),
          recurrenceId,
        };
      });

      expect(transactions).toHaveLength(5);
      expect(transactions[0]!.description).toBe('Curso de Inglês (1/5)');
      expect(transactions[0]!.status).toBe('PAID');
      expect(transactions[0]!.amountCents).toBe(10000);

      expect(transactions[4]!.description).toBe('Curso de Inglês (5/5)');
      expect(transactions[4]!.status).toBe('PENDING');
      expect(transactions[4]!.date.getMonth()).toBe(2); // Março de 2027 (Novembro + 4 meses)
      expect(transactions[4]!.date.getFullYear()).toBe(2027);
      expect(transactions[4]!.date.getDate()).toBe(10); // Mantém dia 10!
    });
  });
});
