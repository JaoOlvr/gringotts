import React, { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend
} from 'recharts';
import { formatCurrency } from '../../../lib/utils';
import { 
  Sparkles, 
  BarChart2, 
  Percent, 
  TrendingUp, 
  Award,
  ArrowUpRight,
  ShieldCheck 
} from 'lucide-react';
import type { Transaction } from '../../../types';

interface MonthlyBalanceChartProps {
  transactions: Transaction[];
}

export const MonthlyBalanceChart: React.FC<MonthlyBalanceChartProps> = ({ transactions }) => {
  const [metricView, setMetricView] = useState<'savingsRate' | 'netBalance'>('savingsRate');

  const { monthlyData, bestMonth, averages } = useMemo(() => {
    const monthsMap: Record<string, { label: string; income: number; expenses: number; net: number; savingsRate: number; dateKey: string }> = {};
    const now = new Date();
    const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthsMap[key] = {
        label: `${monthNames[d.getMonth()]}/${String(d.getFullYear()).slice(-2)}`,
        income: 0,
        expenses: 0,
        net: 0,
        savingsRate: 0,
        dateKey: key,
      };
    }

    const parseDate = (dateVal: any): Date => {
      if (dateVal instanceof Date) return dateVal;
      const parsed = new Date(dateVal);
      return isNaN(parsed.getTime()) ? new Date() : parsed;
    };

    transactions.forEach((t) => {
      const dt = parseDate(t.date);
      const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
      if (monthsMap[key]) {
        const val = Math.abs(t.amountCents);
        if (t.type === 'INCOME') {
          monthsMap[key].income += val;
        } else if (t.type === 'EXPENSE') {
          monthsMap[key].expenses += val;
        }
      }
    });

    let bestRate = -Infinity;
    let bestMonthName = '';
    let totalIncome = 0;
    let totalExpenses = 0;

    const list = Object.values(monthsMap).map((item) => {
      item.net = item.income - item.expenses;
      item.savingsRate = item.income > 0 ? Number(((item.net / item.income) * 100).toFixed(1)) : 0;

      totalIncome += item.income;
      totalExpenses += item.expenses;

      if (item.savingsRate > bestRate && item.income > 0) {
        bestRate = item.savingsRate;
        bestMonthName = item.label;
      }

      return item;
    });

    return {
      monthlyData: list,
      bestMonth: bestRate > 0 ? { label: bestMonthName, rate: bestRate } : null,
      averages: {
        income: Math.round(totalIncome / 6),
        expenses: Math.round(totalExpenses / 6),
      },
    };
  }, [transactions]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;
    const item = payload[0]?.payload;
    if (!item) return null;

    return (
      <div className="bg-gray-900/95 border border-gray-700/80 p-3.5 rounded-2xl shadow-xl backdrop-blur-md text-xs text-gray-100 min-w-[210px] space-y-2 select-none">
        <div className="font-semibold text-gray-300 border-b border-gray-800 pb-1.5 flex items-center justify-between">
          <span>{label}</span>
          <span className="text-[10px] text-gray-500 uppercase tracking-wider">Histórico</span>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-3">
            <span className="text-emerald-400 font-medium">Receitas:</span>
            <span className="font-mono font-bold text-emerald-300">
              {formatCurrency(item.income)}
            </span>
          </div>

          <div className="flex items-center justify-between gap-3">
            <span className="text-rose-400 font-medium">Despesas:</span>
            <span className="font-mono font-bold text-rose-300">
              {formatCurrency(item.expenses)}
            </span>
          </div>

          <div className="border-t border-gray-800 pt-1.5 flex items-center justify-between gap-3">
            <span className="text-gray-400">Resultado Líquido:</span>
            <span className={`font-mono font-bold ${item.net >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {item.net >= 0 ? '+' : ''}{formatCurrency(item.net)}
            </span>
          </div>

          <div className="border-t border-gray-800/60 pt-1 flex items-center justify-between gap-3 text-[11px]">
            <span className="text-indigo-300">Taxa de Poupança:</span>
            <span className={`font-mono font-bold ${item.savingsRate >= 0 ? 'text-indigo-300' : 'text-amber-400'}`}>
              {item.savingsRate}%
            </span>
          </div>
        </div>
      </div>
    );
  };

  const hasAnyData = monthlyData.some((m) => m.income > 0 || m.expenses > 0);

  if (!hasAnyData) {
    return null;
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-750 p-6 shadow-xs transition-all">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <div>
          <h2 className="text-base font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-primary-500" />
            Balanço Mensal Histórico (Últimos 6 Meses)
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Consistência financeira, comparativo de meses e taxa de poupança
          </p>
        </div>

        <div className="flex items-center gap-3">
          {bestMonth && (
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200/60 dark:border-amber-800/40 text-amber-700 dark:text-amber-300 text-xs font-semibold">
              <Award className="w-3.5 h-3.5 text-amber-500" />
              <span>Melhor mês: {bestMonth.label} ({bestMonth.rate}%)</span>
            </div>
          )}

          {/* Seletor de Linha Sobreposta (Taxa de Poupança vs Saldo Líquido) */}
          <div className="flex items-center bg-gray-100 dark:bg-gray-700/60 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setMetricView('savingsRate')}
              className={`flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg transition-all ${
                metricView === 'savingsRate'
                  ? 'bg-white dark:bg-gray-800 text-indigo-600 dark:text-indigo-400 shadow-2xs'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
              }`}
            >
              <Percent className="w-3 h-3" />
              Poupança %
            </button>
            <button
              type="button"
              onClick={() => setMetricView('netBalance')}
              className={`flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg transition-all ${
                metricView === 'netBalance'
                  ? 'bg-white dark:bg-gray-800 text-indigo-600 dark:text-indigo-400 shadow-2xs'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
              }`}
            >
              <TrendingUp className="w-3 h-3" />
              Líquido R$
            </button>
          </div>
        </div>
      </div>

      {/* Gráfico Composto */}
      <div className="w-full h-64 pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={monthlyData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.15} vertical={false} />
            <XAxis 
              dataKey="label" 
              tick={{ fontSize: 11, fill: '#888' }} 
              axisLine={false} 
              tickLine={false} 
            />
            <YAxis 
              yAxisId="left"
              tick={{ fontSize: 10, fill: '#888' }} 
              axisLine={false} 
              tickLine={false}
              tickFormatter={(val) => `R$ ${(val / 100).toFixed(0)}`}
            />
            {metricView === 'savingsRate' && (
              <YAxis 
                yAxisId="right"
                orientation="right"
                tick={{ fontSize: 10, fill: '#6366f1' }} 
                axisLine={false} 
                tickLine={false}
                tickFormatter={(val) => `${val}%`}
              />
            )}
            <Tooltip content={<CustomTooltip />} />
            <Legend 
              verticalAlign="top" 
              align="right" 
              wrapperStyle={{ paddingBottom: '10px', fontSize: '11px' }} 
            />
            <Bar 
              yAxisId="left"
              dataKey="income" 
              name="Receitas" 
              fill="#10b981" 
              radius={[5, 5, 0, 0]} 
              maxBarSize={28} 
            />
            <Bar 
              yAxisId="left"
              dataKey="expenses" 
              name="Despesas" 
              fill="#ef4444" 
              radius={[5, 5, 0, 0]} 
              maxBarSize={28} 
            />
            {metricView === 'savingsRate' ? (
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="savingsRate"
                name="Taxa de Poupança (%)"
                stroke="#6366f1"
                strokeWidth={3}
                dot={{ r: 4, fill: '#6366f1' }}
                activeDot={{ r: 6 }}
              />
            ) : (
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="net"
                name="Saldo Líquido"
                stroke="#6366f1"
                strokeWidth={3}
                dot={{ r: 4, fill: '#6366f1' }}
                activeDot={{ r: 6 }}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Footer de Médias Mensais */}
      <div className="pt-3 mt-3 border-t border-gray-100 dark:border-gray-750 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-4 text-gray-500 dark:text-gray-400">
          <span>Média mensal de receitas: <strong className="text-emerald-600 dark:text-emerald-400 font-mono">{formatCurrency(averages.income)}</strong></span>
          <span>Média mensal de despesas: <strong className="text-rose-600 dark:text-rose-400 font-mono">{formatCurrency(averages.expenses)}</strong></span>
        </div>

        <div className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 font-medium">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Controle de saúde financeira contínuo</span>
        </div>
      </div>
    </div>
  );
};

export default MonthlyBalanceChart;
