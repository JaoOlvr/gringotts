/**
 * Utilitários para o Modo Calma (Visão Semanal Minimalista)
 */

/**
 * Retorna a Segunda-feira da semana da data fornecida (considerando a semana de Seg a Dom)
 */
export function getStartOfWeek(date: Date): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = d.getDay(); // 0 = Domingo, 1 = Segunda, ... 6 = Sábado
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Retorna o Domingo (final) da semana
 */
export function getEndOfWeek(date: Date): Date {
  const start = getStartOfWeek(date);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return end;
}

/**
 * Retorna os 7 dias da semana (Segunda a Domingo)
 */
export function getWeekDays(baseDate: Date): Date[] {
  const start = getStartOfWeek(baseDate);
  const days: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    days.push(d);
  }
  return days;
}

/**
 * Formata uma data para chave 'YYYY-MM-DD' usando o fuso horário local
 */
export function formatDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

/**
 * Formata o intervalo da semana de forma amigável e legível
 * Ex: "02 a 08 de Novembro de 2026"
 */
export function formatWeekRange(start: Date, end: Date): string {
  const startDay = String(start.getDate()).padStart(2, '0');
  const endDay = String(end.getDate()).padStart(2, '0');
  const startMonth = MONTH_NAMES[start.getMonth()];
  const endMonth = MONTH_NAMES[end.getMonth()];
  const startYear = start.getFullYear();
  const endYear = end.getFullYear();

  if (startYear !== endYear) {
    return `${startDay} de ${startMonth} de ${startYear} a ${endDay} de ${endMonth} de ${endYear}`;
  }

  if (start.getMonth() !== end.getMonth()) {
    return `${startDay} de ${startMonth} a ${endDay} de ${endMonth} de ${endYear}`;
  }

  return `${startDay} a ${endDay} de ${startMonth} de ${endYear}`;
}

export type WeekPacingType = 'serene' | 'balanced' | 'active';

export interface WeekPacingInfo {
  type: WeekPacingType;
  title: string;
  description: string;
  colorClass: string;
}

/**
 * Avalia o ritmo financeiro da semana de forma qualitativa e serena
 */
export function evaluateWeekPacing(totalExpenseCents: number, totalIncomeCents: number): WeekPacingInfo {
  if (totalExpenseCents === 0) {
    return {
      type: 'serene',
      title: 'Semana Ultratranquila',
      description: 'Nenhuma saída registrada nesta semana. Uma pausa revigorante nas despesas.',
      colorClass: 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20',
    };
  }

  if (totalIncomeCents > 0 && totalExpenseCents <= totalIncomeCents) {
    return {
      type: 'balanced',
      title: 'Fluxo em Harmonia',
      description: 'Entradas e saídas equilibradas nesta semana, mantendo a tranquilidade.',
      colorClass: 'text-teal-700 dark:text-teal-400 bg-teal-50 dark:bg-teal-500/10 border-teal-200 dark:border-teal-500/20',
    };
  }

  if (totalExpenseCents < 50000) { // menos de R$ 500
    return {
      type: 'balanced',
      title: 'Ritmo Confortável',
      description: 'Gastos moderados e controlados ao longo dos dias.',
      colorClass: 'text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20',
    };
  }

  return {
    type: 'active',
    title: 'Semana Mais Movimentada',
    description: 'Algumas despesas concentradas nesta semana. Respire fundo e mantenha o foco no essencial.',
    colorClass: 'text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-500/10 border-indigo-200 dark:border-indigo-500/20',
  };
}

/**
 * Conta quantos dias da semana não tiveram nenhuma despesa
 */
export function countZeroExpenseDays(weekDays: Date[], expensesByDay: Record<string, number>): number {
  return weekDays.filter((d) => {
    const key = formatDateKey(d);
    const expense = expensesByDay[key] || 0;
    return expense === 0;
  }).length;
}

/**
 * Dicas de tranquilidade financeira para o rodapé
 */
export const CALM_TIPS = [
  'Dias sem gastar dinheiro são a forma mais natural e gentil de criar folga no seu orçamento.',
  'O objetivo do controle financeiro não é a perfeição, mas a tranquilidade de saber onde você está.',
  'Focar em uma semana por vez reduz o ruído e traz clareza para o que realmente importa hoje.',
  'Respire: o dinheiro é apenas uma ferramenta para servir sua vida, não o contrário.',
  'Pequenas pausas financeiras semanais fortalecem sua liberdade a longo prazo.',
];

