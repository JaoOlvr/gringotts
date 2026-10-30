import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Calendar as CalendarIcon } from 'lucide-react';
import { api } from '../../lib/ipc';
import { CardGrid } from './components/CardGrid';
import { ExpensesChart } from './components/ExpensesChart';
import { IncomeExpensesChart } from './components/IncomeExpensesChart';
import { MonthlyBalanceChart } from './components/MonthlyBalanceChart';
import { RecentTransactions } from './components/RecentTransactions';
import { BudgetsStatus } from './components/BudgetsStatus';
import { GoalsProgress } from './components/GoalsProgress';
import type { Account, Category, Transaction, Budget, Goal } from '../../types';

export const DashboardPage: React.FC = () => {
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
    queryFn: () => api.transactions.getAll({ limit: 10 }),
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

  const totalBalance = accounts.reduce((sum: number, acc: Account) => sum + acc.balanceCents, 0);
  const incomeThisMonth = transactions.filter((t: Transaction) => t.type === 'INCOME').reduce((sum: number, t: Transaction) => sum + t.amountCents, 0);
  const expensesThisMonth = transactions.filter((t: Transaction) => t.type === 'EXPENSE').reduce((sum: number, t: Transaction) => sum + Math.abs(t.amountCents), 0);
  const netThisMonth = incomeThisMonth - expensesThisMonth;
  const savingsRate = incomeThisMonth > 0 ? (netThisMonth / incomeThisMonth) * 100 : 0;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6" aria-label="Dashboard">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100" id="dashboard-heading">
            Dashboard
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Visão Geral do seu fluxo de caixa e finanças
          </p>
        </div>

        <Link
          to="/calendar"
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-primary-500 dark:hover:border-primary-500 text-xs font-semibold text-gray-700 dark:text-gray-200 shadow-2xs hover:shadow-xs transition-all"
        >
          <CalendarIcon className="w-4 h-4 text-primary-600 dark:text-primary-400" />
          <span>Ver Calendário Financeiro</span>
        </Link>
      </div>
      
      <CardGrid 
        totalBalance={totalBalance}
        incomeThisMonth={incomeThisMonth}
        expensesThisMonth={expensesThisMonth}
        netThisMonth={netThisMonth}
        savingsRate={savingsRate}
      />
      
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ExpensesChart 
          transactions={transactions}
          categories={categories}
        />
        <IncomeExpensesChart 
          transactions={transactions}
          categories={categories}
        />
      </div>

      <MonthlyBalanceChart 
        transactions={transactions}
      />
      
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <BudgetsStatus 
          budgets={budgets}
          transactions={transactions}
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
          transactions={recentTransactions}
          accounts={accounts}
          categories={categories}
        />
      </div>
    </div>
  );
};

export default DashboardPage;
