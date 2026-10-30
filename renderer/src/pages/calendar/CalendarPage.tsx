import React, { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/ipc';
import { formatCurrency, cn } from '../../lib/utils';
import { useAccountStore } from '../../store/useAccountStore';
import { Button } from '../../components/ui/button';
import { QuickAddTransactionModal } from '../transactions/components/QuickAddTransactionModal';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  ArrowUpRight, 
  ArrowDownRight, 
  Wallet, 
  Tag, 
  Landmark, 
  Clock, 
  CalendarDays,
  LayoutGrid,
  List,
  CheckCircle2,
  AlertCircle,
  Filter
} from 'lucide-react';
import type { Transaction, Account, Category } from '../../types';

export const CalendarPage: React.FC = () => {
  const queryClient = useQueryClient();
  const accountsStore = useAccountStore((s) => s.accounts);
  
  // Mês e ano de navegação
  const [currentDate, setCurrentDate] = useState(() => new Date());
  
  // Dia selecionado (formato YYYY-MM-DD)
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0] ?? '', []);
  const [selectedDayStr, setSelectedDayStr] = useState<string>(todayStr);
  
  // Filtros
  const [selectedAccountId, setSelectedAccountId] = useState<string>('ALL');
  const [selectedType, setSelectedType] = useState<'ALL' | 'INCOME' | 'EXPENSE'>('ALL');
  const [viewMode, setViewMode] = useState<'grid' | 'agenda'>('grid');

  // Modal de adição com data pré-definida
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [dateForAdd, setDateForAdd] = useState<string>(todayStr);

  // Consultas
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
    queryFn: () => api.transactions.getAll({ limit: 2000 }),
  });

  // Funções de navegação do calendário
  const prevMonth = () => {
    setCurrentDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1));
  };

  const goToToday = () => {
    const now = new Date();
    setCurrentDate(new Date(now.getFullYear(), now.getMonth(), 1));
    setSelectedDayStr(todayStr);
  };

  // Mês e Ano formatados
  const monthYearLabel = useMemo(() => {
    const monthNames = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    return `${monthNames[currentDate.getMonth()]} de ${currentDate.getFullYear()}`;
  }, [currentDate]);

  // Transações filtradas por conta e tipo
  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      if (selectedAccountId !== 'ALL' && t.accountId !== selectedAccountId) {
        return false;
      }
      if (selectedType !== 'ALL' && t.type !== selectedType) {
        return false;
      }
      return true;
    });
  }, [transactions, selectedAccountId, selectedType]);

  // Mapa de transações indexadas por data ('YYYY-MM-DD')
  const transactionsByDay = useMemo(() => {
    const map: Record<string, { income: number; expenses: number; items: Transaction[] }> = {};

    filteredTransactions.forEach((t) => {
      const d = t.date instanceof Date ? t.date : new Date(t.date);
      if (isNaN(d.getTime())) return;
      const key = d.toISOString().split('T')[0] ?? '';

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
  }, [filteredTransactions]);

  // Cálculo da grade mensal de dias
  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDayIndex = new Date(year, month, 1).getDay(); // 0 = Domingo
    const totalDaysInMonth = new Date(year, month + 1, 0).getDate();
    const totalDaysInPrevMonth = new Date(year, month, 0).getDate();

    const days: Array<{
      dateStr: string;
      dayNum: number;
      isCurrentMonth: boolean;
      isToday: boolean;
      data?: { income: number; expenses: number; items: Transaction[] };
    }> = [];

    // Dias do mês anterior
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const dayNum = totalDaysInPrevMonth - i;
      const prevDate = new Date(year, month - 1, dayNum);
      const dateStr = prevDate.toISOString().split('T')[0] ?? '';
      days.push({
        dateStr,
        dayNum,
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
        data: transactionsByDay[dateStr],
      });
    }

    // Dias do mês atual
    for (let dayNum = 1; dayNum <= totalDaysInMonth; dayNum++) {
      const curDate = new Date(year, month, dayNum);
      const dateStr = curDate.toISOString().split('T')[0] ?? '';
      days.push({
        dateStr,
        dayNum,
        isCurrentMonth: true,
        isToday: dateStr === todayStr,
        data: transactionsByDay[dateStr],
      });
    }

    // Dias do próximo mês para completar semanas cheias (múltiplo de 7)
    const remainingSlots = 7 - (days.length % 7);
    if (remainingSlots < 7) {
      for (let dayNum = 1; dayNum <= remainingSlots; dayNum++) {
        const nextDate = new Date(year, month + 1, dayNum);
        const dateStr = nextDate.toISOString().split('T')[0] ?? '';
        days.push({
          dateStr,
          dayNum,
          isCurrentMonth: false,
          isToday: dateStr === todayStr,
          data: transactionsByDay[dateStr],
        });
      }
    }

    return days;
  }, [currentDate, transactionsByDay, todayStr]);

  // Totais do mês visível
  const monthTotals = useMemo(() => {
    let income = 0;
    let expenses = 0;
    let daysWithActivity = 0;

    calendarDays.forEach((day) => {
      if (day.isCurrentMonth && day.data) {
        income += day.data.income;
        expenses += day.data.expenses;
        if (day.data.items.length > 0) {
          daysWithActivity++;
        }
      }
    });

    return {
      income,
      expenses,
      net: income - expenses,
      daysWithActivity,
    };
  }, [calendarDays]);

  // Transações do dia selecionado
  const selectedDayData = transactionsByDay[selectedDayStr] || { income: 0, expenses: 0, items: [] };

  // Formatação por extenso do dia selecionado
  const selectedDayFormatted = useMemo(() => {
    if (!selectedDayStr) return '';
    const [y, m, d] = selectedDayStr.split('-').map(Number);
    if (!y || !m || !d) return selectedDayStr;
    const dateObj = new Date(y, m - 1, d);
    return new Intl.DateTimeFormat('pt-BR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }).format(dateObj);
  }, [selectedDayStr]);

  // Abrir modal de adição rápida no dia clicado
  const handleOpenAddForDay = (dayStr: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setDateForAdd(dayStr);
    setSelectedDayStr(dayStr);
    setIsAddModalOpen(true);
  };

  const handleTransactionAdded = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['transactions'] }),
      queryClient.invalidateQueries({ queryKey: ['accounts'] }),
      queryClient.invalidateQueries({ queryKey: ['budgets'] }),
    ]);
    refetchTransactions();
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header Principal */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100 flex items-center gap-2.5">
            <CalendarIcon className="w-6 h-6 text-primary-600" />
            Calendário Financeiro
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Planejamento diário, receitas, despesas e agenda de lançamentos
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Seletor de Conta */}
          <select
            value={selectedAccountId}
            onChange={(e) => setSelectedAccountId(e.target.value)}
            className="h-10 px-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs font-medium text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors shadow-2xs"
          >
            <option value="ALL">Todas as contas</option>
            {accounts.map((acc) => (
              <option key={acc.id} value={acc.id}>
                {acc.name}
              </option>
            ))}
          </select>

          {/* Seletor de Tipo */}
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value as any)}
            className="h-10 px-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs font-medium text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors shadow-2xs"
          >
            <option value="ALL">Todos os tipos</option>
            <option value="EXPENSE">Apenas Despesas</option>
            <option value="INCOME">Apenas Receitas</option>
          </select>

          {/* Toggle Grade vs Agenda */}
          <div className="flex items-center bg-gray-100 dark:bg-gray-750 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={cn(
                'p-2 rounded-lg text-xs font-semibold transition-all',
                viewMode === 'grid'
                  ? 'bg-white dark:bg-gray-850 text-primary-600 dark:text-primary-400 shadow-2xs'
                  : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200'
              )}
              title="Visualização em Grade Mensal"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('agenda')}
              className={cn(
                'p-2 rounded-lg text-xs font-semibold transition-all',
                viewMode === 'agenda'
                  ? 'bg-white dark:bg-gray-850 text-primary-600 dark:text-primary-400 shadow-2xs'
                  : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200'
              )}
              title="Visualização em Linha do Tempo / Agenda"
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          {/* Botão Novo Lançamento */}
          <Button
            onClick={() => handleOpenAddForDay(selectedDayStr)}
            className="gap-2 bg-primary-600 hover:bg-primary-700 text-white font-semibold shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Lançamento</span>
          </Button>
        </div>
      </div>

      {/* Cards de Resumo do Mês */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Receitas */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-750 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">Receitas no Mês</span>
            <span className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-0.5 block">
              {formatCurrency(monthTotals.income)}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <ArrowUpRight className="w-5 h-5" />
          </div>
        </div>

        {/* Despesas */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-750 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">Despesas no Mês</span>
            <span className="text-xl font-bold font-mono text-rose-600 dark:text-rose-400 mt-0.5 block">
              {formatCurrency(monthTotals.expenses)}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center">
            <ArrowDownRight className="w-5 h-5" />
          </div>
        </div>

        {/* Saldo Líquido */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-750 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">Saldo Líquido</span>
            <span className={cn(
              "text-xl font-bold font-mono mt-0.5 block",
              monthTotals.net >= 0 ? "text-indigo-600 dark:text-indigo-400" : "text-rose-600 dark:text-rose-400"
            )}>
              {monthTotals.net >= 0 ? '+' : ''}{formatCurrency(monthTotals.net)}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <Wallet className="w-5 h-5" />
          </div>
        </div>

        {/* Dias com Atividade */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-750 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">Dias Ativos</span>
            <span className="text-xl font-bold font-mono text-gray-900 dark:text-gray-100 mt-0.5 block">
              {monthTotals.daysWithActivity} dias
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <CalendarDays className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Barra de Navegação do Mês */}
      <div className="flex items-center justify-between bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-750 shadow-xs">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={prevMonth}
            className="p-2 rounded-xl text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            title="Mês Anterior"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={nextMonth}
            className="p-2 rounded-xl text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            title="Próximo Mês"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 capitalize ml-2">
            {monthYearLabel}
          </h2>
        </div>

        <button
          type="button"
          onClick={goToToday}
          className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-650 transition-colors"
        >
          Hoje
        </button>
      </div>

      {/* Layout Principal: Calendário + Painel Lateral */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Coluna da Esquerda (2 cols): Grade ou Agenda */}
        <div className="lg:col-span-2">
          {viewMode === 'grid' ? (
            /* Grade Mensal */
            <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-750 p-5 shadow-xs overflow-hidden">
              {/* Dias da Semana (Cabeçalho) */}
              <div className="grid grid-cols-7 gap-2 mb-2 text-center">
                {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((dw, idx) => (
                  <div 
                    key={dw} 
                    className={cn(
                      "text-xs font-bold py-1 uppercase tracking-wider",
                      idx === 0 || idx === 6 ? "text-amber-500/80" : "text-gray-400"
                    )}
                  >
                    {dw}
                  </div>
                ))}
              </div>

              {/* Grade de Células de Dias */}
              <div className="grid grid-cols-7 gap-2">
                {calendarDays.map((day) => {
                  const isSelected = day.dateStr === selectedDayStr;
                  const hasIncome = day.data && day.data.income > 0;
                  const hasExpenses = day.data && day.data.expenses > 0;
                  const count = day.data?.items.length || 0;

                  return (
                    <div
                      key={day.dateStr}
                      onClick={() => setSelectedDayStr(day.dateStr)}
                      className={cn(
                        "group min-h-[92px] sm:min-h-[105px] p-2 rounded-2xl border transition-all duration-150 flex flex-col justify-between cursor-pointer relative",
                        !day.isCurrentMonth
                          ? "bg-gray-50/50 dark:bg-gray-850/40 border-transparent text-gray-300 dark:text-gray-600 opacity-60 hover:opacity-100"
                          : isSelected
                          ? "bg-primary-50/40 dark:bg-primary-950/40 border-primary-500 ring-2 ring-primary-500/20 shadow-xs"
                          : "bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-750/80 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-2xs"
                      )}
                    >
                      {/* Topo da Célula: Número do Dia + Botão + */}
                      <div className="flex items-center justify-between">
                        <span
                          className={cn(
                            "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all",
                            day.isToday
                              ? "bg-primary-600 text-white shadow-xs shadow-primary-600/40"
                              : isSelected
                              ? "text-primary-600 dark:text-primary-400 font-extrabold"
                              : "text-gray-700 dark:text-gray-300"
                          )}
                        >
                          {day.dayNum}
                        </span>

                        {/* Botão de adicionar lançamento rápido neste dia (visível no hover) */}
                        <button
                          type="button"
                          onClick={(e) => handleOpenAddForDay(day.dateStr, e)}
                          className="opacity-0 group-hover:opacity-100 w-5 h-5 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-primary-600 hover:text-white dark:hover:bg-primary-600 text-gray-500 dark:text-gray-400 flex items-center justify-center transition-all text-xs"
                          title={`Adicionar lançamento no dia ${day.dayNum}`}
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      {/* Meio/Fundo: Badges de Movimentação Financeira */}
                      <div className="space-y-1 mt-1">
                        {hasIncome && (
                          <div className="truncate px-1.5 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200/50 dark:border-emerald-800/40 text-emerald-700 dark:text-emerald-300 text-[10px] font-mono font-bold flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                            <span className="truncate">+{formatCurrency(day.data!.income)}</span>
                          </div>
                        )}

                        {hasExpenses && (
                          <div className="truncate px-1.5 py-0.5 rounded-md bg-rose-50 dark:bg-rose-950/50 border border-rose-200/50 dark:border-rose-800/40 text-rose-700 dark:text-rose-300 text-[10px] font-mono font-bold flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                            <span className="truncate">-{formatCurrency(day.data!.expenses)}</span>
                          </div>
                        )}

                        {count === 0 && (
                          <div className="h-4" />
                        )}
                      </div>

                      {/* Contador de Transações discretíssimo */}
                      {count > 1 && (
                        <div className="text-[9px] font-semibold text-gray-400 text-right pr-0.5">
                          {count} itens
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* Visualização em Agenda / Linha do Tempo */
            <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-750 p-6 shadow-xs space-y-6">
              <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">
                Agenda de Lançamentos do Mês
              </h3>

              {calendarDays.filter((d) => d.isCurrentMonth && (d.data?.items?.length || 0) > 0).length === 0 ? (
                <div className="py-16 text-center text-gray-400">
                  <CalendarIcon className="w-10 h-10 mx-auto mb-2 opacity-40" />
                  <p className="text-sm font-semibold">Nenhum lançamento registrado neste mês</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {calendarDays
                    .filter((d) => d.isCurrentMonth && (d.data?.items?.length || 0) > 0)
                    .map((day) => (
                      <div 
                        key={day.dateStr}
                        onClick={() => setSelectedDayStr(day.dateStr)}
                        className={cn(
                          "p-4 rounded-2xl border transition-all cursor-pointer",
                          selectedDayStr === day.dateStr
                            ? "border-primary-500 bg-primary-50/20 dark:bg-primary-950/20 ring-1 ring-primary-500"
                            : "border-gray-100 dark:border-gray-750 hover:border-gray-300 dark:hover:border-gray-700"
                        )}
                      >
                        <div className="flex items-center justify-between mb-3 border-b border-gray-100 dark:border-gray-750 pb-2">
                          <div className="flex items-center gap-2">
                            <span className="w-7 h-7 rounded-xl bg-primary-100 dark:bg-primary-950/60 text-primary-600 dark:text-primary-400 font-bold text-xs flex items-center justify-center">
                              {day.dayNum}
                            </span>
                            <span className="font-semibold text-sm text-gray-800 dark:text-gray-200">
                              {new Date(day.dateStr + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'short' })}
                            </span>
                          </div>

                          <div className="flex items-center gap-3 text-xs font-mono font-bold">
                            {day.data!.income > 0 && (
                              <span className="text-emerald-600 dark:text-emerald-400">
                                +{formatCurrency(day.data!.income)}
                              </span>
                            )}
                            {day.data!.expenses > 0 && (
                              <span className="text-rose-600 dark:text-rose-400">
                                -{formatCurrency(day.data!.expenses)}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="space-y-2">
                          {day.data!.items.map((item) => {
                            const cat = categories.find((c) => c.id === item.categoryId);
                            return (
                              <div key={item.id} className="flex items-center justify-between text-xs py-1">
                                <div className="flex items-center gap-2 min-w-0">
                                  <span 
                                    className="w-2 h-2 rounded-full shrink-0"
                                    style={{ backgroundColor: cat?.color || '#3b82f6' }}
                                  />
                                  <span className="text-gray-800 dark:text-gray-200 font-medium truncate">
                                    {item.description || cat?.name || 'Sem descrição'}
                                  </span>
                                  <span className="text-gray-400 text-[11px] truncate">
                                    ({cat?.name || 'Geral'})
                                  </span>
                                </div>
                                <span className={cn(
                                  "font-mono font-bold shrink-0 ml-2",
                                  item.type === 'INCOME' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                                )}>
                                  {item.type === 'INCOME' ? '+' : '-'}{formatCurrency(Math.abs(item.amountCents))}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Coluna da Direita (1 col): Painel de Detalhes do Dia Selecionado */}
        <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-750 p-6 shadow-xs space-y-5 sticky top-6">
          {/* Header do Dia Selecionado */}
          <div className="flex items-start justify-between border-b border-gray-100 dark:border-gray-750 pb-4">
            <div>
              <span className="text-[11px] font-bold text-primary-600 dark:text-primary-400 uppercase tracking-wider block">
                Detalhes do Dia
              </span>
              <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 capitalize mt-0.5">
                {selectedDayFormatted}
              </h3>
            </div>

            <Button
              size="sm"
              onClick={() => handleOpenAddForDay(selectedDayStr)}
              className="gap-1.5 bg-primary-50 dark:bg-primary-950/50 hover:bg-primary-100 text-primary-600 dark:text-primary-400 border border-primary-200 dark:border-primary-800 text-xs font-semibold"
            >
              <Plus className="w-3.5 h-3.5" />
              Lançamento
            </Button>
          </div>

          {/* Mini Resumo do Dia */}
          <div className="grid grid-cols-2 gap-3 p-3.5 bg-gray-50 dark:bg-gray-850/60 rounded-2xl border border-gray-100 dark:border-gray-750/80">
            <div>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Entradas</span>
              <span className="text-sm font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-0.5 block">
                +{formatCurrency(selectedDayData.income)}
              </span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Saídas</span>
              <span className="text-sm font-bold font-mono text-rose-600 dark:text-rose-400 mt-0.5 block">
                -{formatCurrency(selectedDayData.expenses)}
              </span>
            </div>
          </div>

          {/* Lista de Transações do Dia */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center justify-between">
              <span>Lançamentos ({selectedDayData.items.length})</span>
            </h4>

            {selectedDayData.items.length === 0 ? (
              <div className="py-12 text-center text-gray-400 space-y-2">
                <Clock className="w-8 h-8 mx-auto opacity-40 text-gray-400" />
                <p className="text-xs font-medium text-gray-500">Nenhum lançamento neste dia</p>
                <button
                  type="button"
                  onClick={() => handleOpenAddForDay(selectedDayStr)}
                  className="text-xs text-primary-600 hover:text-primary-700 font-semibold underline"
                >
                  Registrar transação agora
                </button>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
                {selectedDayData.items.map((t) => {
                  const cat = categories.find((c) => c.id === t.categoryId);
                  const acc = accounts.find((a) => a.id === t.accountId);
                  const isIncome = t.type === 'INCOME';

                  return (
                    <div
                      key={t.id}
                      className="p-3.5 rounded-2xl border border-gray-100 dark:border-gray-750 bg-white dark:bg-gray-800/80 hover:bg-gray-50 dark:hover:bg-gray-750/50 transition-colors space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div 
                            className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-2xs"
                            style={{ 
                              backgroundColor: (cat?.color || '#3b82f6') + '20',
                              color: cat?.color || '#3b82f6'
                            }}
                          >
                            <Tag className="w-4 h-4" />
                          </div>

                          <div className="min-w-0">
                            <p className="text-xs font-bold text-gray-900 dark:text-gray-100 truncate">
                              {t.description || cat?.name || 'Sem descrição'}
                            </p>
                            <p className="text-[11px] text-gray-400 truncate">
                              {cat?.name || 'Sem categoria'}
                            </p>
                          </div>
                        </div>

                        <span className={cn(
                          "font-mono font-bold text-xs shrink-0",
                          isIncome ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                        )}>
                          {isIncome ? '+' : '-'}{formatCurrency(Math.abs(t.amountCents))}
                        </span>
                      </div>

                      {/* Rodapé do Item: Conta e Status */}
                      <div className="flex items-center justify-between text-[11px] text-gray-400 pt-1.5 border-t border-gray-50 dark:border-gray-750/60">
                        <span className="flex items-center gap-1 truncate max-w-[140px]">
                          <Landmark className="w-3 h-3 shrink-0" />
                          <span className="truncate">{acc?.name || 'Conta Geral'}</span>
                        </span>

                        <span className="flex items-center gap-1 font-medium text-[10px] uppercase">
                          {t.status === 'PAID' ? (
                            <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> Pago
                            </span>
                          ) : (
                            <span className="text-amber-500 flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" /> Pendente
                            </span>
                          )}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal de Criação de Lançamento com Data Pré-selecionada */}
      <QuickAddTransactionModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onTransactionAdded={handleTransactionAdded}
        defaultAccountId={selectedAccountId !== 'ALL' ? selectedAccountId : accounts[0]?.id}
        defaultDate={dateForAdd}
      />
    </div>
  );
};

export default CalendarPage;
