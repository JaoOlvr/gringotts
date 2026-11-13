import React, { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/ipc';
import { formatCurrency, cn } from '../../lib/utils';
import { simulateDebtPayoff, compareStrategies, type DebtStrategy } from '../../lib/debtPayoff';
import { Button } from '../../components/ui/button';
import { DebtFormModal } from './components/DebtFormModal';
import { DebtPaymentModal } from './components/DebtPaymentModal';
import { 
  ShieldAlert, 
  Plus, 
  Trash2, 
  Pencil, 
  Snowflake, 
  Mountain, 
  Calendar, 
  TrendingDown, 
  Sparkles, 
  ArrowRight, 
  CheckCircle2, 
  DollarSign, 
  HelpCircle,
  AlertTriangle,
  Clock,
  Layers,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import type { Debt } from '../../types';

export const DebtsPage: React.FC = () => {
  const queryClient = useQueryClient();

  const [strategy, setStrategy] = useState<DebtStrategy>('SNOWBALL');
  const [extraMonthlyBudget, setExtraMonthlyBudget] = useState<number>(0);
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editingDebt, setEditingDebt] = useState<Debt | null>(null);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [payingDebt, setPayingDebt] = useState<Debt | null>(null);
  const [showPaidDebts, setShowPaidDebts] = useState(false);

  const { data: debts = [], isLoading } = useQuery<Debt[]>({
    queryKey: ['debts'],
    queryFn: () => api.debts.getAll(),
  });

  const activeDebts = useMemo(() => debts.filter((d) => !d.isPaid && d.remainingAmountCents > 0), [debts]);
  const paidDebts = useMemo(() => debts.filter((d) => d.isPaid || d.remainingAmountCents === 0), [debts]);

  // Cálculos do simulador financeiro
  const simulation = useMemo(() => {
    return simulateDebtPayoff(activeDebts, strategy, extraMonthlyBudget * 100);
  }, [activeDebts, strategy, extraMonthlyBudget]);

  const comparison = useMemo(() => {
    return compareStrategies(activeDebts, extraMonthlyBudget * 100);
  }, [activeDebts, extraMonthlyBudget]);

  // Totais gerais
  const totalRemainingCents = activeDebts.reduce((sum, d) => sum + d.remainingAmountCents, 0);
  const totalOriginalCents = activeDebts.reduce((sum, d) => sum + d.totalAmountCents, 0);
  const totalMinimumPaymentCents = activeDebts.reduce((sum, d) => sum + d.minimumPaymentCents, 0);
  const totalPaidSoFarCents = Math.max(0, totalOriginalCents - totalRemainingCents);
  const percentagePaidSoFar = totalOriginalCents > 0 
    ? Math.min(100, Math.round((totalPaidSoFarCents / totalOriginalCents) * 100))
    : 100;

  const handleDelete = async (debt: Debt) => {
    if (window.confirm(`Tem certeza de que deseja excluir a dívida "${debt.name}"?`)) {
      await api.debts.delete(debt.id);
      await queryClient.invalidateQueries({ queryKey: ['debts'] });
    }
  };

  const handleEdit = (debt: Debt) => {
    setEditingDebt(debt);
    setFormModalOpen(true);
  };

  const handleOpenPayment = (debt: Debt) => {
    setPayingDebt(debt);
    setPaymentModalOpen(true);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-950/70 text-rose-600 dark:text-rose-400 flex items-center justify-center shadow-2xs">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
                Planejador de Dívidas
              </h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Estratégias Bola de Neve (*Snowball*) e Avalanche para acelerar sua liberdade financeira
              </p>
            </div>
          </div>
        </div>

        <Button
          onClick={() => {
            setEditingDebt(null);
            setFormModalOpen(true);
          }}
          className="gap-2 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Cadastrar Dívida
        </Button>
      </div>

      {isLoading ? (
        <div className="h-64 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      ) : activeDebts.length === 0 && paidDebts.length === 0 ? (
        /* Empty State */
        <div className="p-12 text-center rounded-3xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-750 shadow-2xs space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-xs">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
              Nenhuma dívida cadastrada!
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 max-w-md mx-auto">
              Parabéns! Se você tiver empréstimos, financiamentos, faturas de cartão ou outros compromissos, cadastre-os aqui para planejar sua quitação acelerada.
            </p>
          </div>
          <Button
            onClick={() => {
              setEditingDebt(null);
              setFormModalOpen(true);
            }}
            className="gap-2"
          >
            <Plus className="w-4 h-4" />
            Cadastrar Primeira Dívida
          </Button>
        </div>
      ) : (
        <>
          {/* Hero KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Saldo Devedor Restante */}
            <div className="p-5 rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-750 shadow-2xs">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">
                Total Devedor Restante
              </span>
              <div className="text-2xl font-bold font-mono text-rose-600 dark:text-rose-400 mt-1">
                {formatCurrency(totalRemainingCents)}
              </div>
              <div className="mt-2.5 flex items-center gap-2">
                <div className="flex-1 bg-gray-100 dark:bg-gray-700 h-1.5 rounded-full overflow-hidden">
                  <div 
                    className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                    style={{ width: `${percentagePaidSoFar}%` }}
                  />
                </div>
                <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 font-mono">
                  {percentagePaidSoFar}% pago
                </span>
              </div>
            </div>

            {/* Parcela Mínima Total / Mês */}
            <div className="p-5 rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-750 shadow-2xs">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">
                Parcelas Mínimas / Mês
              </span>
              <div className="text-2xl font-bold font-mono text-gray-800 dark:text-gray-100 mt-1">
                {formatCurrency(totalMinimumPaymentCents)}
              </div>
              <p className="text-[11px] text-gray-400 mt-2">
                Comprometimento mensal obrigatório
              </p>
            </div>

            {/* Previsão de Liberdade Financeira */}
            <div className="p-5 rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-750 shadow-2xs">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">
                Data de Liberdade Financeira
              </span>
              <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                {simulation.monthsToDebtFree > 0
                  ? simulation.debtFreeDate.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })
                  : 'Quitado'}
              </div>
              <p className="text-[11px] text-gray-400 mt-2 flex items-center gap-1 font-medium">
                <Clock className="w-3.5 h-3.5 text-primary-500" />
                {simulation.monthsToDebtFree > 0 
                  ? `Em aprox. ${simulation.monthsToDebtFree} ${simulation.monthsToDebtFree === 1 ? 'mês' : 'meses'}`
                  : 'Livre de dívidas!'}
              </p>
            </div>

            {/* Total de Juros Projetados */}
            <div className="p-5 rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-750 shadow-2xs">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">
                Juros Totais Estimados
              </span>
              <div className="text-2xl font-bold font-mono text-amber-600 dark:text-amber-400 mt-1">
                {formatCurrency(simulation.totalInterestPaidCents)}
              </div>
              <p className="text-[11px] text-gray-400 mt-2">
                Custo total dos juros até quitar
              </p>
            </div>
          </div>

          {/* Seletor Interativo de Estratégia e Aporte Extra */}
          <div className="p-6 rounded-2xl bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-850 border border-gray-200/80 dark:border-gray-700 shadow-2xs space-y-6">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  Estratégia de Quitação Acelerada
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Escolha o método e ajuste quanto você pode aportar a mais por mês para abater dívidas.
                </p>
              </div>

              {/* Botões de Alternância de Estratégia */}
              <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-750 p-1 rounded-xl self-stretch sm:self-auto border border-gray-200/60 dark:border-gray-650">
                <button
                  type="button"
                  onClick={() => setStrategy('SNOWBALL')}
                  className={cn(
                    "flex-1 sm:flex-none flex items-center justify-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all",
                    strategy === 'SNOWBALL'
                      ? "bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-xs"
                      : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
                  )}
                >
                  <Snowflake className="w-3.5 h-3.5" />
                  <span>Bola de Neve (*Snowball*)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setStrategy('AVALANCHE')}
                  className={cn(
                    "flex-1 sm:flex-none flex items-center justify-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all",
                    strategy === 'AVALANCHE'
                      ? "bg-white dark:bg-gray-700 text-amber-600 dark:text-amber-400 shadow-xs"
                      : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
                  )}
                >
                  <Mountain className="w-3.5 h-3.5" />
                  <span>Avalanche</span>
                </button>
              </div>
            </div>

            {/* Explicação da Estratégia Selecionada */}
            <div className="p-3.5 rounded-xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200/60 dark:border-blue-900/60 text-xs text-blue-900 dark:text-blue-200 flex items-start gap-3">
              {strategy === 'SNOWBALL' ? (
                <>
                  <Snowflake className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                  <div>
                    <strong>Método Bola de Neve:</strong> Foca em quitar as <strong>dívidas de menor saldo primeiro</strong>. Conforme cada dívida é eliminada, o valor que você pagava nela se soma para abater a próxima (efeito bola de neve). Ideal para manter a motivação com vitórias rápidas!
                  </div>
                </>
              ) : (
                <>
                  <Mountain className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <strong>Método Avalanche:</strong> Foca em atacar as <strong>dívidas com maiores taxas de juros primeiro</strong>. É matematicamente a rota mais eficiente, eliminando primeiro os juros mais pesados e gerando a maior economia financeira possível.
                  </div>
                </>
              )}
            </div>

            {/* Controle de Aporte Extra Mensal */}
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Aporte Extra Mensal além das parcelas mínimas:
                </label>
                <div className="text-sm font-bold font-mono text-emerald-600 dark:text-emerald-400">
                  +{formatCurrency(extraMonthlyBudget * 100)} / mês
                </div>
              </div>

              {/* Slider de Aporte Extra */}
              <input
                type="range"
                min="0"
                max="2000"
                step="50"
                value={extraMonthlyBudget}
                onChange={(e) => setExtraMonthlyBudget(Number(e.target.value))}
                className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-primary-600"
              />

              {/* Botões Rápidos de Aporte Extra */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                {[0, 100, 250, 500, 1000].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setExtraMonthlyBudget(amt)}
                    className={cn(
                      "px-3 py-1 rounded-lg text-xs font-semibold transition border",
                      extraMonthlyBudget === amt
                        ? "bg-primary-600 text-white border-primary-600 shadow-xs"
                        : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-750"
                    )}
                  >
                    {amt === 0 ? 'Sem aporte extra' : `+${formatCurrency(amt * 100)}`}
                  </button>
                ))}
              </div>
            </div>

            {/* Comparativo de Impacto */}
            {comparison.interestDifferenceCents !== 0 && (
              <div className="pt-2 text-xs text-gray-600 dark:text-gray-300 border-t border-gray-100 dark:border-gray-700/80 flex flex-wrap items-center justify-between gap-2">
                <span>
                  💡 <strong>Comparação:</strong> O método Avalanche economiza{' '}
                  <strong className="text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(Math.abs(comparison.interestDifferenceCents))} a mais em juros
                  </strong>{' '}
                  em relação à Bola de Neve.
                </span>
                {comparison.fasterFirstWinMonthSnowball < comparison.fasterFirstWinMonthAvalanche && (
                  <span className="text-blue-600 dark:text-blue-400 font-medium">
                    Porém a Bola de Neve elimina a 1ª dívida {comparison.fasterFirstWinMonthAvalanche - comparison.fasterFirstWinMonthSnowball} meses antes!
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Ordem Prioritária de Quitação (Plano Ativo) */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                  Ordem de Ataque ({strategy === 'SNOWBALL' ? 'Bola de Neve' : 'Avalanche'})
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Pague o mínimo em todas e concentre o excedente no Alvo nº 1 até quitá-lo
                </p>
              </div>
              <span className="text-xs text-gray-400">
                {activeDebts.length} {activeDebts.length === 1 ? 'dívida ativa' : 'dívidas ativas'}
              </span>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {simulation.debtOrder.map((item, index) => {
                const originalDebt = activeDebts.find((d) => d.id === item.id);
                if (!originalDebt) return null;

                const isCurrentTarget = index === 0;
                const paidPercentage = originalDebt.totalAmountCents > 0
                  ? Math.min(100, Math.round(((originalDebt.totalAmountCents - originalDebt.remainingAmountCents) / originalDebt.totalAmountCents) * 100))
                  : 0;

                return (
                  <div
                    key={item.id}
                    className={cn(
                      "p-5 rounded-2xl bg-white dark:bg-gray-800 border transition-all shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4",
                      isCurrentTarget 
                        ? "border-primary-500 ring-2 ring-primary-500/20 bg-primary-50/10 dark:bg-primary-950/10" 
                        : "border-gray-100 dark:border-gray-750 hover:border-gray-300 dark:hover:border-gray-600"
                    )}
                  >
                    {/* Informações da Dívida */}
                    <div className="flex items-start gap-3.5 min-w-0">
                      <div
                        className={cn(
                          "w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 shadow-xs",
                          isCurrentTarget
                            ? "bg-primary-600 text-white"
                            : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
                        )}
                      >
                        #{item.rank}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate">
                            {item.name}
                          </h4>
                          {isCurrentTarget && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary-100 dark:bg-primary-950/70 text-primary-700 dark:text-primary-300 uppercase tracking-wider">
                              Alvo Atual 🎯
                            </span>
                          )}
                          {originalDebt.creditor && (
                            <span className="text-xs text-gray-400">
                              • {originalDebt.creditor}
                            </span>
                          )}
                        </div>

                        {/* Metadados: Juros, Parcela, Vencimento */}
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-xs text-gray-500 dark:text-gray-400">
                          <span>Juros: <strong>{originalDebt.interestRateMonthly}% a.m.</strong></span>
                          <span>Parcela Mínima: <strong>{formatCurrency(originalDebt.minimumPaymentCents)}</strong></span>
                          {originalDebt.dueDay && (
                            <span>Vence dia <strong>{originalDebt.dueDay}</strong></span>
                          )}
                          <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                            Quitação prevista: Mês {item.paidOffMonth}
                          </span>
                        </div>

                        {/* Barra de Progresso Individual */}
                        <div className="mt-2.5 flex items-center gap-2 max-w-md">
                          <div className="flex-1 bg-gray-100 dark:bg-gray-700 h-1.5 rounded-full overflow-hidden">
                            <div 
                              className="bg-primary-500 h-full rounded-full transition-all duration-300"
                              style={{ width: `${paidPercentage}%` }}
                            />
                          </div>
                          <span className="text-[10px] font-semibold text-gray-400 font-mono">
                            {paidPercentage}% pago
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Lado Direito: Valores e Ações */}
                    <div className="flex items-center justify-between md:justify-end gap-4 shrink-0 pt-3 md:pt-0 border-t md:border-t-0 border-gray-100 dark:border-gray-750">
                      <div className="text-left md:text-right">
                        <span className="text-[10px] text-gray-400 uppercase tracking-wider block font-semibold">
                          Saldo Devedor
                        </span>
                        <div className="text-lg font-bold font-mono text-rose-600 dark:text-rose-400">
                          {formatCurrency(originalDebt.remainingAmountCents)}
                        </div>
                        <span className="text-[10px] text-gray-400">
                          de {formatCurrency(originalDebt.totalAmountCents)}
                        </span>
                      </div>

                      {/* Botões de Ação */}
                      <div className="flex items-center gap-1.5">
                        <Button
                          size="sm"
                          onClick={() => handleOpenPayment(originalDebt)}
                          className="text-xs gap-1.5"
                        >
                          <DollarSign className="w-3.5 h-3.5" />
                          Amortizar
                        </Button>

                        <button
                          type="button"
                          onClick={() => handleEdit(originalDebt)}
                          className="p-2 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-750 transition"
                          title="Editar dívida"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDelete(originalDebt)}
                          className="p-2 rounded-xl text-gray-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                          title="Excluir dívida"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Dívidas Quitadas (Histórico de Vitórias) */}
          {paidDebts.length > 0 && (
            <div className="pt-4 border-t border-gray-200/80 dark:border-gray-700/80">
              <button
                type="button"
                onClick={() => setShowPaidDebts(!showPaidDebts)}
                className="flex items-center gap-2 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>
                  {paidDebts.length} {paidDebts.length === 1 ? 'Dívida Quitada 🎉' : 'Dívidas Quitadas 🎉'}
                </span>
                {showPaidDebts ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>

              {showPaidDebts && (
                <div className="grid grid-cols-1 gap-2 mt-3">
                  {paidDebts.map((pd) => (
                    <div
                      key={pd.id}
                      className="p-3.5 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/50 dark:border-emerald-800/40 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        <span className="font-semibold text-gray-900 dark:text-gray-100">{pd.name}</span>
                        {pd.creditor && <span className="text-gray-400">({pd.creditor})</span>}
                      </div>

                      <div className="flex items-center gap-4">
                        <span className="font-bold text-emerald-700 dark:text-emerald-300">
                          100% Quitada
                        </span>
                        <button
                          type="button"
                          onClick={() => handleDelete(pd)}
                          className="text-gray-400 hover:text-rose-500"
                          title="Excluir do histórico"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Modal de Formulário de Dívida */}
      <DebtFormModal
        isOpen={formModalOpen}
        onClose={() => {
          setFormModalOpen(false);
          setEditingDebt(null);
        }}
        debt={editingDebt}
      />

      {/* Modal de Pagamento / Amortização */}
      <DebtPaymentModal
        isOpen={paymentModalOpen}
        onClose={() => {
          setPaymentModalOpen(false);
          setPayingDebt(null);
        }}
        debt={payingDebt}
      />
    </div>
  );
};
