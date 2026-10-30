import React, { useEffect, useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '../../../lib/ipc';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Select } from '../../../components/ui/select';
import { X, DollarSign } from 'lucide-react';
import type { Budget, Category } from '../../../types';

const budgetFormSchema = z.object({
  categoryId: z.string().min(1, 'Selecione uma categoria de despesa'),
  amount: z.string().min(1, 'Informe o valor do orçamento'),
  month: z.string().min(1, 'Selecione o mês'),
  year: z.string().min(1, 'Informe o ano'),
});

type BudgetFormValues = z.infer<typeof budgetFormSchema>;

interface BudgetFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  budgetToEdit?: Budget | null;
  currentMonth: number;
  currentYear: number;
}

export const BudgetFormModal: React.FC<BudgetFormModalProps> = ({
  isOpen,
  onClose,
  categories,
  budgetToEdit,
  currentMonth,
  currentYear,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const expenseCategories = useMemo(
    () => categories.filter((cat) => cat.type === 'EXPENSE'),
    [categories]
  );

  const defaultCatId = expenseCategories[0]?.id || '';

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<BudgetFormValues>({
    resolver: zodResolver(budgetFormSchema),
    defaultValues: {
      categoryId: defaultCatId,
      amount: '',
      month: String(currentMonth),
      year: String(currentYear),
    },
  });

  useEffect(() => {
    if (isOpen) {
      if (budgetToEdit) {
        reset({
          categoryId: budgetToEdit.categoryId,
          amount: (budgetToEdit.amountCents / 100).toFixed(2),
          month: String(budgetToEdit.month),
          year: String(budgetToEdit.year),
        });
      } else {
        reset({
          categoryId: defaultCatId,
          amount: '',
          month: String(currentMonth),
          year: String(currentYear),
        });
      }
      setError(null);
    }
  }, [isOpen, budgetToEdit, currentMonth, currentYear, defaultCatId, reset]);

  const onSubmit = async (data: BudgetFormValues) => {
    setIsLoading(true);
    setError(null);

    const cleanAmount = data.amount.replace(/[^\d.,]/g, '').replace(',', '.');
    const parsedAmount = parseFloat(cleanAmount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Informe um valor válido maior que zero (ex: 500,00)');
      setIsLoading(false);
      return;
    }

    const amountCents = Math.round(parsedAmount * 100);
    const selectedMonth = parseInt(data.month, 10);
    const selectedYear = parseInt(data.year, 10);

    if (isNaN(selectedMonth) || selectedMonth < 1 || selectedMonth > 12) {
      setError('Selecione um mês válido');
      setIsLoading(false);
      return;
    }

    if (isNaN(selectedYear) || selectedYear < 2000 || selectedYear > 2100) {
      setError('Informe um ano válido');
      setIsLoading(false);
      return;
    }

    try {
      if (budgetToEdit) {
        await api.budgets.update(budgetToEdit.id, {
          categoryId: data.categoryId,
          amountCents,
          month: selectedMonth,
          year: selectedYear,
        });
      } else {
        await api.budgets.create({
          categoryId: data.categoryId,
          amountCents,
          month: selectedMonth,
          year: selectedYear,
        });
      }

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['budgets'] }),
        queryClient.refetchQueries({ queryKey: ['budgets'] }),
      ]);

      reset();
      onClose();
    } catch (err: unknown) {
      console.error('Erro ao salvar orçamento:', err);
      setError(err instanceof Error ? err.message : 'Erro ao salvar orçamento');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const monthsList = [
    { value: 1, label: 'Janeiro' },
    { value: 2, label: 'Fevereiro' },
    { value: 3, label: 'Março' },
    { value: 4, label: 'Abril' },
    { value: 5, label: 'Maio' },
    { value: 6, label: 'Junho' },
    { value: 7, label: 'Julho' },
    { value: 8, label: 'Agosto' },
    { value: 9, label: 'Setembro' },
    { value: 10, label: 'Outubro' },
    { value: 11, label: 'Novembro' },
    { value: 12, label: 'Dezembro' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="relative bg-white dark:bg-gray-850 p-6 w-full max-w-md rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-750">
        <div className="flex justify-between items-center mb-5">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-primary-100 dark:bg-primary-950/60 rounded-xl text-primary-600 dark:text-primary-400">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                {budgetToEdit ? 'Editar Orçamento' : 'Definir Orçamento'}
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Estabeleça um teto de gastos para o mês
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

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Categoria de Despesa
            </label>
            <Select {...register('categoryId')}>
              {expenseCategories.length === 0 ? (
                <option value="">Nenhuma categoria de despesa cadastrada</option>
              ) : (
                expenseCategories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))
              )}
            </Select>
            {errors.categoryId && (
              <span className="text-xs text-rose-500 mt-1 block">{errors.categoryId.message}</span>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Teto de Gastos (R$)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">
                R$
              </span>
              <Input
                {...register('amount')}
                type="text"
                placeholder="Ex: 800,00"
                className="pl-10 font-semibold"
                autoFocus
              />
            </div>
            {errors.amount && (
              <span className="text-xs text-rose-500 mt-1 block">{errors.amount.message}</span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Mês
              </label>
              <Select {...register('month')}>
                {monthsList.map((m) => (
                  <option key={m.value} value={String(m.value)}>
                    {m.label}
                  </option>
                ))}
              </Select>
              {errors.month && (
                <span className="text-xs text-rose-500 mt-1 block">{errors.month.message}</span>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Ano
              </label>
              <Input
                type="number"
                {...register('year')}
              />
              {errors.year && (
                <span className="text-xs text-rose-500 mt-1 block">{errors.year.message}</span>
              )}
            </div>
          </div>

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
              disabled={isSubmitting || isLoading || expenseCategories.length === 0}
            >
              {isSubmitting || isLoading ? 'Salvando...' : budgetToEdit ? 'Atualizar Orçamento' : 'Criar Orçamento'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
