import React, { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '../../../lib/ipc';
import { formatCurrency } from '../../../lib/utils';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Select } from '../../../components/ui/select';
import { X, PiggyBank, ArrowDownLeft, ArrowUpRight, CheckCircle2 } from 'lucide-react';
import type { Goal, Account } from '../../../types';

interface DepositGoalModalProps {
  isOpen: boolean;
  onClose: () => void;
  goal: Goal | null;
  accounts: Account[];
  mode?: 'deposit' | 'withdraw';
}

export const DepositGoalModal: React.FC<DepositGoalModalProps> = ({
  isOpen,
  onClose,
  goal,
  accounts,
  mode = 'deposit',
}) => {
  const [currentMode, setCurrentMode] = useState<'deposit' | 'withdraw'>(mode);
  const [amountStr, setAmountStr] = useState('');
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [syncWithAccount, setSyncWithAccount] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (isOpen) {
      setCurrentMode(mode);
      setAmountStr('');
      setError(null);
      if (accounts.length > 0) {
        setSelectedAccountId(accounts[0].id);
      }
    }
  }, [isOpen, mode, accounts]);

  if (!isOpen || !goal) return null;

  const currentAmount = goal.currentAmountCents;
  const targetAmount = goal.targetAmountCents;

  const cleanAmount = amountStr.replace(/[^\d.,]/g, '').replace(',', '.');
  const inputAmountCents = Math.round((parseFloat(cleanAmount) || 0) * 100);

  const previewAmountCents =
    currentMode === 'deposit'
      ? currentAmount + inputAmountCents
      : Math.max(0, currentAmount - inputAmountCents);

  const previewProgress =
    targetAmount > 0 ? Math.min(100, (previewAmountCents / targetAmount) * 100) : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (inputAmountCents <= 0) {
      setError('Informe um valor maior que zero');
      return;
    }

    if (currentMode === 'withdraw' && inputAmountCents > currentAmount) {
      setError('O valor de resgate não pode ser maior que o saldo atual da meta');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const deltaCents = currentMode === 'deposit' ? inputAmountCents : -inputAmountCents;

      // 1. Atualiza o saldo da meta
      await api.goals.addToGoal(goal.id, deltaCents);

      // 2. Se optou por sincronizar com uma conta
      if (syncWithAccount && selectedAccountId) {
        if (currentMode === 'deposit') {
          // Transferência de saída da conta para reserva na meta (Aporte)
          await api.transactions.create({
            accountId: selectedAccountId,
            amountCents: inputAmountCents,
            type: 'TRANSFER',
            date: new Date(),
            description: `Aporte na meta: ${goal.name}`,
            status: 'PAID',
            tags: ['Meta', goal.name, 'Aporte', 'TRANSFER_OUT'],
          });
        } else {
          // Transferência de entrada da meta para a conta (Resgate)
          await api.transactions.create({
            accountId: selectedAccountId,
            amountCents: inputAmountCents,
            type: 'TRANSFER',
            date: new Date(),
            description: `Resgate da meta: ${goal.name}`,
            status: 'PAID',
            tags: ['Meta', goal.name, 'Resgate', 'TRANSFER_IN'],
          });
        }
      }

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['goals'] }),
        queryClient.invalidateQueries({ queryKey: ['accounts'] }),
        queryClient.invalidateQueries({ queryKey: ['transactions'] }),
      ]);

      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao processar movimentação na meta');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="relative bg-white dark:bg-gray-850 p-6 w-full max-w-md rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-750">
        {/* Header */}
        <div className="flex justify-between items-center mb-5">
          <div className="flex items-center gap-2.5">
            <div 
              className="p-2.5 rounded-xl text-white shadow-xs"
              style={{ backgroundColor: goal.color || '#10b981' }}
            >
              <PiggyBank className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                {currentMode === 'deposit' ? 'Guardar Dinheiro' : 'Resgatar Valor'}
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Meta: <span className="font-semibold text-gray-700 dark:text-gray-300">{goal.name}</span>
              </p>
            </div>
          </div>
          <button
            className="rounded-lg p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-750 dark:hover:text-gray-200 transition-colors"
            onClick={onClose}
            aria-label="Fechar"
            type="button"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Abas Depósito / Resgate */}
        <div className="flex p-1 bg-gray-100 dark:bg-gray-800 rounded-xl mb-4">
          <button
            type="button"
            onClick={() => setCurrentMode('deposit')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              currentMode === 'deposit'
                ? 'bg-white dark:bg-gray-700 text-emerald-600 dark:text-emerald-400 shadow-xs'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
            }`}
          >
            <ArrowDownLeft className="w-3.5 h-3.5" />
            Guardar (Aportar)
          </button>
          <button
            type="button"
            onClick={() => setCurrentMode('withdraw')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              currentMode === 'withdraw'
                ? 'bg-white dark:bg-gray-700 text-amber-600 dark:text-amber-400 shadow-xs'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
            }`}
          >
            <ArrowUpRight className="w-3.5 h-3.5" />
            Resgatar
          </button>
        </div>

        {/* Card de Simulação de Progresso */}
        <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-700 mb-4 space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-gray-500 dark:text-gray-400">Saldo Atual:</span>
            <span className="font-semibold text-gray-800 dark:text-gray-200">
              {formatCurrency(currentAmount)} / {formatCurrency(targetAmount)}
            </span>
          </div>

          {inputAmountCents > 0 && (
            <div className="flex justify-between text-xs text-primary-600 dark:text-primary-400 font-semibold">
              <span>Após {currentMode === 'deposit' ? 'Aporte' : 'Resgate'}:</span>
              <span>
                {formatCurrency(previewAmountCents)} ({previewProgress.toFixed(0)}%)
              </span>
            </div>
          )}

          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
            <div
              className="h-2 rounded-full transition-all duration-300"
              style={{
                width: `${previewProgress}%`,
                backgroundColor: goal.color || '#10b981',
              }}
            />
          </div>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Valor a {currentMode === 'deposit' ? 'Guardar' : 'Resgatar'} (R$)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">
                R$
              </span>
              <Input
                value={amountStr}
                onChange={(e) => setAmountStr(e.target.value)}
                type="text"
                placeholder="Ex: 200,00"
                className="pl-10 text-base font-semibold"
                autoFocus
              />
            </div>
          </div>

          {/* Opção de sincronizar com Conta */}
          {accounts.length > 0 && (
            <div className="pt-1 border-t border-gray-100 dark:border-gray-750 space-y-2.5">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-gray-700 dark:text-gray-300 font-medium">
                <input
                  type="checkbox"
                  checked={syncWithAccount}
                  onChange={(e) => setSyncWithAccount(e.target.checked)}
                  className="rounded text-primary-600 focus:ring-primary-500"
                />
                <span>
                  {currentMode === 'deposit'
                    ? 'Debitar valor de uma conta'
                    : 'Creditar valor em uma conta'}
                </span>
              </label>

              {syncWithAccount && (
                <div>
                  <Select
                    value={selectedAccountId}
                    onChange={(e) => setSelectedAccountId(e.target.value)}
                  >
                    {accounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name} (Saldo: {formatCurrency(acc.balanceCents)})
                      </option>
                    ))}
                  </Select>
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="p-3 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-lg text-rose-600 dark:text-rose-400 text-xs">
              {error}
            </div>
          )}

          <div className="flex justify-end space-x-3 pt-3">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isLoading || inputAmountCents <= 0}
              className={
                currentMode === 'deposit'
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  : 'bg-amber-600 hover:bg-amber-700 text-white'
              }
            >
              {isLoading
                ? 'Processando...'
                : currentMode === 'deposit'
                ? 'Confirmar Aporte'
                : 'Confirmar Resgate'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
