import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  ComposedChart,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend
} from 'recharts';
import { formatCurrency } from '../../../lib/utils';
import { 
  AreaChart as AreaIcon, 
  BarChart3, 
  TrendingUp, 
  Layers, 
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Wallet
} from 'lucide-react';
import type { Transaction, Category } from '../../../types';

type ChartType = 'area' | 'bar' | 'line' | 'composed';
type TimeGrouping = 'daily' | 'weekly' | 'monthly';

interface IncomeExpensesChartProps {
  transactions: Transaction[];
  categories: Category[];
}

export const IncomeExpensesChart: React.FC<IncomeExpensesChartProps> = ({ transactions }) => {
  const [chartType, setChartType] = useState<ChartType>('area');
  const [timeGrouping, setTimeGrouping] = useState<TimeGrouping>('daily');

  // Processamento e agrupamento dos dados conforme o período escolhido
  const { chartData, totals } = useMemo(() => {
    let incomeSum = 0;
    let expenseSum = 0;

    const parseDate = (dateVal: any): Date => {
      if (dateVal instanceof Date) return dateVal;
      const parsed = new Date(dateVal);
      return isNaN(parsed.getTime()) ? new Date() : parsed;
    };

    if (timeGrouping === 'monthly') {
      // Últimos 6 meses
      const monthsMap: Record<string, { label: string; income: number; expenses: number; net: number; dateKey: string }> = {};
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
          dateKey: key,
        };
      }

      transactions.forEach((t) => {
        const dt = parseDate(t.date);
        const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
        if (monthsMap[key]) {
          const val = Math.abs(t.amountCents);
          if (t.type === 'INCOME') {
            monthsMap[key].income += val;
            incomeSum += val;
          } else if (t.type === 'EXPENSE') {
            monthsMap[key].expenses += val;
            expenseSum += val;
          }
        }
      });

      const list = Object.values(monthsMap).map((m) => ({
        ...m,
        net: m.income - m.expenses,
      }));

      // Saldo acumulado
      let running = 0;
      const withCumulative = list.map((item) => {
        running += item.net;
        return { ...item, cumulative: running };
      });

      return { chartData: withCumulative, totals: { income: incomeSum, expenses: expenseSum, net: incomeSum - expenseSum } };
    }

    if (timeGrouping === 'weekly') {
      // 5 semanas do mês atual
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();

      const weeks = [
        { label: 'Semana 1 (1-7)', income: 0, expenses: 0, net: 0, cumulative: 0 },
        { label: 'Semana 2 (8-14)', income: 0, expenses: 0, net: 0, cumulative: 0 },
        { label: 'Semana 3 (15-21)', income: 0, expenses: 0, net: 0, cumulative: 0 },
        { label: 'Semana 4 (22-28)', income: 0, expenses: 0, net: 0, cumulative: 0 },
        { label: 'Semana 5 (29+)', income: 0, expenses: 0, net: 0, cumulative: 0 },
      ];

      transactions.forEach((t) => {
        const dt = parseDate(t.date);
        if (dt.getMonth() === currentMonth && dt.getFullYear() === currentYear) {
          const day = dt.getDate();
          let weekIndex = 0;
          if (day <= 7) weekIndex = 0;
          else if (day <= 14) weekIndex = 1;
          else if (day <= 21) weekIndex = 2;
          else if (day <= 28) weekIndex = 3;
          else weekIndex = 4;

          const val = Math.abs(t.amountCents);
          if (t.type === 'INCOME') {
            weeks[weekIndex].income += val;
            incomeSum += val;
          } else if (t.type === 'EXPENSE') {
            weeks[weekIndex].expenses += val;
            expenseSum += val;
          }
        }
      });

      let running = 0;
      const list = weeks.map((w) => {
        w.net = w.income - w.expenses;
        running += w.net;
        w.cumulative = running;
        return w;
      });

      return { chartData: list, totals: { income: incomeSum, expenses: expenseSum, net: incomeSum - expenseSum } };
    }

    // Default: Diário (Mês Atual)
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

    const daysMap: Record<number, { label: string; income: number; expenses: number; net: number; cumulative: number }> = {};
    for (let day = 1; day <= daysInMonth; day++) {
      daysMap[day] = {
        label: `Dia ${day}`,
        income: 0,
        expenses: 0,
        net: 0,
        cumulative: 0,
      };
    }

    transactions.forEach((t) => {
      const dt = parseDate(t.date);
      if (dt.getMonth() === currentMonth && dt.getFullYear() === currentYear) {
        const day = dt.getDate();
        if (daysMap[day]) {
          const val = Math.abs(t.amountCents);
          if (t.type === 'INCOME') {
            daysMap[day].income += val;
            incomeSum += val;
          } else if (t.type === 'EXPENSE') {
            daysMap[day].expenses += val;
            expenseSum += val;
          }
        }
      }
    });

    let running = 0;
    const list = Object.entries(daysMap).map(([dayNum, d]) => {
      d.net = d.income - d.expenses;
      running += d.net;
      d.cumulative = running;
      return {
        ...d,
        day: Number(dayNum),
      };
    });

    return { chartData: list, totals: { income: incomeSum, expenses: expenseSum, net: incomeSum - expenseSum } };
  }, [transactions, timeGrouping]);

  // Custom Tooltip estilizado para o visual Denaro
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;

    const dataItem = payload[0]?.payload;
    const income = dataItem?.income || 0;
    const expenses = dataItem?.expenses || 0;
    const net = dataItem?.net || (income - expenses);
    const cumulative = dataItem?.cumulative;

    return (
      <div className="bg-gray-900/95 border border-gray-700/80 p-3.5 rounded-2xl shadow-2xl backdrop-blur-md text-xs text-gray-100 min-w-[200px] select-none space-y-2">
        <div className="font-semibold text-gray-300 border-b border-gray-800 pb-1.5 flex items-center justify-between">
          <span>{label}</span>
          <span className="text-[10px] text-gray-500 uppercase tracking-wider">Fluxo</span>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
              Receitas:
            </span>
            <span className="font-mono font-bold text-emerald-300">
              {formatCurrency(income)}
            </span>
          </div>

          <div className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-1.5 text-rose-400 font-medium">
              <span className="w-2 h-2 rounded-full bg-rose-500 inline-block"></span>
              Despesas:
            </span>
            <span className="font-mono font-bold text-rose-300">
              {formatCurrency(expenses)}
            </span>
          </div>

          <div className="border-t border-gray-800 pt-1.5 flex items-center justify-between gap-3">
            <span className="text-gray-400">Resultado Líquido:</span>
            <span className={`font-mono font-bold ${net >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {net >= 0 ? '+' : ''}{formatCurrency(net)}
            </span>
          </div>

          {cumulative !== undefined && (
            <div className="border-t border-gray-800/60 pt-1 flex items-center justify-between gap-3 text-[11px]">
              <span className="text-indigo-300">Saldo Acumulado:</span>
              <span className={`font-mono font-bold ${cumulative >= 0 ? 'text-indigo-300' : 'text-amber-400'}`}>
                {cumulative >= 0 ? '+' : ''}{formatCurrency(cumulative)}
              </span>
            </div>
          )}
        </div>
      </div>
    );
  };

  const hasData = totals.income > 0 || totals.expenses > 0;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-750 p-6 shadow-xs flex flex-col justify-between transition-all">
      {/* Header do Gráfico */}
      <div className="space-y-4 mb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary-500" />
              Fluxo de Caixa: Receitas vs Despesas
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Acompanhamento temporal detalhado de entradas e saídas
            </p>
          </div>

          {/* Seletores de Agrupamento Temporal */}
          <div className="flex items-center bg-gray-100 dark:bg-gray-700/60 p-1 rounded-xl self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setTimeGrouping('daily')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all ${
                timeGrouping === 'daily'
                  ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-2xs'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
              }`}
            >
              Diário
            </button>
            <button
              type="button"
              onClick={() => setTimeGrouping('weekly')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all ${
                timeGrouping === 'weekly'
                  ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-2xs'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
              }`}
            >
              Semanal
            </button>
            <button
              type="button"
              onClick={() => setTimeGrouping('monthly')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all ${
                timeGrouping === 'monthly'
                  ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-2xs'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
              }`}
            >
              Últimos 6 Meses
            </button>
          </div>
        </div>

        {/* Barra de Métricas Rápidas & Seletores de Tipo de Gráfico */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-gray-100 dark:border-gray-750/80">
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block shadow-xs shadow-emerald-500/50" />
              <span className="text-gray-500 dark:text-gray-400">Receitas:</span>
              <span className="font-bold font-mono text-emerald-600 dark:text-emerald-400">
                {formatCurrency(totals.income)}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block shadow-xs shadow-rose-500/50" />
              <span className="text-gray-500 dark:text-gray-400">Despesas:</span>
              <span className="font-bold font-mono text-rose-600 dark:text-rose-400">
                {formatCurrency(totals.expenses)}
              </span>
            </div>

            <div className="hidden sm:flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 inline-block" />
              <span className="text-gray-500 dark:text-gray-400">Líquido:</span>
              <span className={`font-bold font-mono ${totals.net >= 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-rose-600 dark:text-rose-400'}`}>
                {totals.net >= 0 ? '+' : ''}{formatCurrency(totals.net)}
              </span>
            </div>
          </div>

          {/* Seletor de Tipo de Gráfico (Área, Barras, Linha, Composto) */}
          <div className="flex items-center bg-gray-100 dark:bg-gray-700/60 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setChartType('area')}
              className={`p-1.5 rounded-lg transition-all ${
                chartType === 'area'
                  ? 'bg-white dark:bg-gray-800 text-primary-600 dark:text-primary-400 shadow-2xs'
                  : 'text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
              title="Gráfico de Área Suave"
            >
              <AreaIcon className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setChartType('bar')}
              className={`p-1.5 rounded-lg transition-all ${
                chartType === 'bar'
                  ? 'bg-white dark:bg-gray-800 text-primary-600 dark:text-primary-400 shadow-2xs'
                  : 'text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
              title="Gráfico de Barras Agrupadas"
            >
              <BarChart3 className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setChartType('line')}
              className={`p-1.5 rounded-lg transition-all ${
                chartType === 'line'
                  ? 'bg-white dark:bg-gray-800 text-primary-600 dark:text-primary-400 shadow-2xs'
                  : 'text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
              title="Gráfico de Linhas"
            >
              <TrendingUp className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setChartType('composed')}
              className={`p-1.5 rounded-lg transition-all ${
                chartType === 'composed'
                  ? 'bg-white dark:bg-gray-800 text-primary-600 dark:text-primary-400 shadow-2xs'
                  : 'text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
              title="Gráfico Combinado (Barras + Linha de Saldo)"
            >
              <Layers className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Área do Gráfico */}
      {!hasData ? (
        <div className="h-64 flex flex-col items-center justify-center bg-gray-50/50 dark:bg-gray-850/50 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700 p-6 text-center">
          <Wallet className="w-8 h-8 text-gray-400 mb-2 opacity-50" />
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Sem movimentações no período</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
            Lance despesas ou receitas para visualizar seu fluxo gráfico.
          </p>
        </div>
      ) : (
        <div className="w-full h-64 pt-2">
          <ResponsiveContainer width="100%" height="100%">
            {chartType === 'area' ? (
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradientIncome" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="gradientExpenses" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} vertical={false} />
                <XAxis 
                  dataKey="label" 
                  tick={{ fontSize: 10, fill: '#888' }} 
                  axisLine={false} 
                  tickLine={false} 
                />
                <YAxis 
                  tick={{ fontSize: 10, fill: '#888' }} 
                  axisLine={false} 
                  tickLine={false}
                  tickFormatter={(val) => `R$ ${(val / 100).toFixed(0)}`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="income"
                  stroke="#10b981"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#gradientIncome)"
                  name="Receitas"
                />
                <Area
                  type="monotone"
                  dataKey="expenses"
                  stroke="#ef4444"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#gradientExpenses)"
                  name="Despesas"
                />
              </AreaChart>
            ) : chartType === 'bar' ? (
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} vertical={false} />
                <XAxis 
                  dataKey="label" 
                  tick={{ fontSize: 10, fill: '#888' }} 
                  axisLine={false} 
                  tickLine={false} 
                />
                <YAxis 
                  tick={{ fontSize: 10, fill: '#888' }} 
                  axisLine={false} 
                  tickLine={false}
                  tickFormatter={(val) => `R$ ${(val / 100).toFixed(0)}`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="income" fill="#10b981" radius={[4, 4, 0, 0]} name="Receitas" maxBarSize={30} />
                <Bar dataKey="expenses" fill="#ef4444" radius={[4, 4, 0, 0]} name="Despesas" maxBarSize={30} />
              </BarChart>
            ) : chartType === 'line' ? (
              <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} vertical={false} />
                <XAxis 
                  dataKey="label" 
                  tick={{ fontSize: 10, fill: '#888' }} 
                  axisLine={false} 
                  tickLine={false} 
                />
                <YAxis 
                  tick={{ fontSize: 10, fill: '#888' }} 
                  axisLine={false} 
                  tickLine={false}
                  tickFormatter={(val) => `R$ ${(val / 100).toFixed(0)}`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Line 
                  type="monotone" 
                  dataKey="income" 
                  stroke="#10b981" 
                  strokeWidth={3} 
                  dot={{ r: 3, fill: '#10b981' }} 
                  activeDot={{ r: 6 }} 
                  name="Receitas" 
                />
                <Line 
                  type="monotone" 
                  dataKey="expenses" 
                  stroke="#ef4444" 
                  strokeWidth={3} 
                  dot={{ r: 3, fill: '#ef4444' }} 
                  activeDot={{ r: 6 }} 
                  name="Despesas" 
                />
              </LineChart>
            ) : (
              /* Composed Chart: Barras + Linha de Saldo Acumulado */
              <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} vertical={false} />
                <XAxis 
                  dataKey="label" 
                  tick={{ fontSize: 10, fill: '#888' }} 
                  axisLine={false} 
                  tickLine={false} 
                />
                <YAxis 
                  tick={{ fontSize: 10, fill: '#888' }} 
                  axisLine={false} 
                  tickLine={false}
                  tickFormatter={(val) => `R$ ${(val / 100).toFixed(0)}`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="income" fill="#10b981" opacity={0.85} radius={[4, 4, 0, 0]} name="Receitas" maxBarSize={24} />
                <Bar dataKey="expenses" fill="#ef4444" opacity={0.85} radius={[4, 4, 0, 0]} name="Despesas" maxBarSize={24} />
                <Line 
                  type="monotone" 
                  dataKey="cumulative" 
                  stroke="#6366f1" 
                  strokeWidth={2.5} 
                  dot={{ r: 3, fill: '#6366f1' }} 
                  name="Saldo Acumulado" 
                />
              </ComposedChart>
            )}
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};

export default IncomeExpensesChart;
