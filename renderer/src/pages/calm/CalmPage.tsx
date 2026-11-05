import React, { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { 
  Leaf, 
  ChevronLeft, 
  ChevronRight, 
  Eye, 
  EyeOff, 
  Plus, 
  Sparkles, 
  ArrowUpRight, 
  ArrowDownRight, 
  CheckCircle2, 
  Wallet, 
  Coffee,
  Heart
} from 'lucide-react';
import { api } from '../../lib/ipc';
import { formatCurrency, cn } from '../../lib/utils';
import { useAccountStore } from '../../store/useAccountStore';
import { 
  getWeekDays, 
  getStartOfWeek, 
  getEndOfWeek, 
  formatDateKey, 
  formatWeekRange, 
  evaluateWeekPacing, 
  countZeroExpenseDays, 
  CALM_TIPS 
} from '../../lib/calmUtils';
import { QuickAddTransactionModal } from '../transactions/components/QuickAddTransactionModal';
import type { Transaction, Account, Category } from '../../types';

const WEEKDAY_NAMES = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
const STORAGE_KEY_HIDE_FIGURES = 'gringotts_calm_hide_figures';

export const CalmPage: React.FC = () => {
  const queryClient = useQueryClient();
  const activeAccountId = useAccountStore((s) => s.selectedAccountId);

  // Navegação da semana
  const [currentWeekDate, setCurrentWeekDate] = useState<Date>(() => new Date());

  // Conta selecionada para filtro
  const [selectedAccountId, setSelectedAccountId] = useState<string>(activeAccountId || 'ALL');

  // Modo Zen: Ocultar cifras para diminuir ansiedade
  const [hideFigures, setHideFigures] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(STORAGE_KEY_HIDE_FIGURES) === 'true';
  });

  const toggleHideFigures = () => {
    setHideFigures((prev) => {
      const next = !prev;
      localStorage.setItem(STORAGE_KEY_HIDE_FIGURES, String(next));
      return next;
    });
  };

  // Modal de adição rápida com data pré-selecionada
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [dateForAdd, setDateForAdd] = useState<string>(() => formatDateKey(new Date()));

  // Consultas de dados
  const { data: accounts = [] } = useQuery<Account[]>({
    queryKey: ['accounts'],
    queryFn: () => api.accounts.getAll(),
  });

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: () => api.categories.getAll(),
  });

  const { data: transactions = [], refetch: refetchTransactions } = useQuery<Transaction[]>({
    queryKey: ['transactions'],
    queryFn: () => api.transactions.getAll({ limit: 1000 }),
  });

  // Dias da semana atual (Segunda a Domingo)
  const weekDays = useMemo(() => getWeekDays(currentWeekDate), [currentWeekDate]);
  const weekStart = useMemo(() => getStartOfWeek(currentWeekDate), [currentWeekDate]);
  const weekEnd = useMemo(() => getEndOfWeek(currentWeekDate), [currentWeekDate]);
  const weekRangeLabel = useMemo(() => formatWeekRange(weekStart, weekEnd), [weekStart, weekEnd]);

  // Identificação do dia de hoje (em fuso local)
  const todayKey = useMemo(() => formatDateKey(new Date()), []);

  // Categorias em mapa
  const categoriesMap = useMemo(() => {
    const map = new Map<string, Category>();
    categories.forEach((c) => map.set(c.id, c));
    return map;
  }, [categories]);

  // Transações filtradas por conta e por período da semana
  const weekTransactions = useMemo(() => {
    const startTime = weekStart.getTime();
    const endTime = weekEnd.getTime();

    return transactions.filter((t) => {
      // Filtro de conta
      if (selectedAccountId !== 'ALL' && t.accountId !== selectedAccountId) {
        return false;
      }

      const d = t.date instanceof Date ? t.date : new Date(t.date);
      const time = d.getTime();
      return time >= startTime && time <= endTime;
    });
  }, [transactions, selectedAccountId, weekStart, weekEnd]);

  // Transações indexadas por dia da semana
  const transactionsByDay = useMemo(() => {
    const map: Record<string, { income: number; expenses: number; items: Transaction[] }> = {};

    weekDays.forEach((d) => {
      map[formatDateKey(d)] = { income: 0, expenses: 0, items: [] };
    });

    weekTransactions.forEach((t) => {
      const d = t.date instanceof Date ? t.date : new Date(t.date);
      const key = formatDateKey(d);
      if (!map[key]) {
        map[key] = { income: 0, expenses: 0, items: [] };
      }

      const val = Math.abs(t.amountCents);
      if (t.type === 'INCOME') {
        map[key].income += val;
      } else if (t.type === 'EXPENSE') {
        map[key].expenses += val;
      }
      map[key].items.push(t);
    });

    return map;
  }, [weekDays, weekTransactions]);

  // Totais da semana
  const { totalIncome, totalExpense, balance } = useMemo(() => {
    let inc = 0;
    let exp = 0;
    Object.values(transactionsByDay).forEach((day) => {
      inc += day.income;
      exp += day.expenses;
    });
    return {
      totalIncome: inc,
      totalExpense: exp,
      balance: inc - exp,
    };
  }, [transactionsByDay]);

  // Dias com zero despesas
  const expensesByDay = useMemo(() => {
    const map: Record<string, number> = {};
    Object.entries(transactionsByDay).forEach(([k, v]) => {
      map[k] = v.expenses;
    });
    return map;
  }, [transactionsByDay]);

  const zeroExpenseDaysCount = useMemo(() => {
    return countZeroExpenseDays(weekDays, expensesByDay);
  }, [weekDays, expensesByDay]);

  // Avaliação serena do ritmo da semana
  const pacingInfo = useMemo(() => {
    return evaluateWeekPacing(totalExpense, totalIncome);
  }, [totalExpense, totalIncome]);

  // Dica zen aleatória ou fixa baseada no dia
  const currentTip = useMemo(() => {
    const index = Math.abs(weekStart.getDate()) % CALM_TIPS.length;
    return CALM_TIPS[index];
  }, [weekStart]);

  // Navegação
  const handlePrevWeek = () => {
    const next = new Date(currentWeekDate);
    next.setDate(next.getDate() - 7);
    setCurrentWeekDate(next);
  };

  const handleNextWeek = () => {
    const next = new Date(currentWeekDate);
    next.setDate(next.getDate() + 7);
    setCurrentWeekDate(next);
  };

  const handleTodayWeek = () => {
    setCurrentWeekDate(new Date());
  };

  const isCurrentWeek = useMemo(() => {
    const today = new Date();
    return today.getTime() >= weekStart.getTime() && today.getTime() <= weekEnd.getTime();
  }, [weekStart, weekEnd]);

  // Formatação segura de valores com suporte ao Modo Zen
  const renderAmount = (cents: number, fallback = 'R$ 0,00') => {
    if (hideFigures) return '●●●';
    if (!cents && cents !== 0) return fallback;
    return formatCurrency(cents);
  };

  const handleOpenAddForDay = (dateStr: string) => {
    setDateForAdd(dateStr);
    setIsAddModalOpen(true);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto text-gray-900 dark:text-gray-100 transition-colors duration-150">
      {/* Cabeçalho Zen */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-emerald-50 dark:bg-emerald-500/15 border border-emerald-200 dark:border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-sm shadow-emerald-500/10">
            <Leaf className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">Modo Calma</h1>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/20">
                Visão Semanal
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Sua semana com clareza, respiração e foco no essencial, sem sobrecarga de números.
            </p>
          </div>
        </div>

        {/* Controles da Barra Superior */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Seletor de Conta */}
          <div className="flex items-center gap-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-1.5 text-xs shadow-2xs">
            <Wallet className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400 shrink-0" />
            <select
              value={selectedAccountId}
              onChange={(e) => setSelectedAccountId(e.target.value)}
              className="bg-transparent text-gray-700 dark:text-gray-200 outline-none cursor-pointer text-xs pr-1"
            >
              <option value="ALL" className="bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-200">Todas as Carteiras</option>
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id} className="bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-200">
                  {acc.name}
                </option>
              ))}
            </select>
          </div>

          {/* Botão de Toggle de Ocultar Cifras (Modo Zen) */}
          <button
            onClick={toggleHideFigures}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all cursor-pointer shadow-2xs",
              hideFigures
                ? "bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-500/30 font-semibold"
                : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-750"
            )}
            title={hideFigures ? "Mostrar valores monetários" : "Ocultar valores para reduzir a ansiedade"}
          >
            {hideFigures ? (
              <>
                <EyeOff className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Cifras Ocultas (Zen)</span>
              </>
            ) : (
              <>
                <Eye className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
                <span>Ocultar Valores</span>
              </>
            )}
          </button>

          {/* Navegador de Semanas */}
          <div className="flex items-center bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-0.5 shadow-2xs">
            <button
              onClick={handlePrevWeek}
              className="p-1.5 rounded-lg text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer"
              title="Semana anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleTodayWeek}
              disabled={isCurrentWeek}
              className={cn(
                "px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer",
                isCurrentWeek 
                  ? "text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 font-bold cursor-default" 
                  : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700"
              )}
            >
              Esta Semana
            </button>
            <button
              onClick={handleNextWeek}
              className="p-1.5 rounded-lg text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer"
              title="Semana seguinte"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Banner de Diagnóstico e Serenidade */}
      <section className="relative overflow-hidden rounded-3xl bg-white dark:bg-gradient-to-r dark:from-gray-900/90 dark:via-gray-900/70 dark:to-emerald-950/20 border border-gray-200 dark:border-gray-800 p-6 backdrop-blur-xl shadow-xs dark:shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1.5 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                {weekRangeLabel}
              </span>
              <span className={cn("text-[11px] font-semibold px-2.5 py-0.5 rounded-full border", pacingInfo.colorClass)}>
                {pacingInfo.title}
              </span>
            </div>
            <h2 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white tracking-tight">
              {pacingInfo.description}
            </h2>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              {zeroExpenseDaysCount === 7 
                ? 'Uma semana inteira sem saídas até agora! Respire com tranquilidade.'
                : `${zeroExpenseDaysCount} de 7 dias nesta semana foram dias de paz financeira (sem saídas registradas).`}
            </p>
          </div>

          {/* Pílulas de Síntese Calma */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="px-4 py-2.5 rounded-2xl bg-gray-50 dark:bg-gray-950/60 border border-gray-200 dark:border-gray-800/80 flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-500/15 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-gray-500 dark:text-gray-400 tracking-wider block">Dias de Paz</span>
                <span className="text-base font-bold text-emerald-700 dark:text-emerald-300 font-mono">
                  {zeroExpenseDaysCount} / 7
                </span>
              </div>
            </div>

            <div className="px-4 py-2.5 rounded-2xl bg-gray-50 dark:bg-gray-950/60 border border-gray-200 dark:border-gray-800/80 flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-500/15 flex items-center justify-center text-amber-600 dark:text-amber-400">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-gray-500 dark:text-gray-400 tracking-wider block">Lançamentos</span>
                <span className="text-base font-bold text-gray-800 dark:text-gray-200 font-mono">
                  {weekTransactions.length}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Glow decorativo de fundo no dark mode */}
        <div className="absolute top-0 right-1/4 w-96 h-28 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none hidden dark:block" />
      </section>

      {/* Grade Semanal dos 7 Dias (Segunda a Domingo) */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
            <Leaf className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            Fluxo Diário da Semana
          </span>
          <span className="text-xs text-gray-400 dark:text-gray-500">
            Passe o mouse ou toque para adicionar rapidamente
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          {weekDays.map((day, idx) => {
            const dateStr = formatDateKey(day);
            const isToday = dateStr === todayKey;
            const dayData = transactionsByDay[dateStr] || { income: 0, expenses: 0, items: [] };
            const hasItems = dayData.items.length > 0;
            const hasExpense = dayData.expenses > 0;
            const dayNum = String(day.getDate()).padStart(2, '0');
            const weekdayName = WEEKDAY_NAMES[idx];

            return (
              <div
                key={dateStr}
                className={cn(
                  "group relative rounded-2xl p-3.5 flex flex-col justify-between transition-all duration-200 border min-h-[220px]",
                  isToday
                    ? "bg-emerald-50/40 dark:bg-gradient-to-b dark:from-gray-900 dark:to-gray-950 border-emerald-400/80 dark:border-emerald-500/40 shadow-xs dark:shadow-lg dark:shadow-emerald-500/5 ring-1 ring-emerald-500/20"
                    : "bg-white dark:bg-gray-900/60 border-gray-200 dark:border-gray-800/80 hover:border-gray-300 dark:hover:border-gray-700/80 hover:bg-gray-50/60 dark:hover:bg-gray-900/80 shadow-2xs"
                )}
              >
                {/* Cabeçalho do Dia */}
                <div className="pb-2 mb-2 border-b border-gray-100 dark:border-gray-800/60 flex items-center justify-between">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-xs font-bold uppercase text-gray-500 dark:text-gray-400 tracking-wider">
                      {weekdayName}
                    </span>
                    <span className={cn(
                      "text-base font-bold font-mono",
                      isToday ? "text-emerald-700 dark:text-emerald-400" : "text-gray-800 dark:text-gray-200"
                    )}>
                      {dayNum}
                    </span>
                  </div>

                  {isToday ? (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/30">
                      Hoje
                    </span>
                  ) : (
                    <button
                      onClick={() => handleOpenAddForDay(dateStr)}
                      className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-gray-900 dark:hover:text-white rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-all cursor-pointer"
                      title={`Adicionar lançamento em ${dateStr}`}
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Conteúdo do Dia */}
                <div className="flex-1 flex flex-col justify-between space-y-2">
                  {hasItems ? (
                    <div className="space-y-1.5 overflow-y-auto max-h-36 pr-0.5">
                      {dayData.items.map((item) => {
                        const cat = item.categoryId ? categoriesMap.get(item.categoryId) : undefined;
                        const isIncome = item.type === 'INCOME';

                        return (
                          <div
                            key={item.id}
                            className="p-1.5 rounded-xl bg-gray-50 dark:bg-gray-950/60 border border-gray-200/70 dark:border-gray-800/60 hover:border-gray-300 dark:hover:border-gray-700/60 transition-colors text-xs flex items-center justify-between gap-1.5"
                          >
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span 
                                className="w-1.5 h-1.5 rounded-full shrink-0" 
                                style={{ backgroundColor: cat?.color || (isIncome ? '#10b981' : '#f59e0b') }} 
                              />
                              <span className="truncate text-gray-700 dark:text-gray-300 text-[11px]" title={item.description || cat?.name || 'Sem descrição'}>
                                {item.description || cat?.name || 'Lançamento'}
                              </span>
                            </div>

                            <span className={cn(
                              "font-mono text-[11px] font-semibold shrink-0",
                              isIncome ? "text-emerald-600 dark:text-emerald-400" : "text-gray-800 dark:text-gray-300"
                            )}>
                              {isIncome ? '+' : '-'}{renderAmount(Math.abs(item.amountCents))}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    /* Estado Zen: Dia de Paz sem gastos */
                    <div className="my-auto py-4 flex flex-col items-center justify-center text-center space-y-1 select-none">
                      <div className="w-8 h-8 rounded-full bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400/70 mb-1">
                        <Leaf className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-300/80">Dia de Paz</span>
                      <span className="text-[10px] text-gray-400 dark:text-gray-500">Sem saídas</span>
                    </div>
                  )}

                  {/* Resumo sutil do Dia */}
                  {hasExpense && (
                    <div className="pt-2 border-t border-gray-100 dark:border-gray-800/40 flex items-center justify-between text-[11px]">
                      <span className="text-gray-400 dark:text-gray-500">Total do dia:</span>
                      <span className="font-mono text-gray-800 dark:text-gray-300 font-medium">
                        {renderAmount(dayData.expenses)}
                      </span>
                    </div>
                  )}
                </div>

                {/* Botão de Adição Rápida Sempre Visível em Dispositivos Móveis */}
                <button
                  onClick={() => handleOpenAddForDay(dateStr)}
                  className="mt-2 w-full py-1 text-[11px] font-medium text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800/80 border border-transparent hover:border-gray-200 dark:hover:border-gray-800 transition-all flex items-center justify-center gap-1 cursor-pointer sm:hidden"
                >
                  <Plus className="w-3 h-3" />
                  <span>Lançar</span>
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {/* Rodapé Minimalista: Balanço da Semana e Dica Zen */}
      <footer className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
        {/* Entradas da Semana */}
        <div className="p-4 rounded-2xl bg-white dark:bg-gray-900/60 border border-gray-200 dark:border-gray-800 flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-500/15 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <ArrowUpRight className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider block">Entradas da Semana</span>
              <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                {renderAmount(totalIncome)}
              </span>
            </div>
          </div>
        </div>

        {/* Saídas da Semana */}
        <div className="p-4 rounded-2xl bg-white dark:bg-gray-900/60 border border-gray-200 dark:border-gray-800 flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-500/15 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <ArrowDownRight className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider block">Saídas da Semana</span>
              <span className="text-lg font-bold text-gray-800 dark:text-gray-200 font-mono">
                {renderAmount(totalExpense)}
              </span>
            </div>
          </div>
        </div>

        {/* Balanço / Saldo Semanal */}
        <div className="p-4 rounded-2xl bg-white dark:bg-gray-900/60 border border-gray-200 dark:border-gray-800 flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-500/15 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <Heart className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider block">Saldo Semanal</span>
              <span className={cn(
                "text-lg font-bold font-mono",
                balance >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"
              )}>
                {balance > 0 ? '+' : ''}{renderAmount(balance)}
              </span>
            </div>
          </div>
        </div>
      </footer>

      {/* Dica de Tranquilidade Financeira */}
      <div className="p-4 rounded-2xl bg-emerald-50/70 dark:bg-gradient-to-r dark:from-emerald-500/10 dark:via-gray-900/80 dark:to-teal-500/10 border border-emerald-200/80 dark:border-emerald-500/20 flex items-center gap-3.5 text-xs text-gray-700 dark:text-gray-300 shadow-2xs">
        <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center text-emerald-700 dark:text-emerald-400 shrink-0">
          <Coffee className="w-4 h-4" />
        </div>
        <div className="flex-1">
          <span className="font-bold text-emerald-800 dark:text-emerald-300 mr-1.5">Pensamento Zen:</span>
          <span>{currentTip}</span>
        </div>
      </div>

      {/* Modal de Adição Rápida */}
      <QuickAddTransactionModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        defaultDate={dateForAdd}
        onTransactionAdded={() => {
          refetchTransactions();
          queryClient.invalidateQueries({ queryKey: ['accounts'] });
        }}
      />
    </div>
  );
};

export default CalmPage;
