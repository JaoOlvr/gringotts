import React, { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '../../../lib/ipc';
import { formatCurrency, cn } from '../../../lib/utils';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { X, CheckCircle2, DollarSign, Sparkles, AlertCircle, ArrowDownCircle } from 'lucide-react';
import type { Debt } from '../../../types';

interface DebtPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  debt: Debt | null;
}

export const DebtPaymentModal: React.FC<DebtPaymentModalProps> = ({ isOpen, onClose, debt }) => {
  const [paymentAmountStr, setPaymentAmountStr] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (debt) {
      // Valor padrão é a parcela mínima ou o saldo restante caso seja menor
      const defaultAmount = Math.min(debt.minimumPaymentCents, debt.remainingAmountCents);
      setPaymentAmountStr((defaultAmount / 100).toFixed(2).replace('.', ','));
      setError(null);
    }
  }, [debt, isOpen]);

  if (!isOpen || !debt) return null;

  const parseInputCents = (val: string): number => {
    const clean = val.replace(/\s/g, '').replace('R$', '').replace(/\./g, '').replace(',', '.');
    const num = parseFloat(clean);
    return isNaN(num) ? 0 : Math.round(num * 100);
  };

  const paymentCents = parseInputCents(paymentAmountStr);
  const willBeFullyPaid = paymentCents >= debt.remainingAmountCents;
  const newBalanceCents = Math.max(0, debt.remainingAmountCents - paymentCents);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (paymentCents <= 0) {
      setError('Informe um valor de pagamento válido maior que zero.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await api.debts.recordPayment(debt.id, paymentCents);
      await queryClient.invalidateQueries({ queryKey: ['debts'] });
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Falha ao registrar pagamento da dívida.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="w-full max-w-md bg-white dark:bg-gray-850 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-750 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-750 flex items-center justify-between shrink-0 bg-gray-50/50 dark:bg-gray-800/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-xs">
              <ArrowDownCircle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">
                Registrar Pagamento
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {debt.name} {debt.creditor ? `• ${debt.creditor}` : ''}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-750 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Saldo Atual */}
          <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 flex items-center justify-between">
            <span className="text-xs text-gray-500 dark:text-gray-400">Saldo Devedor Atual:</span>
            <span className="text-sm font-bold font-mono text-rose-600 dark:text-rose-400">
              {formatCurrency(debt.remainingAmountCents)}
            </span>
          </div>

          {/* Input de Valor */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
              Valor a Pagar / Amortizar (R$)
            </label>
            <Input
              type="text"
              autoFocus
              value={paymentAmountStr}
              onChange={(e) => setPaymentAmountStr(e.target.value)}
              className="w-full text-base font-bold font-mono text-emerald-600 dark:text-emerald-400 py-2.5"
              placeholder="0,00"
            />
          </div>

          {/* Chips de Atalho Rápido */}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setPaymentAmountStr((debt.minimumPaymentCents / 100).toFixed(2).replace('.', ','))}
              className="px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-gray-750 hover:bg-gray-200 dark:hover:bg-gray-700 text-xs text-gray-700 dark:text-gray-300 font-medium transition"
            >
              Parcela Mínima ({formatCurrency(debt.minimumPaymentCents)})
            </button>
            <button
              type="button"
              onClick={() => setPaymentAmountStr((debt.remainingAmountCents / 100).toFixed(2).replace('.', ','))}
              className="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-xs text-emerald-700 dark:text-emerald-300 font-semibold border border-emerald-200 dark:border-emerald-800 transition"
            >
              Quitar Total ({formatCurrency(debt.remainingAmountCents)})
            </button>
          </div>

          {/* Prévia do Novo Saldo */}
          <div className="p-3 rounded-xl bg-gray-50/70 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700 space-y-1 text-xs">
            <div className="flex justify-between text-gray-500 dark:text-gray-400">
              <span>Novo saldo após pagamento:</span>
              <span className={cn("font-bold font-mono", willBeFullyPaid ? "text-emerald-600 dark:text-emerald-400" : "text-gray-900 dark:text-gray-100")}>
                {formatCurrency(newBalanceCents)}
              </span>
            </div>
            {willBeFullyPaid && (
              <div className="pt-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" />
                Parabéns! Esta dívida será 100% quitada com este pagamento!
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-500 hover:text-gray-700 dark:text-gray-400 transition"
            >
              Cancelar
            </button>
            <Button
              type="submit"
              disabled={isLoading || paymentCents <= 0}
              className="px-5 py-2 text-xs font-bold gap-2"
            >
              {isLoading ? 'Registrando...' : 'Confirmar Pagamento'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
