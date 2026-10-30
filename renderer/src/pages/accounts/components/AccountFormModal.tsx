import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api } from '../../../lib/ipc';
import { useAccountStore } from '../../../store/useAccountStore';
import { Input } from '../../../components/ui/input';
import { Select } from '../../../components/ui/select';
import { Button } from '../../../components/ui/button';
import { X } from 'lucide-react';

const accountFormSchema = z.object({
  name: z.string().min(1, 'Nome da conta é obrigatório'),
  type: z.enum(['checking', 'savings', 'credit_card', 'cash', 'investment', 'loan']),
  balance: z.string().default('0,00'),
  currency: z.string().default('BRL'),
  color: z.string().optional(),
  icon: z.string().optional(),
  isActive: z.boolean().default(true),
});

type AccountFormValues = z.infer<typeof accountFormSchema>;

interface AccountFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  accountId?: string | null;
}

export const AccountFormModal: React.FC<AccountFormModalProps> = ({ 
  isOpen, 
  onClose,
  accountId
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AccountFormValues>({
    resolver: zodResolver(accountFormSchema) as any,
    defaultValues: {
      name: '',
      type: 'checking',
      balance: '0,00',
      currency: 'BRL',
      isActive: true,
    },
  });

  const { setAccounts, setLoading: setStoreLoading } = useAccountStore();

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
        });
      }
      
      setStoreLoading(true);
      const accounts = await api.accounts.getAll();
      setAccounts(accounts);
      setStoreLoading(false);
      
      reset();
      onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro ao salvar conta';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="relative bg-white dark:bg-gray-850 p-6 w-full max-w-md rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-750">
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
            {accountId ? 'Editar Conta' : 'Nova Conta'}
          </h2>
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
              Nome da Conta
            </label>
            <Input
              {...register('name')}
              placeholder="Ex: Nubank, Carteira, Banco do Brasil"
            />
            {errors.name && (
              <span className="text-xs text-rose-500 mt-1 block">{errors.name.message}</span>
            )}
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Tipo
            </label>
            <Select {...register('type')}>
              <option value="checking">Conta Corrente</option>
              <option value="savings">Conta Poupança</option>
              <option value="credit_card">Cartão de Crédito</option>
              <option value="cash">Dinheiro / Carteira</option>
              <option value="investment">Investimento</option>
              <option value="loan">Empréstimo</option>
            </Select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Saldo Inicial (R$)
            </label>
            <Input
              {...register('balance')}
              placeholder="0,00"
            />
          </div>
          
          <div className="flex items-center space-x-2 pt-1">
            <input
              id="isActive"
              {...register('isActive')}
              type="checkbox"
              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
            />
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300" htmlFor="isActive">
              Conta ativa
            </label>
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
              {isSubmitting || isLoading ? 'Salvando...' : 'Salvar Conta'}
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
