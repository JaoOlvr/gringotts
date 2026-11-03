import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(cents: number, currency = 'BRL'): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: currency,
  }).format(cents / 100);
}

/**
 * Divide um valor total em centavos por N parcelas, distribuindo o resto centavo a centavo
 */
export function calculateInstallments(totalCents: number, count: number): number[] {
  if (count <= 0) throw new Error('Número de parcelas deve ser positivo');
  const baseAmount = Math.floor(totalCents / count);
  const remainder = totalCents % count;

  const installments: number[] = [];
  for (let i = 0; i < count; i++) {
    installments.push(i < remainder ? baseAmount + 1 : baseAmount);
  }
  return installments;
}

/**
 * Calcula a data no mesmo dia dos meses subsequentes, ajustando para o último dia de meses mais curtos
 */
export function getNextMonthlyRecurrenceDate(startDate: Date, monthsOffset: number): Date {
  const originalDay = startDate.getDate();
  const totalMonths = startDate.getFullYear() * 12 + startDate.getMonth() + monthsOffset;
  const targetYear = Math.floor(totalMonths / 12);
  const targetMonth = ((totalMonths % 12) + 12) % 12;

  const daysInTargetMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
  const adjustedDay = Math.min(originalDay, daysInTargetMonth);

  return new Date(
    targetYear,
    targetMonth,
    adjustedDay,
    startDate.getHours(),
    startDate.getMinutes(),
    startDate.getSeconds()
  );
}
