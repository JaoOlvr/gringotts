import React, { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useTransactionStore } from '../../store/useTransactionStore';
import { useAccountStore } from '../../store/useAccountStore';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/ipc';
import { QuickAddTransactionModal } from '../../pages/transactions/components/QuickAddTransactionModal';

interface MainLayoutProps {
  children?: React.ReactNode;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const { quickAddOpen, setQuickAddOpen } = useTransactionStore();
  const accounts = useAccountStore((state) => state.accounts);
  const queryClient = useQueryClient();

  useEffect(() => {
    const unsubscribe = api.on('open-quick-add-modal', () => {
      setQuickAddOpen(true);
    });
    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, [setQuickAddOpen]);

  const handleTransactionAdded = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['transactions'] }),
      queryClient.invalidateQueries({ queryKey: ['accounts'] }),
      queryClient.invalidateQueries({ queryKey: ['budgets'] }),
      queryClient.invalidateQueries({ queryKey: ['recent-transactions'] }),
      queryClient.invalidateQueries({ queryKey: ['categories'] }),
      queryClient.invalidateQueries({ queryKey: ['goals'] }),
    ]);
    try {
      const refreshedAccounts = await api.accounts.getAll();
      useAccountStore.getState().setAccounts(refreshedAccounts);
    } catch (e) {
      console.warn('Failed to refresh accounts store:', e);
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        {children ?? <Outlet />}
      </main>

      <QuickAddTransactionModal
        isOpen={quickAddOpen}
        onClose={() => setQuickAddOpen(false)}
        onTransactionAdded={handleTransactionAdded}
        defaultAccountId={accounts[0]?.id}
      />
    </div>
  );
};

export default MainLayout;
