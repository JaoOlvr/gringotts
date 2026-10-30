import React, { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api } from '../../../lib/ipc';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Select } from '../../../components/ui/select';
import { X, Calculator } from 'lucide-react';

const quickAddSchema = z.object({
  amount: z.string().min(1, 'Informe o valor'),
  date: z.string().default(() => new Date().toISOString().split('T')[0] ?? ''),
  description: z.string().optional(),
  categoryId: z.string().optional(),
  type: z.enum(['INCOME', 'EXPENSE', 'TRANSFER']).default('EXPENSE'),
  accountId: z.string().optional(),
});

type QuickAddFormValues = z.infer<typeof quickAddSchema>;

interface QuickAddTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTransactionAdded?: () => void;
  defaultAccountId?: string;
  defaultDate?: string;
  defaultAmount?: string;
}

export const QuickAddTransactionModal: React.FC<QuickAddTransactionModalProps> = ({ 
  isOpen, 
  onClose,
  onTransactionAdded,
  defaultAccountId,
  defaultDate,
  defaultAmount,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<Array<{ id: string; name: string }>>([]);
  const [categories, setCategories] = useState<Array<{ id: string; name: string; type: string }>>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<QuickAddFormValues>({
    resolver: zodResolver(quickAddSchema) as any,
    defaultValues: {
      amount: defaultAmount || '',
      date: new Date().toISOString().split('T')[0],
      description: '',
      categoryId: '',
      type: 'EXPENSE',
      accountId: defaultAccountId || '',
    },
  });

  const selectedType = watch('type');

  useEffect(() => {
    if (isOpen) {
      if (defaultAmount) {
        setValue('amount', defaultAmount);
      }
      if (defaultDate) {
        setValue('date', defaultDate);
      }
      const loadData = async () => {
        try {
          const [accountsData, categoriesData] = await Promise.all([
            api.accounts.getAll(),
            api.categories.getAll(),
          ]);
          setAccounts(accountsData);
          setCategories(categoriesData);
          if (accountsData.length > 0 && !defaultAccountId) {
            setValue('accountId', accountsData[0]!.id);
          } else if (defaultAccountId) {
            setValue('accountId', defaultAccountId);
          }
        } catch (err) {
          console.error('Failed to load accounts/categories:', err);
        }
      };
      
      loadData();
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 50);
    }
  }, [isOpen, defaultAccountId, setValue]);

  // Evaluator for math expression (e.g. 45 + 12.50)
  const evaluateExpression = (expr: string): number => {
    try {
      const sanitized = expr.replace(/[^\d\+\-\*\/\.\,]/g, '').replace(/,/g, '.');
      // eslint-disable-next-line no-new-func
      const result = new Function(`return (${sanitized})`)();
      if (typeof result === 'number' && !isNaN(result) && isFinite(result)) {
        return Math.abs(result);
      }
    } catch {
      // Fallback
    }
    const parsed = parseFloat(expr.replace(/[^\d\.\,]/g, '').replace(',', '.'));
    return isNaN(parsed) ? 0 : Math.abs(parsed);
  };

  const onSubmit = async (data: QuickAddFormValues) => {
    setIsLoading(true);
    setError(null);
    try {
      const rawValue = evaluateExpression(data.amount);
      const amountCents = Math.round(rawValue * 100);

      const targetAccountId = data.accountId || defaultAccountId || accounts[0]?.id;
      if (!targetAccountId) {
        throw new Error('Nenhuma conta disponível. Crie uma conta antes de lançar.');
      }

      await api.transactions.create({
        amountCents,
        date: new Date(data.date),
        description: data.description || '',
        accountId: targetAccountId,
        categoryId: data.categoryId || undefined,
        type: data.type as 'INCOME' | 'EXPENSE' | 'TRANSFER',
        status: 'PAID',
        tags: [],
      });
      
      reset();
      onClose();
      onTransactionAdded?.();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao criar transação');
    } finally {
      setIsLoading(false);
    }
  };

  // Keyboard shortcut listener for Enter / Escape inside modal
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  const filteredCategories = categories.filter(c => c.type === selectedType);

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200"
      onKeyDown={handleKeyDown}
    >
      <div className="relative bg-white dark:bg-gray-850 p-6 w-full max-w-md rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-750">
        <div className="flex justify-between items-center mb-5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary-100 dark:bg-primary-950/60 flex items-center justify-center text-primary-600 dark:text-primary-400">
              <Calculator className="w-4 h-4" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
              Adicionar Lançamento Rápido
            </h2>
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
              Valor (R$) <span className="text-xs text-gray-400 font-normal">(aceita expressões como 45+12,50)</span>
            </label>
            {(() => {
              const { ref: formRef, ...amountRegister } = register('amount');
              return (
                <Input
                  {...amountRegister}
                  ref={(e) => {
                    formRef(e);
                    if (e) {
                      e.setAttribute('ref', 'amountRef');
                      (inputRef as any).current = e;
                    }
                  }}
                  placeholder="0,00"
                  className="text-xl font-semibold tracking-tight"
                  autoFocus
                />
              );
            })()}
            {errors.amount && (
              <span className="text-xs text-rose-500 mt-1 block">{errors.amount.message}</span>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Descrição
            </label>
            <Input
              {...register('description')}
              placeholder="Ex: Almoço no restaurante"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Tipo
              </label>
              <Select {...register('type')}>
                <option value="EXPENSE">Despesa</option>
                <option value="INCOME">Receita</option>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Categoria
              </label>
              <Select {...register('categoryId')}>
                <option value="">Sem categoria</option>
                {filteredCategories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Conta
              </label>
              <Select aria-label="Conta" {...register('accountId')}>
                {accounts.map(acc => (
                  <option key={acc.id} value={acc.id}>{acc.name}</option>
                ))}
              </Select>
              {errors.accountId && (
                <span className="text-xs text-rose-500 mt-1 block">{errors.accountId.message}</span>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Data
              </label>
              <Input
                type="date"
                {...register('date')}
              />
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-3">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
            >
              Cancelar (Esc)
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || isLoading}
            >
              {isSubmitting || isLoading ? 'Salvando...' : 'Salvar (Enter)'}
            </Button>
          </div>
          
          {error && (
            <div className="p-3 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-lg text-rose-600 dark:text-rose-400 text-xs">
              {error}
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default QuickAddTransactionModal;
