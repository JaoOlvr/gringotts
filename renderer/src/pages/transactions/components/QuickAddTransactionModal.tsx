import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api } from '../../../lib/ipc';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Select } from '../../../components/ui/select';
import { calculateInstallments, getNextMonthlyRecurrenceDate, formatCurrency } from '../../../lib/utils';
import { X, Calculator, Repeat, CalendarDays, Layers, Split, CalendarClock, Info } from 'lucide-react';

const quickAddSchema = z.object({
  amount: z.string().min(1, 'Informe o valor'),
  date: z.string().default(() => new Date().toISOString().split('T')[0] ?? ''),
  description: z.string().optional(),
  categoryId: z.string().optional(),
  type: z.enum(['INCOME', 'EXPENSE', 'TRANSFER']).default('EXPENSE'),
  accountId: z.string().optional(),
  isRecurring: z.boolean().default(false),
  recurrenceType: z.enum(['INSTALLMENT', 'FIXED']).default('INSTALLMENT'),
  installmentsCount: z.coerce
    .number()
    .min(2, 'Mínimo de 2 vezes')
    .max(120, 'Máximo de 120 vezes')
    .default(2),
});

type QuickAddFormValues = z.infer<typeof quickAddSchema>;

type RecurrencePreview =
  | {
      type: 'INSTALLMENT';
      count: number;
      dayOfMonth: number;
      firstCents: number;
      lastCents: number;
      hasRemainder: boolean;
      totalCents: number;
      startLabel: string;
      endLabel: string;
    }
  | {
      type: 'FIXED';
      count: number;
      dayOfMonth: number;
      monthlyCents: number;
      totalCents: number;
      startLabel: string;
      endLabel: string;
    };

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
      isRecurring: false,
      recurrenceType: 'INSTALLMENT',
      installmentsCount: 2,
    },
  });

  const selectedType = watch('type');
  const isRecurring = watch('isRecurring');
  const recurrenceType = watch('recurrenceType');
  const installmentsCount = watch('installmentsCount') || 2;
  const amountValue = watch('amount') || '';
  const dateValue = watch('date') || new Date().toISOString().split('T')[0];

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
  }, [isOpen, defaultAccountId, defaultAmount, defaultDate, setValue]);

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

  // Live preview calculation for recurrence/installments
  const recurrencePreview = useMemo<RecurrencePreview | null>(() => {
    if (!isRecurring) return null;

    const rawValue = evaluateExpression(amountValue);
    const amountCents = Math.round(rawValue * 100);
    const count = Math.max(2, Math.min(120, Number(installmentsCount) || 2));

    const [yearStr, monthStr, dayStr] = (dateValue || '').split('-');
    const baseDate = (yearStr && monthStr && dayStr)
      ? new Date(Number(yearStr), Number(monthStr) - 1, Number(dayStr), 12, 0, 0)
      : new Date();
    const dayOfMonth = baseDate.getDate();

    const endDate = getNextMonthlyRecurrenceDate(baseDate, count - 1);

    const formatMonthYear = (date: Date) => {
      return new Intl.DateTimeFormat('pt-BR', { month: 'short', year: 'numeric' }).format(date);
    };

    if (recurrenceType === 'INSTALLMENT') {
      const installments = calculateInstallments(amountCents > 0 ? amountCents : 0, count);
      const firstCents = installments[0] || 0;
      const lastCents = installments[installments.length - 1] || 0;
      const hasRemainder = firstCents !== lastCents;

      return {
        type: 'INSTALLMENT',
        count,
        dayOfMonth,
        firstCents,
        lastCents,
        hasRemainder,
        totalCents: amountCents,
        startLabel: formatMonthYear(baseDate),
        endLabel: formatMonthYear(endDate),
      };
    } else {
      // FIXED: Repete o mesmo valor todo mês
      const monthlyCents = amountCents;
      const totalCents = monthlyCents * count;

      return {
        type: 'FIXED',
        count,
        dayOfMonth,
        monthlyCents,
        totalCents,
        startLabel: formatMonthYear(baseDate),
        endLabel: formatMonthYear(endDate),
      };
    }
  }, [isRecurring, recurrenceType, installmentsCount, amountValue, dateValue]);

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

      const [yearStr, monthStr, dayStr] = data.date.split('-');
      const baseDate = (yearStr && monthStr && dayStr)
        ? new Date(Number(yearStr), Number(monthStr) - 1, Number(dayStr), 12, 0, 0)
        : new Date(data.date);

      if (data.isRecurring) {
        const count = Math.max(2, Math.min(120, Number(data.installmentsCount) || 2));
        const recurrenceId = crypto.randomUUID ? crypto.randomUUID() : `rec-${Date.now()}`;
        const baseDescription = (data.description || (data.type === 'INCOME' ? 'Receita recorrente' : 'Despesa recorrente')).trim();

        let installmentsCents: number[];
        if (data.recurrenceType === 'INSTALLMENT') {
          installmentsCents = calculateInstallments(amountCents, count);
        } else {
          installmentsCents = Array(count).fill(amountCents);
        }

        const nowBoundary = new Date();
        nowBoundary.setHours(23, 59, 59, 999);

        const transactionsToCreate = installmentsCents.map((instCents, i) => {
          const txDate = getNextMonthlyRecurrenceDate(baseDate, i);
          const isFirst = i === 0;
          // 1ª parcela fica como PAID se a data for hoje ou passada; as próximas ficam como PENDING
          const isTodayOrPast = txDate.getTime() <= nowBoundary.getTime();
          const status: 'PAID' | 'PENDING' = isFirst && isTodayOrPast ? 'PAID' : 'PENDING';

          const suffix = ` (${i + 1}/${count})`;

          return {
            amountCents: instCents,
            date: txDate,
            description: `${baseDescription}${suffix}`,
            accountId: targetAccountId,
            categoryId: data.categoryId || undefined,
            type: data.type as 'INCOME' | 'EXPENSE' | 'TRANSFER',
            status,
            tags: data.recurrenceType === 'INSTALLMENT' 
              ? ['parcelado', `parcela-${i + 1}-de-${count}`]
              : ['recorrente', `recorrencia-${i + 1}-de-${count}`],
            recurrenceId,
          };
        });

        await api.transactions.createMany(transactionsToCreate);
      } else {
        await api.transactions.create({
          amountCents,
          date: baseDate,
          description: data.description || '',
          accountId: targetAccountId,
          categoryId: data.categoryId || undefined,
          type: data.type as 'INCOME' | 'EXPENSE' | 'TRANSFER',
          status: 'PAID',
          tags: [],
        });
      }
      
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
  const quickPresets = [2, 3, 4, 6, 10, 12, 24, 36];

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200"
      onKeyDown={handleKeyDown}
    >
      <div className="relative bg-white dark:bg-gray-850 p-6 w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-750">
        <div className="flex justify-between items-center mb-5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary-100 dark:bg-primary-950/60 flex items-center justify-center text-primary-600 dark:text-primary-400">
              <Calculator className="w-4 h-4" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
              {selectedType === 'INCOME' ? 'Adicionar Receita' : 'Adicionar Despesa'}
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
              placeholder={selectedType === 'INCOME' ? 'Ex: Salário, Aluguel recebido' : 'Ex: Compra do mês, Notebook'}
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
                Data do Lançamento
              </label>
              <Input
                type="date"
                {...register('date')}
              />
            </div>
          </div>

          {/* Seção de Repetição / Parcelas no decorrer dos meses */}
          <div className="pt-2 border-t border-gray-100 dark:border-gray-750">
            <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200/80 dark:border-gray-700">
              <label htmlFor="isRecurringCheckbox" className="flex items-center gap-2.5 cursor-pointer select-none">
                <div className={`p-1.5 rounded-lg transition-colors ${
                  isRecurring 
                    ? 'bg-primary-600 text-white' 
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                }`}>
                  <Repeat className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    Repetir nos próximos meses
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    Parcelamento ou despesa/renda fixa mensal
                  </div>
                </div>
              </label>
              <input
                id="isRecurringCheckbox"
                type="checkbox"
                {...register('isRecurring')}
                className="w-4 h-4 rounded text-primary-600 focus:ring-primary-500 border-gray-300 dark:border-gray-600 cursor-pointer"
              />
            </div>

            {/* Painel expandido quando a repetição está ativada */}
            {isRecurring && (
              <div className="mt-3 p-4 rounded-xl bg-primary-50/50 dark:bg-primary-950/20 border border-primary-200/60 dark:border-primary-800/60 space-y-3.5 animate-in fade-in slide-in-from-top-1 duration-200">
                {/* Escolha da modalidade: Parcelado vs Fixo */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-primary-800 dark:text-primary-300 mb-1.5">
                    Modalidade de Repetição
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setValue('recurrenceType', 'INSTALLMENT')}
                      className={`flex items-center gap-2 p-2.5 rounded-xl text-left border text-xs font-medium transition-all ${
                        recurrenceType === 'INSTALLMENT'
                          ? 'bg-white dark:bg-gray-800 border-primary-500 text-primary-700 dark:text-primary-300 shadow-xs ring-1 ring-primary-500'
                          : 'bg-white/60 dark:bg-gray-800/40 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-white dark:hover:bg-gray-800'
                      }`}
                    >
                      <Split className="w-4 h-4 shrink-0 text-primary-600 dark:text-primary-400" />
                      <div>
                        <div className="font-semibold">Dividir em parcelas</div>
                        <div className="text-[10px] text-gray-500 dark:text-gray-400">Ex: R$ 300 em 3x de R$ 100</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setValue('recurrenceType', 'FIXED')}
                      className={`flex items-center gap-2 p-2.5 rounded-xl text-left border text-xs font-medium transition-all ${
                        recurrenceType === 'FIXED'
                          ? 'bg-white dark:bg-gray-800 border-primary-500 text-primary-700 dark:text-primary-300 shadow-xs ring-1 ring-primary-500'
                          : 'bg-white/60 dark:bg-gray-800/40 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-white dark:hover:bg-gray-800'
                      }`}
                    >
                      <Layers className="w-4 h-4 shrink-0 text-primary-600 dark:text-primary-400" />
                      <div>
                        <div className="font-semibold">Valor fixo mensal</div>
                        <div className="text-[10px] text-gray-500 dark:text-gray-400">Ex: R$ 100 todo mês por 3 meses</div>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Quantidade de parcelas / vezes */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs font-semibold uppercase tracking-wider text-primary-800 dark:text-primary-300">
                      {recurrenceType === 'INSTALLMENT' ? 'Número de Parcelas' : 'Quantidade de Meses'}
                    </label>
                    <span className="text-[11px] text-primary-700 dark:text-primary-400 font-medium">
                      2 a 120 vezes
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={2}
                      max={120}
                      {...register('installmentsCount')}
                      className="w-24 text-center font-bold text-base"
                    />
                    
                    {/* Botões rápidos de parcelas */}
                    <div className="flex items-center gap-1 flex-wrap">
                      {quickPresets.map(preset => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setValue('installmentsCount', preset)}
                          className={`px-2 py-1 text-xs rounded-lg font-medium transition-colors ${
                            Number(installmentsCount) === preset
                              ? 'bg-primary-600 text-white font-bold'
                              : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-primary-50 dark:hover:bg-gray-750'
                          }`}
                        >
                          {preset}x
                        </button>
                      ))}
                    </div>
                  </div>
                  {errors.installmentsCount && (
                    <span className="text-xs text-rose-500 mt-1 block">{errors.installmentsCount.message}</span>
                  )}
                </div>

                {/* Card de Resumo e Projeção do Lançamento */}
                {recurrencePreview && (
                  <div className="p-3 bg-white dark:bg-gray-850 rounded-xl border border-primary-200/80 dark:border-primary-800/80 text-xs space-y-1.5 shadow-2xs">
                    <div className="flex items-center gap-1.5 text-primary-700 dark:text-primary-400 font-semibold">
                      <CalendarClock className="w-4 h-4 shrink-0" />
                      <span>Resumo da Programação</span>
                    </div>

                    {recurrencePreview.type === 'INSTALLMENT' ? (
                      <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                        Serão geradas <strong>{recurrencePreview.count} parcelas</strong> de cerca de{' '}
                        <strong className="text-primary-600 dark:text-primary-400">
                          {formatCurrency(recurrencePreview.firstCents)}
                        </strong>{' '}
                        {recurrencePreview.hasRemainder && (
                          <span className="text-gray-400 text-[11px]">(ajustado nos centavos) </span>
                        )}
                        todo <strong>dia {recurrencePreview.dayOfMonth}</strong> de cada mês, totalizando{' '}
                        <strong>{formatCurrency(recurrencePreview.totalCents)}</strong>.
                      </p>
                    ) : (
                      <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                        Serão gerados <strong>{recurrencePreview.count} lançamentos</strong> de{' '}
                        <strong className="text-primary-600 dark:text-primary-400">
                          {formatCurrency(recurrencePreview.monthlyCents)}
                        </strong>{' '}
                        todo <strong>dia {recurrencePreview.dayOfMonth}</strong> de cada mês. Total projetado:{' '}
                        <strong>{formatCurrency(recurrencePreview.totalCents)}</strong>.
                      </p>
                    )}

                    <div className="flex items-center justify-between text-[11px] text-gray-500 dark:text-gray-400 pt-1 border-t border-gray-100 dark:border-gray-750">
                      <span className="flex items-center gap-1">
                        <CalendarDays className="w-3.5 h-3.5" />
                        Período: <strong>{recurrencePreview.startLabel}</strong> até <strong>{recurrencePreview.endLabel}</strong>
                      </span>
                      <span className="text-gray-400 text-[10px]">
                        Dia {recurrencePreview.dayOfMonth} mantido automaticamente
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}
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
              {isSubmitting || isLoading 
                ? 'Salvando...' 
                : isRecurring 
                ? `Lançar em ${installmentsCount}x (Enter)` 
                : 'Salvar (Enter)'}
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
