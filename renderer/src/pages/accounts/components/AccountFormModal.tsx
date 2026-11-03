import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api } from '../../../lib/ipc';
import { useAccountStore } from '../../../store/useAccountStore';
import { Input } from '../../../components/ui/input';
import { Select } from '../../../components/ui/select';
import { Button } from '../../../components/ui/button';
import { X, Landmark, Eye, EyeOff, Layers, Info } from 'lucide-react';

const accountFormSchema = z.object({
  name: z.string().min(1, 'Nome da conta é obrigatório'),
  type: z.enum(['checking', 'savings', 'credit_card', 'cash', 'investment', 'loan']),
  balance: z.string().default('0,00'),
  currency: z.string().default('BRL'),
  color: z.string().optional(),
  icon: z.string().optional(),
  isActive: z.boolean().default(true),
  includeInTotal: z.boolean().default(true),
});

type AccountFormValues = z.infer<typeof accountFormSchema>;

interface AccountFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  accountId?: string | null;
}

const COLOR_PRESETS = [
  '#3b82f6', // Azul
  '#820ad1', // Roxo Nubank
  '#10b981', // Esmeralda
  '#f59e0b', // Âmbar / Ouro
  '#ef4444', // Vermelho
  '#ec4899', // Rosa
  '#06b6d4', // Ciano
  '#6366f1', // Índigo
];

