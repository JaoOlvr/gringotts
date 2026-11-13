import React, { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useTransactionStore } from '../../store/useTransactionStore';
import { useAccountStore } from '../../store/useAccountStore';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/ipc';
import { QuickAddTransactionModal } from '../../pages/transactions/components/QuickAddTransactionModal';
import { DonationModal } from '../donation/DonationModal';
import { CalculatorModal } from '../calculator/CalculatorModal';
import { UpdateModal } from '../updater/UpdateModal';
import { OpenFinanceImportModal } from '../openfinance/OpenFinanceImportModal';
import { ReceiptScannerModal } from '../receipts/ReceiptScannerModal';
import { useDonationStore } from '../../store/useDonationStore';
import { useUpdaterStore } from '../../store/useUpdaterStore';

interface MainLayoutProps {
  children?: React.ReactNode;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const { quickAddOpen, setQuickAddOpen, quickAddInitialAmount } = useTransactionStore();
  const accounts = useAccountStore((state) => state.accounts);
  const queryClient = useQueryClient();

  useEffect(() => {
    // Checa gatilho de doação (na inicialização ou gatilho inteligente)
    useDonationStore.getState().checkAutoPrompt();

    // Checa atualização em segundo plano após 3s
    const updateTimer = setTimeout(() => {
      useUpdaterStore.getState().checkForUpdates(false);
    }, 3000);

    const unsubscribe = api.on('open-quick-add-modal', () => {
      setQuickAddOpen(true);
    });
    return () => {
      clearTimeout(updateTimer);
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
    <div className="flex h-screen w-full bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto overflow-x-hidden min-w-0">
        {children ?? <Outlet />}
      </main>

      <QuickAddTransactionModal
        isOpen={quickAddOpen}
        onClose={() => setQuickAddOpen(false)}
        onTransactionAdded={handleTransactionAdded}
        defaultAccountId={accounts[0]?.id}
        defaultAmount={quickAddInitialAmount}
      />

      <DonationModal />
      <CalculatorModal />
      <UpdateModal />
      <OpenFinanceImportModal />
      <ReceiptScannerModal />
    </div>
  );
};

export default MainLayout;
