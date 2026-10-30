import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/ipc';
import { useTransactionStore } from '../../store/useTransactionStore';
import { Button } from '../../components/ui/button';
import { TransactionsTable } from './components/TransactionsTable';
import { Plus, ReceiptText } from 'lucide-react';

export const TransactionsPage: React.FC = () => {
  const { transactions, setTransactions, setLoading, setError, quickAddOpen, setQuickAddOpen } = useTransactionStore();
  const [defaultAccountId, setDefaultAccountId] = useState<string>('');
  const queryClient = useQueryClient();

  const {
    data: fetchedTransactions,
    isLoading,
    error: queryError,
    refetch,
  } = useQuery({
    queryKey: ['transactions'],
    queryFn: () => api.transactions.getAll({
      limit: 100,
    }),
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.categories.getAll(),
  });

  useEffect(() => {
    if (isLoading) {
      setLoading(true);
      setError(null);
    }
    
    if (fetchedTransactions !== undefined) {
      setTransactions(fetchedTransactions);
      setLoading(false);
      setError(null);
    }
    
    if (queryError) {
      setLoading(false);
      setError(queryError instanceof Error ? queryError.message : String(queryError));
    }
  }, [fetchedTransactions, queryError, isLoading, setTransactions, setLoading, setError]);

  useEffect(() => {
    const loadDefaultAccount = async () => {
      try {
        const accounts = await api.accounts.getAll();
        const activeAccounts = accounts.filter(acc => acc.isActive);
        if (activeAccounts.length > 0) {
          const checkingAccount = activeAccounts.find(acc => acc.type === 'checking');
          setDefaultAccountId(checkingAccount ? checkingAccount.id : activeAccounts[0]!.id);
        }
      } catch (err) {
        console.error('Failed to load accounts for default:', err);
      }
    };
    
    loadDefaultAccount();
  }, []);

  const handleQuickAddClose = () => {
    setQuickAddOpen(false);
  };

  const handleTransactionAdded = () => {
    setQuickAddOpen(false);
    queryClient.invalidateQueries({ queryKey: ['transactions'] });
    queryClient.invalidateQueries({ queryKey: ['accounts'] });
    refetch();
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Excluir este lançamento?')) {
      await api.transactions.delete(id);
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      refetch();
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
            Lançamentos
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Histórico completo de receitas, despesas e transferências
          </p>
        </div>
        <Button onClick={() => setQuickAddOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          Novo Lançamento
        </Button>
      </div>

      {isLoading && (
        <div className="h-64 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      )}

      {queryError && (
        <div className="p-4 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-xl text-rose-600 dark:text-rose-400 text-sm">
          {queryError instanceof Error ? queryError.message : String(queryError)}
        </div>
      )}

      {!isLoading && transactions.length === 0 && (
        <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-2xl border border-dashed border-gray-300 dark:border-gray-700 p-8">
          <ReceiptText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">Nenhum lançamento registrado</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 mb-4">
            Pressione Ctrl+N ou clique no botão acima para registrar seu primeiro gasto ou ganho.
          </p>
          <Button onClick={() => setQuickAddOpen(true)}>
            Adicionar Lançamento
          </Button>
        </div>
      )}

      {!isLoading && transactions.length > 0 && (
        <TransactionsTable transactions={transactions} categories={categories} onDelete={handleDelete} />
      )}
    </div>
  );
};

export default TransactionsPage;
