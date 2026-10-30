import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from 'recharts';
import { formatCurrency } from '../../../lib/utils';
import { 
  PieChart as PieIcon, 
  BarChartHorizontal, 
  CircleDot, 
  Radar as RadarIcon,
  Tag, 
  ArrowDownCircle, 
  ArrowUpCircle,
  TrendingDown
} from 'lucide-react';
import type { Transaction, Category } from '../../../types';

type CategoryChartType = 'donut' | 'ranking' | 'pie' | 'radar';
type FlowType = 'EXPENSE' | 'INCOME';

interface ExpensesChartProps {
  transactions: Transaction[];
  categories: Category[];
}

export const ExpensesChart: React.FC<ExpensesChartProps> = ({ transactions, categories }) => {
  const [chartType, setChartType] = useState<CategoryChartType>('donut');
  const [flowType, setFlowType] = useState<FlowType>('EXPENSE');
  const [activeCategory, setActiveCategory] = useState<{ name: string; value: number; percent: number } | null>(null);

  // Paleta fallback vibrante caso a categoria não tenha cor definida
  const fallbackColors = [
    '#3b82f6', '#ec4899', '#8b5cf6', '#10b981', '#f59e0b',
    '#06b6d4', '#f97316', '#6366f1', '#14b8a6', '#e11d48'
  ];

  // Processamento e agrupamento das categorias conforme o fluxo selecionado
  const { chartData, totalAmount } = useMemo(() => {
    const filtered = transactions.filter((t) => t.type === flowType);
    const categoryTotals: Record<string, number> = {};
    let total = 0;

    filtered.forEach((t) => {
      const catId = t.categoryId || 'uncategorized';
      const val = Math.abs(t.amountCents);
      categoryTotals[catId] = (categoryTotals[catId] || 0) + val;
      total += val;
    });

    const list = Object.entries(categoryTotals).map(([catId, value], index) => {
      const found = categories.find((c) => c.id === catId);
      const name = found?.name || (catId === 'uncategorized' ? 'Outros / Sem Categoria' : 'Geral');
      const color = found?.color || fallbackColors[index % fallbackColors.length] || '#3b82f6';
      const percent = total > 0 ? (value / total) * 100 : 0;

      return {
        id: catId,
        name,
        value,
        color,
        percent,
      };
    });

    // Ordenar do maior para o menor
    list.sort((a, b) => b.value - a.value);

    return { chartData: list, totalAmount: total };
  }, [transactions, categories, flowType]);

  // Tooltip customizado
  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null;
    const item = payload[0]?.payload;
    if (!item) return null;

    return (
      <div className="bg-gray-900/95 border border-gray-700/80 p-3 rounded-2xl shadow-xl backdrop-blur-md text-xs text-gray-100 min-w-[170px] space-y-1.5 select-none">
        <div className="flex items-center gap-2 font-semibold">
          <span 
            className="w-2.5 h-2.5 rounded-full inline-block shrink-0" 
            style={{ backgroundColor: item.color }} 
          />
          <span className="truncate max-w-[140px] text-gray-200">{item.name}</span>
        </div>
        <div className="flex items-baseline justify-between gap-3 pt-1 border-t border-gray-800">
          <span className="text-gray-400">Total:</span>
          <span className="font-mono font-bold text-white">
            {formatCurrency(item.value)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-3 text-[11px] text-gray-400">
          <span>Participação:</span>
          <span className="font-mono font-semibold text-primary-400">
            {item.percent.toFixed(1)}%
          </span>
        </div>
      </div>
    );
  };

  const hasData = chartData.length > 0 && totalAmount > 0;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-750 p-6 shadow-xs flex flex-col justify-between transition-all">
      {/* Header com Título e Alternador de Fluxo (Despesa vs Receita) */}
      <div className="space-y-4 mb-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <Tag className="w-4 h-4 text-primary-500" />
              Distribuição por Categoria
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {flowType === 'EXPENSE' ? 'Para onde está indo o seu dinheiro' : 'De onde estão vindo suas receitas'}
            </p>
          </div>

          {/* Toggle Despesas vs Receitas */}
          <div className="flex items-center bg-gray-100 dark:bg-gray-700/60 p-1 rounded-xl self-start sm:self-auto">
            <button
              type="button"
              onClick={() => {
                setFlowType('EXPENSE');
                setActiveCategory(null);
              }}
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg transition-all ${
                flowType === 'EXPENSE'
                  ? 'bg-rose-500 text-white shadow-xs shadow-rose-500/30'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
              }`}
            >
              <ArrowDownCircle className="w-3.5 h-3.5" />
              Despesas
            </button>
            <button
              type="button"
              onClick={() => {
                setFlowType('INCOME');
                setActiveCategory(null);
              }}
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg transition-all ${
                flowType === 'INCOME'
                  ? 'bg-emerald-500 text-white shadow-xs shadow-emerald-500/30'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
              }`}
            >
              <ArrowUpCircle className="w-3.5 h-3.5" />
              Receitas
            </button>
          </div>
        </div>

        {/* Subheader: Total no Período e Seletores de Tipo de Gráfico */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-750/80">
          <div className="text-xs">
            <span className="text-gray-400">Total {flowType === 'EXPENSE' ? 'Gasto' : 'Recebido'}: </span>
            <span className={`font-mono font-bold text-sm ${flowType === 'EXPENSE' ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
              {formatCurrency(totalAmount)}
            </span>
          </div>

          {/* Seletor de Tipo de Gráfico (Donut, Ranking, Pizza, Radar) */}
          <div className="flex items-center bg-gray-100 dark:bg-gray-700/60 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setChartType('donut')}
              className={`p-1.5 rounded-lg transition-all ${
                chartType === 'donut'
                  ? 'bg-white dark:bg-gray-800 text-primary-600 dark:text-primary-400 shadow-2xs'
                  : 'text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
              title="Gráfico de Rosca com Centro Informativo"
            >
              <CircleDot className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setChartType('ranking')}
              className={`p-1.5 rounded-lg transition-all ${
                chartType === 'ranking'
                  ? 'bg-white dark:bg-gray-800 text-primary-600 dark:text-primary-400 shadow-2xs'
                  : 'text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
              title="Ranking em Barras Horizontais"
            >
              <BarChartHorizontal className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setChartType('pie')}
              className={`p-1.5 rounded-lg transition-all ${
                chartType === 'pie'
                  ? 'bg-white dark:bg-gray-800 text-primary-600 dark:text-primary-400 shadow-2xs'
                  : 'text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
              title="Gráfico de Pizza Completo"
            >
              <PieIcon className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setChartType('radar')}
              className={`p-1.5 rounded-lg transition-all ${
                chartType === 'radar'
                  ? 'bg-white dark:bg-gray-800 text-primary-600 dark:text-primary-400 shadow-2xs'
                  : 'text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
              title="Gráfico de Radar / Equilíbrio"
            >
              <RadarIcon className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Visualização do Gráfico */}
      {!hasData ? (
        <div className="h-64 flex flex-col items-center justify-center bg-gray-50/50 dark:bg-gray-850/50 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700 p-6 text-center">
          <TrendingDown className="w-8 h-8 text-gray-400 mb-2 opacity-50" />
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            Nenhuma {flowType === 'EXPENSE' ? 'despesa' : 'receita'} registrada
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
            Cadastre transações para visualizar o detalhamento por categoria.
          </p>
        </div>
      ) : chartType === 'ranking' ? (
        /* Visualização: Ranking de Barras Horizontais */
        <div className="h-64 overflow-y-auto pr-1 space-y-3.5 pt-1">
          {chartData.map((cat, index) => (
            <div key={cat.id} className="space-y-1.5 group">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-[11px] font-bold text-gray-400 w-4">
                    #{index + 1}
                  </span>
                  <span 
                    className="w-2.5 h-2.5 rounded-full shrink-0" 
                    style={{ backgroundColor: cat.color }} 
                  />
                  <span className="font-semibold text-gray-800 dark:text-gray-200 truncate group-hover:text-primary-500 transition-colors">
                    {cat.name}
                  </span>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="font-mono text-gray-500 dark:text-gray-400 text-[11px]">
                    {cat.percent.toFixed(1)}%
                  </span>
                  <span className="font-mono font-bold text-gray-900 dark:text-gray-100">
                    {formatCurrency(cat.value)}
                  </span>
                </div>
              </div>

              {/* Barra de Progresso Horizontal */}
              <div className="w-full h-2 rounded-full bg-gray-100 dark:bg-gray-700/60 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500 ease-out"
                  style={{
                    width: `${Math.max(cat.percent, 3)}%`,
                    backgroundColor: cat.color,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      ) : chartType === 'radar' ? (
        /* Visualização: Radar Chart */
        <div className="w-full h-64 pt-1">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart cx="50%" cy="50%" outerRadius="75%" data={chartData.slice(0, 7)}>
              <PolarGrid stroke="#888" strokeOpacity={0.2} />
              <PolarAngleAxis dataKey="name" tick={{ fontSize: 10, fill: '#888' }} />
              <PolarRadiusAxis angle={30} domain={[0, 'auto']} tick={false} axisLine={false} />
              <Radar
                name={flowType === 'EXPENSE' ? 'Despesas' : 'Receitas'}
                dataKey="value"
                stroke={flowType === 'EXPENSE' ? '#ef4444' : '#10b981'}
                fill={flowType === 'EXPENSE' ? '#ef4444' : '#10b981'}
                fillOpacity={0.4}
              />
              <Tooltip content={<CustomTooltip />} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        /* Visualização: Donut ou Pizza */
        <div className="relative w-full h-64 pt-1 flex items-center justify-center">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={chartType === 'donut' ? 95 : 90}
                innerRadius={chartType === 'donut' ? 62 : 0}
                paddingAngle={chartType === 'donut' ? 3 : 0}
                onMouseEnter={(_, index) => {
                  const item = chartData[index];
                  if (item) {
                    setActiveCategory({
                      name: item.name,
                      value: item.value,
                      percent: item.percent,
                    });
                  }
                }}
                onMouseLeave={() => setActiveCategory(null)}
              >
                {chartData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.color} 
                    className="transition-all duration-200 cursor-pointer hover:opacity-90"
                  />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>

          {/* Centro Dinâmico para o Gráfico Donut */}
          {chartType === 'donut' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none text-center">
              <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400">
                {activeCategory ? activeCategory.name : (flowType === 'EXPENSE' ? 'Total Despesas' : 'Total Receitas')}
              </span>
              <span className="text-base font-extrabold font-mono text-gray-900 dark:text-gray-100 tracking-tight">
                {formatCurrency(activeCategory ? activeCategory.value : totalAmount)}
              </span>
              <span className="text-[11px] font-semibold text-primary-500">
                {activeCategory ? `${activeCategory.percent.toFixed(1)}%` : `${chartData.length} categorias`}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Rodapé: Pílulas das Top Categorias */}
      {hasData && (
        <div className="pt-3 mt-2 border-t border-gray-100 dark:border-gray-750 flex flex-wrap items-center gap-2">
          {chartData.slice(0, 4).map((c) => (
            <div 
              key={c.id} 
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-gray-50 dark:bg-gray-700/40 text-[11px] border border-gray-100 dark:border-gray-700/60"
            >
              <span 
                className="w-2 h-2 rounded-full inline-block" 
                style={{ backgroundColor: c.color }} 
              />
              <span className="font-medium text-gray-700 dark:text-gray-300 truncate max-w-[90px]">
                {c.name}
              </span>
              <span className="font-mono text-gray-400 font-bold">
                {c.percent.toFixed(0)}%
              </span>
            </div>
          ))}
          {chartData.length > 4 && (
            <span className="text-[10px] text-gray-400">
              +{chartData.length - 4} outras
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default ExpensesChart;
