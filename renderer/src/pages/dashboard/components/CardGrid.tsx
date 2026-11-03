import React from 'react';
import { formatCurrency } from '../../../lib/utils';
import { Wallet, TrendingUp, TrendingDown, PiggyBank } from 'lucide-react';

interface CardGridProps {
  totalBalance: number;
  incomeThisMonth: number;
  expensesThisMonth: number;
  netThisMonth: number;
  savingsRate: number;
}

export const CardGrid: React.FC<CardGridProps> = ({ 
  totalBalance, 
  incomeThisMonth, 
  expensesThisMonth, 
  netThisMonth, 
  savingsRate 
}) => {
  return (
    <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
      {/* Total Balance Card */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-750 shadow-2xs p-4 sm:p-5 flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Saldo Total
            </p>
            <p className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100 mt-1">
              {formatCurrency(totalBalance)}
            </p>
          </div>
          <div className="w-9 h-9 rounded-xl bg-primary-50 dark:bg-primary-950/60 text-primary-600 dark:text-primary-400 flex items-center justify-center shrink-0">
            <Wallet className="w-5 h-5" />
          </div>
        </div>
      </div>
      
      {/* Income This Month Card */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-750 shadow-2xs p-4 sm:p-5 flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Receitas do Mês
            </p>
            <p className="text-xl sm:text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 mt-1">
              {formatCurrency(incomeThisMonth)}
            </p>
          </div>
          <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>
      </div>
      
      {/* Expenses This Month Card */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-750 shadow-2xs p-4 sm:p-5 flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Despesas do Mês
            </p>
            <p className="text-xl sm:text-2xl font-bold tracking-tight text-rose-600 dark:text-rose-400 mt-1">
              {formatCurrency(expensesThisMonth)}
            </p>
          </div>
          <div className="w-9 h-9 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
            <TrendingDown className="w-5 h-5" />
          </div>
        </div>
      </div>
      
      {/* Net This Month / Savings Rate Card */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-750 shadow-2xs p-4 sm:p-5 flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Resultado do Mês
            </p>
            <p className={`text-xl sm:text-2xl font-bold tracking-tight mt-1 ${
              netThisMonth >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
            }`}>
              {formatCurrency(netThisMonth)}
            </p>
          </div>
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
            netThisMonth >= 0 
              ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400' 
              : 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400'
          }`}>
            <PiggyBank className="w-5 h-5" />
          </div>
        </div>
        <div className="mt-2.5 pt-2 border-t border-gray-100 dark:border-gray-750/70 flex items-center justify-between text-xs">
          <span className="text-gray-500 dark:text-gray-400">Poupança:</span>
          <span className={`font-bold ${savingsRate >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
            {savingsRate >= 0 ? '+' : ''}{savingsRate.toFixed(1)}%
          </span>
        </div>
      </div>
    </div>
  );
};

export default CardGrid;
