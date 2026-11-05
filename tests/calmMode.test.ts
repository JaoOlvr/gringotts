import { describe, it, expect } from 'vitest';
import { 
  getStartOfWeek, 
  getEndOfWeek, 
  getWeekDays, 
  formatDateKey, 
  formatWeekRange, 
  evaluateWeekPacing, 
  countZeroExpenseDays 
} from '../renderer/src/lib/calmUtils';

describe('Modo Calma - Utilitários da Visão Semanal Minimalista', () => {
  describe('getStartOfWeek e getEndOfWeek', () => {
    it('deve retornar a segunda-feira correspondente para um dia no meio da semana', () => {
      // Quarta-feira, 04 de Novembro de 2026
      const wednesday = new Date(2026, 10, 4, 15, 30);
      const start = getStartOfWeek(wednesday);
      expect(start.getDay()).toBe(1); // Segunda
      expect(start.getDate()).toBe(2);
      expect(start.getMonth()).toBe(10);
      expect(start.getFullYear()).toBe(2026);
      expect(start.getHours()).toBe(0);
      expect(start.getMinutes()).toBe(0);
    });

    it('deve retornar a segunda-feira correta quando o dia fornecido for domingo', () => {
      // Domingo, 08 de Novembro de 2026
      const sunday = new Date(2026, 10, 8, 20, 0);
      const start = getStartOfWeek(sunday);
      expect(start.getDay()).toBe(1); // Segunda-feira anterior (dia 2)
      expect(start.getDate()).toBe(2);
      expect(start.getMonth()).toBe(10);
    });

    it('deve retornar o domingo final com horário no final do dia', () => {
      const wednesday = new Date(2026, 10, 4);
      const end = getEndOfWeek(wednesday);
      expect(end.getDay()).toBe(0); // Domingo
      expect(end.getDate()).toBe(8);
      expect(end.getHours()).toBe(23);
      expect(end.getMinutes()).toBe(59);
    });
  });

  describe('getWeekDays', () => {
    it('deve gerar exatamente 7 dias consecutivos iniciando na segunda-feira', () => {
      const date = new Date(2026, 10, 4);
      const days = getWeekDays(date);
      expect(days.length).toBe(7);
      expect(days[0].getDay()).toBe(1); // Segunda
      expect(days[6].getDay()).toBe(0); // Domingo
      expect(days.map((d) => d.getDate())).toEqual([2, 3, 4, 5, 6, 7, 8]);
    });
  });

  describe('formatDateKey', () => {
    it('deve formatar data no padrão YYYY-MM-DD com zeros à esquerda', () => {
      const date = new Date(2026, 3, 5); // 05 de Abril de 2026
      expect(formatDateKey(date)).toBe('2026-04-05');
    });
  });

  describe('formatWeekRange', () => {
    it('deve formatar semana no mesmo mês', () => {
      const start = new Date(2026, 10, 2);
      const end = new Date(2026, 10, 8);
      expect(formatWeekRange(start, end)).toBe('02 a 08 de Novembro de 2026');
    });

    it('deve formatar semana com virada de mês', () => {
      const start = new Date(2026, 9, 26);
      const end = new Date(2026, 10, 1);
      expect(formatWeekRange(start, end)).toBe('26 de Outubro a 01 de Novembro de 2026');
    });

    it('deve formatar semana com virada de ano', () => {
      const start = new Date(2026, 11, 28);
      const end = new Date(2027, 0, 3);
      expect(formatWeekRange(start, end)).toBe('28 de Dezembro de 2026 a 03 de Janeiro de 2027');
    });
  });

  describe('evaluateWeekPacing', () => {
    it('deve classificar como serena quando não há despesas', () => {
      const pacing = evaluateWeekPacing(0, 50000);
      expect(pacing.type).toBe('serene');
      expect(pacing.title).toBe('Semana Ultratranquila');
    });

    it('deve classificar como equilibrada quando receitas superam despesas', () => {
      const pacing = evaluateWeekPacing(10000, 25000);
      expect(pacing.type).toBe('balanced');
      expect(pacing.title).toBe('Fluxo em Harmonia');
    });

    it('deve classificar como confortável para despesas baixas', () => {
      const pacing = evaluateWeekPacing(15000, 0);
      expect(pacing.type).toBe('balanced');
      expect(pacing.title).toBe('Ritmo Confortável');
    });

    it('deve classificar como ativa para gastos mais altos', () => {
      const pacing = evaluateWeekPacing(120000, 0);
      expect(pacing.type).toBe('active');
      expect(pacing.title).toBe('Semana Mais Movimentada');
    });
  });

  describe('countZeroExpenseDays', () => {
    it('deve contar corretamente dias com zero despesas', () => {
      const date = new Date(2026, 10, 4);
      const days = getWeekDays(date);
      const expensesMap: Record<string, number> = {
        '2026-11-02': 5000,
        '2026-11-04': 2000,
        '2026-11-05': 0,
      };

      // Dos 7 dias, apenas 2026-11-02 e 2026-11-04 tiveram gastos > 0.
      // Logo, 5 dias foram dias de paz (zero gastos).
      const zeroDays = countZeroExpenseDays(days, expensesMap);
      expect(zeroDays).toBe(5);
    });
  });
});

