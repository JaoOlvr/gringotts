import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '../../../lib/ipc';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { X, Check, Landmark, ShieldAlert, Sparkles, AlertCircle } from 'lucide-react';
import type { Debt } from '../../../types';

const PREDEFINED_COLORS = [
  { hex: '#ef4444', name: 'Vermelho' },
  { hex: '#f97316', name: 'Laranja' },
  { hex: '#f59e0b', name: 'Âmbar' },
  { hex: '#eab308', name: 'Amarelo' },
  { hex: '#84cc16', name: 'Limão' },
  { hex: '#10b981', name: 'Esmeralda' },
  { hex: '#06b6d4', name: 'Ciano' },
  { hex: '#3b82f6', name: 'Azul' },
  { hex: '#6366f1', name: 'Índigo' },
  { hex: '#8b5cf6', name: 'Violeta' },
  { hex: '#ec4899', name: 'Pink' },
  { hex: '#64748b', name: 'Grafite' },
];

const debtFormSchema = z.object({
  name: z.string().min(1, 'Nome da dívida é obrigatório'),
  creditor: z.string().optional(),
  totalAmount: z.string().min(1, 'Informe o valor total contratado'),
  remainingAmount: z.string().min(1, 'Informe o saldo devedor atual'),
  interestRateMonthly: z.string(),
  minimumPayment: z.string().min(1, 'Informe a parcela mensal / pagamento mínimo'),
  dueDay: z.string().optional(),
  color: z.string(),
  notes: z.string().optional(),
});

type DebtFormValues = z.infer<typeof debtFormSchema>;

interface DebtFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  debt?: Debt | null;
}

function parseCurrencyInputToCents(val: string): number {
  if (!val) return 0;
  const clean = val.replace(/\s/g, '').replace('R$', '').replace(/\./g, '').replace(',', '.');
  const num = parseFloat(clean);
  return isNaN(num) ? 0 : Math.round(num * 100);
}

