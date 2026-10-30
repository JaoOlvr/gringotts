import { describe, it, expect } from 'vitest';

describe('Financial Calculator Logic', () => {
  it('deve calcular corretamente operações aritméticas básicas', () => {
    // 150 + 50 * 2 = 250
    const expr = '150 + 50 * 2';
    // eslint-disable-next-line no-new-func
    const result = new Function(`return (${expr})`)();
    expect(result).toBe(250);
  });

  it('deve calcular juros compostos com precisão', () => {
    // P = 1000, PMT = 200/mês, taxa = 12% a.a. (1% a.m.), t = 12 meses
    const p = 1000;
    const pmt = 200;
    const r = 0.12 / 12;
    const t = 12;

    const totalInvested = p + pmt * t;
    const finalAmount = p * Math.pow(1 + r, t) + pmt * ((Math.pow(1 + r, t) - 1) / r);

    expect(totalInvested).toBe(3400);
    expect(Math.round(finalAmount)).toBe(3663);
    expect(finalAmount > totalInvested).toBe(true);
  });

  it('deve calcular divisão de conta com taxa de serviço', () => {
    // Conta de R$ 150, 3 pessoas, 10% de serviço = R$ 165 total = R$ 55 por pessoa
    const total = 150;
    const people = 3;
    const tip = 0.10;

    const totalWithTip = total + (total * tip);
    const perPerson = totalWithTip / people;

    expect(totalWithTip).toBe(165);
    expect(perPerson).toBe(55);
  });
});
