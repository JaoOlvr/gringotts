import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Calendar as CalendarIcon, Landmark, Layers } from 'lucide-react';
import { api } from '../../lib/ipc';
import { formatCurrency } from '../../lib/utils';
import { CardGrid } from './components/CardGrid';
import { ExpensesChart } from './components/ExpensesChart';
import { IncomeExpensesChart } from './components/IncomeExpensesChart';
import { MonthlyBalanceChart } from './components/MonthlyBalanceChart';
import { RecentTransactions } from './components/RecentTransactions';
import { BudgetsStatus } from './components/BudgetsStatus';
import { GoalsProgress } from './components/GoalsProgress';
import type { Account, Category, Transaction, Budget, Goal } from '../../types';

export const DashboardPage: React.FC = () => {
  const [selectedAccountId, setSelectedAccountId] = useState<string>('all');

  const { currentMonth, currentYear } = useMemo(() => {
    const now = new Date();
    return {
      currentMonth: now.getMonth() + 1,
      currentYear: now.getFullYear()
    };
  }, []);

  const {
    data: accounts = [],
    isLoading: accountsLoading,
    error: accountsError,
  } = useQuery<Account[]>({
    queryKey: ['accounts'],
    queryFn: () => api.accounts.getAll(),
  });

  const {
    data: categories = [],
    isLoading: categoriesLoading,
    error: categoriesError,
  } = useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: () => api.categories.getAll(),
  });

  const {
    data: transactions = [],
    isLoading: transactionsLoading,
    error: transactionsError,
  } = useQuery<Transaction[]>({
    queryKey: ['transactions', 'current-month', currentMonth, currentYear],
    queryFn: () => api.transactions.getAll({ limit: 1000 }),
  });

  const {
    data: budgets = [],
    isLoading: budgetsLoading,
    error: budgetsError,
  } = useQuery<Budget[]>({
    queryKey: ['budgets', 'current-month', currentMonth, currentYear],
    queryFn: () => api.budgets.getAll(),
  });

  const {
    data: goals = [],
    isLoading: goalsLoading,
    error: goalsError,
  } = useQuery<Goal[]>({
    queryKey: ['goals'],
    queryFn: () => api.goals.getAll(),
  });

  const {
    data: recentTransactions = [],
    isLoading: recentLoading,
    error: recentError,
  } = useQuery<Transaction[]>({
    queryKey: ['recent-transactions'],
    queryFn: () => api.transactions.getAll({ limit: 15 }),
  });

  const isLoading = accountsLoading || categoriesLoading || transactionsLoading || budgetsLoading || goalsLoading || recentLoading;
  const error = accountsError || categoriesError || transactionsError || budgetsError || goalsError || recentError;

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[50vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          <p className="text-sm text-gray-500">Carregando painel financeiro...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="p-4 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-xl text-rose-600 dark:text-rose-400 text-sm">
          Erro ao carregar dashboard: {error instanceof Error ? error.message : String(error)}
        </div>
      </div>
    );
  }

  // Contas ativas
  const activeAccounts = accounts.filter((acc: Account) => acc.isActive);
  const activeAccountsIncluded = activeAccounts.filter((acc: Account) => acc.includeInTotal !== false);
  const includedAccountIds = new Set(activeAccountsIncluded.map((acc: Account) => acc.id));

  // Conta selecionada para visualização individual (ou 'all' para consolidado)
  const isIndividualAccount = selectedAccountId !== 'all';
  const targetAccount = isIndividualAccount ? activeAccounts.find((a: Account) => a.id === selectedAccountId) || null : null;

  // Saldo exibido
  const totalBalance = targetAccount 
    ? targetAccount.balanceCents 
    : activeAccountsIncluded.reduce((sum: number, acc: Account) => sum + acc.balanceCents, 0);

  // Transações operacionais filtradas
  const operationalTransactions = transactions.filter((t: Transaction) => {
    // Se estiver filtrando por conta específica, descarta qualquer transação de outras contas
    if (targetAccount) {
      if (t.accountId !== targetAccount.id) return false;
    } else {
      // No consolidado, só aceita transações das contas configuradas para somar
      if (!includedAccountIds.has(t.accountId)) return false;
    }

    // Saldo inicial não deve inflar a receita operacional do mês
    const isInitialBalance = 
      (t.tags && t.tags.includes('saldo-inicial')) || 
      (!!t.description && t.description.toLowerCase().startsWith('saldo inicial'));

    if (t.type === 'INCOME' && isInitialBalance) {
      return false;
    }

    return true;
  });

  const incomeThisMonth = operationalTransactions
    .filter((t: Transaction) => t.type === 'INCOME')
    .reduce((sum: number, t: Transaction) => sum + t.amountCents, 0);

  const expensesThisMonth = operationalTransactions
    .filter((t: Transaction) => t.type === 'EXPENSE')
    .reduce((sum: number, t: Transaction) => sum + Math.abs(t.amountCents), 0);

  const netThisMonth = incomeThisMonth - expensesThisMonth;
  const savingsRate = incomeThisMonth > 0 ? (netThisMonth / incomeThisMonth) * 100 : 0;

  // Lançamentos recentes respeitando o filtro de conta
  const filteredRecentTransactions = recentTransactions.filter((t: Transaction) => {
    if (targetAccount) return t.accountId === targetAccount.id;
    return includedAccountIds.has(t.accountId);
  });

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6" aria-label="Dashboard">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100" id="dashboard-heading">
            Dashboard
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Visão Geral do seu fluxo de caixa e finanças
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Seletor de Carteira / Modo de Visualização */}
          <div className="flex items-center gap-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-1.5 px-3 rounded-2xl shadow-2xs">
            <Landmark className="w-4 h-4 text-primary-500 shrink-0" />
            <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">
              Visualizar:
            </span>
            <select
              value={selectedAccountId}
              onChange={(e) => setSelectedAccountId(e.target.value)}
              className="bg-gray-50 dark:bg-gray-750 text-xs font-semibold text-gray-900 dark:text-gray-100 rounded-xl px-3 py-1.5 border border-gray-200 dark:border-gray-600 focus:outline-hidden focus:ring-2 focus:ring-primary-500 cursor-pointer"
              aria-label="Selecionar conta para filtrar o Dashboard"
            >
              <option value="all">
                🏦 Todas as Contas ({activeAccountsIncluded.length} somadas)
              </option>
              <optgroup label="Contas Individuais">
                {activeAccounts.map((acc: Account) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.includeInTotal === false ? '🔒 ' : '💳 '}
                    {acc.name} — {formatCurrency(acc.balanceCents, acc.currency)} {acc.includeInTotal === false ? '(Isolada)' : ''}
                  </option>
                ))}
              </optgroup>
            </select>
          </div>

          <Link
            to="/calendar"
            className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-primary-500 dark:hover:border-primary-500 text-xs font-semibold text-gray-700 dark:text-gray-200 shadow-2xs hover:shadow-xs transition-all"
          >
            <CalendarIcon className="w-4 h-4 text-primary-600 dark:text-primary-400" />
            <span>Calendário</span>
          </Link>
        </div>
      </div>

      {/* Banner Informativo de Contexto */}
      {targetAccount ? (
        <div className="flex items-center justify-between p-3.5 px-5 rounded-2xl bg-primary-50 dark:bg-primary-950/40 border border-primary-200 dark:border-primary-900 text-xs text-primary-900 dark:text-primary-200 animate-in fade-in duration-200">
          <div className="flex items-center gap-2.5">
            <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: targetAccount.color || '#3b82f6' }} />
            <span>
              Filtrando Dashboard por <strong>{targetAccount.name}</strong>. Exibindo apenas o saldo e lançamentos desta carteira.
              {targetAccount.includeInTotal === false && (
                <span className="ml-1 text-amber-600 dark:text-amber-400 font-semibold">(Esta conta está isolada do consolidado)</span>
              )}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setSelectedAccountId('all')}
            className="font-bold underline hover:text-primary-600 dark:hover:text-primary-400 cursor-pointer ml-3 shrink-0"
          >
            Ver Todas as Contas
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-between p-2.5 px-4 rounded-2xl bg-gray-50 dark:bg-gray-800/80 border border-gray-200/70 dark:border-gray-700/60 text-xs text-gray-600 dark:text-gray-400">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-blue-500 shrink-0" />
            <span>
              Visão Consolidada: somando <strong>{activeAccountsIncluded.length}</strong> {activeAccountsIncluded.length === 1 ? 'carteira' : 'carteiras'}.
              {activeAccounts.length - activeAccountsIncluded.length > 0 && (
                <span className="ml-1 text-amber-600 dark:text-amber-400 font-medium">
                  ({activeAccounts.length - activeAccountsIncluded.length} {activeAccounts.length - activeAccountsIncluded.length === 1 ? 'carteira isolada' : 'carteiras isoladas'} não {activeAccounts.length - activeAccountsIncluded.length === 1 ? 'está' : 'estão'} sendo somadas)
                </span>
              )}
            </span>
          </div>
          <Link to="/accounts" className="text-primary-600 dark:text-primary-400 hover:underline font-semibold shrink-0">
            Gerenciar contas →
          </Link>
        </div>
      )}
      
      <CardGrid 
        totalBalance={totalBalance}
        incomeThisMonth={incomeThisMonth}
        expensesThisMonth={expensesThisMonth}
        netThisMonth={netThisMonth}
        savingsRate={savingsRate}
      />
      
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ExpensesChart 
          transactions={operationalTransactions}
          categories={categories}
        />
        <IncomeExpensesChart 
          transactions={operationalTransactions}
          categories={categories}
        />
      </div>

      <MonthlyBalanceChart 
        transactions={operationalTransactions}
      />
      
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <BudgetsStatus 
          budgets={budgets}
          transactions={operationalTransactions}
          categories={categories}
          currentMonth={currentMonth}
          currentYear={currentYear}
        />
        <GoalsProgress 
          goals={goals}
          accounts={accounts}
        />
      </div>
      
      <div>
        <RecentTransactions 
          transactions={filteredRecentTransactions}
          accounts={accounts}
          categories={categories}
        />
      </div>
    </div>
  );
};

export default DashboardPage;