export const AccountFormModal: React.FC<AccountFormModalProps> = ({ 
  isOpen, 
  onClose,
  accountId
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const accounts = useAccountStore((s) => s.accounts);
  const { setAccounts, setLoading: setStoreLoading } = useAccountStore();
  
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<AccountFormValues>({
    resolver: zodResolver(accountFormSchema) as any,
    defaultValues: {
      name: '',
      type: 'checking',
      balance: '0,00',
      currency: 'BRL',
      color: '#3b82f6',
      isActive: true,
      includeInTotal: true,
    },
  });

  const selectedColor = watch('color') || '#3b82f6';
  const includeInTotal = watch('includeInTotal');

  // Carrega os dados reais da conta quando abrir para editar
  useEffect(() => {
    if (!isOpen) return;

    if (accountId) {
      const existing = accounts.find((a) => a.id === accountId);
      if (existing) {
        const formattedBalance = (existing.balanceCents / 100)
          .toFixed(2)
          .replace('.', ',');

        reset({
          name: existing.name,
          type: existing.type as any,
          balance: formattedBalance,
          currency: existing.currency || 'BRL',
          color: existing.color || '#3b82f6',
          icon: existing.icon,
          isActive: existing.isActive,
          includeInTotal: existing.includeInTotal !== false,
        });
      }
    } else {
      reset({
        name: '',
        type: 'checking',
        balance: '0,00',
        currency: 'BRL',
        color: '#3b82f6',
        isActive: true,
        includeInTotal: true,
      });
    }
    setError(null);
  }, [isOpen, accountId, accounts, reset]);

  const onSubmit = async (data: AccountFormValues) => {
    setIsLoading(true);
    setError(null);
    try {
      const sanitized = data.balance.replace(/\./g, '').replace(',', '.');
      const balanceFloat = parseFloat(sanitized) || 0;
      const balanceCents = Math.round(balanceFloat * 100);

      if (accountId) {
        await api.accounts.update(accountId, {
          name: data.name,
          type: data.type,
          balanceCents,
          currency: data.currency,
          color: data.color,
          icon: data.icon,
          isActive: data.isActive,
          includeInTotal: data.includeInTotal,
        });
      } else {
        await api.accounts.create({
          name: data.name,
          type: data.type,
          balanceCents,
          currency: data.currency,
          color: data.color,
          icon: data.icon,
          isActive: data.isActive,
          includeInTotal: data.includeInTotal,
        });
      }
      
      setStoreLoading(true);
      const updatedAccounts = await api.accounts.getAll();
      setAccounts(updatedAccounts);
      setStoreLoading(false);
      
      reset();
      onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro ao salvar carteira';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="relative bg-white dark:bg-gray-850 p-6 w-full max-w-lg rounded-3xl shadow-2xl border border-gray-100 dark:border-gray-750 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-5 pb-3 border-b border-gray-100 dark:border-gray-750">
          <div className="flex items-center gap-3">
            <div 
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-xs"
              style={{ backgroundColor: selectedColor }}
            >
              <Landmark className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                {accountId ? 'Configurar Carteira' : 'Nova Conta / Carteira'}
              </h2>
              <p className="text-xs text-gray-400">
                {accountId ? 'Ajuste o saldo inicial e preferências da conta' : 'Defina os dados da sua nova conta bancária ou cofre'}
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
              Nome da Carteira / Conta
            </label>
            <Input
              {...register('name')}
              placeholder="Ex: Nubank, Carteira Física, Reserva de Emergência"
            />
            {errors.name && (
              <span className="text-xs text-rose-500 mt-1 block">{errors.name.message}</span>
            )}
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Tipo
              </label>
              <Select {...register('type')}>
                <option value="checking">Conta Corrente</option>
                <option value="savings">Conta Poupança</option>
                <option value="credit_card">Cartão de Crédito</option>
                <option value="cash">Dinheiro / Carteira</option>
                <option value="investment">Investimento / Reserva</option>
                <option value="loan">Empréstimo</option>
              </Select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Saldo Inicial / Base (R$)
              </label>
              <Input
                {...register('balance')}
                placeholder="0,00"
              />
              <span className="text-[11px] text-gray-400 mt-1 block">
                Você pode corrigir este valor a qualquer momento.
              </span>
            </div>
          </div>

          {/* Paleta de Cores */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">
              Cor de Identificação
            </label>
            <div className="flex items-center gap-2 flex-wrap">
              {COLOR_PRESETS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setValue('color', c)}
                  className={`w-7 h-7 rounded-lg transition-transform ${
                    selectedColor === c ? 'scale-115 ring-2 ring-primary-500 ring-offset-2 dark:ring-offset-gray-850' : 'hover:scale-105'
                  }`}
                  style={{ backgroundColor: c }}
                  title={c}
                />
              ))}
            </div>
          </div>

          {/* Seção de Configuração de Soma no Total */}
          <div className="p-3.5 rounded-2xl bg-gray-50 dark:bg-gray-800/80 border border-gray-200/80 dark:border-gray-700 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-0.5">
                <label htmlFor="includeInTotal" className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2 cursor-pointer">
                  {includeInTotal ? (
                    <Layers className="w-4 h-4 text-emerald-500" />
                  ) : (
                    <EyeOff className="w-4 h-4 text-amber-500" />
                  )}
                  <span>Somar esta conta no saldo e receitas gerais</span>
                </label>
                <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                  {includeInTotal 
                    ? 'O saldo e movimentações desta carteira são somados nos totais gerais do Dashboard e relatórios.' 
                    : 'Esta carteira fica isolada. O saldo dela NÃO é somado no total geral do Dashboard nem distorce suas receitas operacionais.'}
                </p>
              </div>
              <input
                id="includeInTotal"
                {...register('includeInTotal')}
                type="checkbox"
                className="mt-1 h-5 w-5 rounded border-gray-300 dark:border-gray-600 text-amber-500 focus:ring-amber-500/30 cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-gray-200/60 dark:border-gray-700/60">
              <label htmlFor="isActive" className="text-xs font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
                Carteira ativa (visível nas opções de lançamento)
              </label>
              <input
                id="isActive"
                {...register('isActive')}
                type="checkbox"
                className="h-4 w-4 rounded border-gray-300 dark:border-gray-600 text-primary-600 focus:ring-primary-500 cursor-pointer"
              />
            </div>
          </div>
          
          <div className="flex justify-end space-x-3 pt-3">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || isLoading}
            >
              {isSubmitting || isLoading ? 'Salvando...' : accountId ? 'Atualizar Carteira' : 'Cadastrar Carteira'}
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

export default AccountFormModal;