export const DebtFormModal: React.FC<DebtFormModalProps> = ({ isOpen, onClose, debt }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<DebtFormValues>({
    resolver: zodResolver(debtFormSchema),
    defaultValues: {
      name: '',
      creditor: '',
      totalAmount: '',
      remainingAmount: '',
      interestRateMonthly: '0',
      minimumPayment: '',
      dueDay: '10',
      color: '#ef4444',
      notes: '',
    },
  });

  const selectedColor = watch('color');

  useEffect(() => {
    if (debt) {
      reset({
        name: debt.name,
        creditor: debt.creditor || '',
        totalAmount: (debt.totalAmountCents / 100).toFixed(2).replace('.', ','),
        remainingAmount: (debt.remainingAmountCents / 100).toFixed(2).replace('.', ','),
        interestRateMonthly: String(debt.interestRateMonthly || 0),
        minimumPayment: (debt.minimumPaymentCents / 100).toFixed(2).replace('.', ','),
        dueDay: debt.dueDay ? String(debt.dueDay) : '10',
        color: debt.color || '#ef4444',
        notes: debt.notes || '',
      });
    } else {
      reset({
        name: '',
        creditor: '',
        totalAmount: '',
        remainingAmount: '',
        interestRateMonthly: '0',
        minimumPayment: '',
        dueDay: '10',
        color: '#ef4444',
        notes: '',
      });
    }
    setError(null);
  }, [debt, reset, isOpen]);

  const onSubmit = async (values: DebtFormValues) => {
    setIsLoading(true);
    setError(null);

    try {
      const totalAmountCents = parseCurrencyInputToCents(values.totalAmount);
      const remainingAmountCents = parseCurrencyInputToCents(values.remainingAmount);
      const minimumPaymentCents = parseCurrencyInputToCents(values.minimumPayment);
      const interestRateMonthly = parseFloat(values.interestRateMonthly.replace(',', '.')) || 0;
      const dueDay = values.dueDay ? parseInt(values.dueDay, 10) : undefined;

      if (debt) {
        // Atualizar
        await api.debts.update(debt.id, {
          name: values.name.trim(),
          creditor: values.creditor?.trim() || undefined,
          totalAmountCents,
          remainingAmountCents,
          interestRateMonthly,
          minimumPaymentCents,
          dueDay,
          color: values.color,
          notes: values.notes?.trim() || undefined,
        });
      } else {
        // Criar
        await api.debts.create({
          name: values.name.trim(),
          creditor: values.creditor?.trim() || undefined,
          totalAmountCents,
          remainingAmountCents,
          interestRateMonthly,
          minimumPaymentCents,
          dueDay,
          color: values.color,
          notes: values.notes?.trim() || undefined,
          isPaid: remainingAmountCents <= 0,
        });
      }

      await queryClient.invalidateQueries({ queryKey: ['debts'] });
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Falha ao salvar a dívida.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="w-full max-w-lg bg-white dark:bg-gray-850 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-750 flex flex-col overflow-hidden max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-750 flex items-center justify-between shrink-0 bg-gray-50/50 dark:bg-gray-800/50">
          <div className="flex items-center gap-3">
            <div 
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-xs"
              style={{ backgroundColor: selectedColor || '#ef4444' }}
            >
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                {debt ? 'Editar Dívida' : 'Cadastrar Dívida'}
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Acompanhe o saldo devedor e calcule sua rota de quitação
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

        {/* Form Body */}
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4 overflow-y-auto flex-1">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Nome e Credor */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                Nome da Dívida *
              </label>
              <Input
                placeholder="Ex: Financiamento Carro"
                {...register('name')}
                className="w-full text-xs"
              />
              {errors.name && (
                <span className="text-[11px] text-rose-500 mt-1 block">{errors.name.message}</span>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                Instituição / Credor
              </label>
              <Input
                placeholder="Ex: Banco Santander, Caixa"
                {...register('creditor')}
                className="w-full text-xs"
              />
            </div>
          </div>

          {/* Saldo Devedor Atual e Valor Contratado */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                Saldo Devedor Atual (R$) *
              </label>
              <Input
                placeholder="Ex: 8.500,00"
                {...register('remainingAmount')}
                className="w-full text-xs font-mono font-bold text-rose-600 dark:text-rose-400"
              />
              {errors.remainingAmount && (
                <span className="text-[11px] text-rose-500 mt-1 block">{errors.remainingAmount.message}</span>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                Valor Total Original (R$) *
              </label>
              <Input
                placeholder="Ex: 12.000,00"
                {...register('totalAmount')}
                className="w-full text-xs font-mono"
              />
              {errors.totalAmount && (
                <span className="text-[11px] text-rose-500 mt-1 block">{errors.totalAmount.message}</span>
              )}
            </div>
          </div>

          {/* Taxa de Juros e Parcela Mensal */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                Juros Mensais (%)
              </label>
              <Input
                type="text"
                placeholder="Ex: 1.99"
                {...register('interestRateMonthly')}
                className="w-full text-xs font-mono"
              />
              <span className="text-[10px] text-gray-400 mt-0.5 block">% ao mês</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                Parcela Mínima (R$) *
              </label>
              <Input
                placeholder="Ex: 350,00"
                {...register('minimumPayment')}
                className="w-full text-xs font-mono font-semibold"
              />
              {errors.minimumPayment && (
                <span className="text-[11px] text-rose-500 mt-1 block">{errors.minimumPayment.message}</span>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                Dia do Vencimento
              </label>
              <Input
                type="number"
                min="1"
                max="31"
                placeholder="Ex: 10"
                {...register('dueDay')}
                className="w-full text-xs"
              />
            </div>
          </div>

          {/* Seletor de Cores */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Cor de Destaque
            </label>
            <div className="flex flex-wrap gap-2">
              {PREDEFINED_COLORS.map((c) => (
                <button
                  type="button"
                  key={c.hex}
                  onClick={() => setValue('color', c.hex)}
                  className={`w-7 h-7 rounded-xl flex items-center justify-center transition-transform ${
                    selectedColor === c.hex ? 'scale-115 ring-2 ring-primary-500 ring-offset-2' : 'hover:scale-105'
                  }`}
                  style={{ backgroundColor: c.hex }}
                  title={c.name}
                >
                  {selectedColor === c.hex && <Check className="w-4 h-4 text-white drop-shadow-xs" />}
                </button>
              ))}
            </div>
          </div>

          {/* Observações */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
              Observações ou Detalhes do Contrato
            </label>
            <textarea
              rows={2}
              placeholder="Ex: Contrato nº 12345, renegociado em 36x."
              {...register('notes')}
              className="w-full bg-white dark:bg-gray-800 text-xs text-gray-900 dark:text-gray-100 rounded-xl p-2.5 border border-gray-200 dark:border-gray-700 focus:outline-hidden focus:ring-2 focus:ring-primary-500"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-gray-100 dark:border-gray-750 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-750 transition"
            >
              Cancelar
            </button>
            <Button
              type="submit"
              disabled={isLoading}
              className="px-5 py-2 text-xs font-bold gap-2"
            >
              {isLoading ? 'Salvando...' : debt ? 'Salvar Alterações' : 'Cadastrar Dívida'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
