import React, { useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { MainLayout } from './components/layout/MainLayout';
import { DashboardPage } from './pages/dashboard/DashboardPage';
import { TransactionsPage } from './pages/transactions/TransactionsPage';
import { AccountsPage } from './pages/accounts/AccountsPage';
import { CategoriesPage } from './pages/categories/CategoriesPage';
import { CalendarPage } from './pages/calendar/CalendarPage';
import { CalmPage } from './pages/calm/CalmPage';
import { OnboardingPage } from './pages/onboarding/OnboardingPage';
import { AccountSelectScreen } from './pages/intro/AccountSelectScreen';
import { useAccountStore } from './store/useAccountStore';
import { api } from './lib/ipc';
import { useGlobalKeyboardShortcuts } from './lib/keyboard';
import { GringottsLogo } from './components/common/GringottsLogo';
import { useThemeStore } from './store/useThemeStore';

function App() {
  useGlobalKeyboardShortcuts();
  const { accounts, setAccounts, selectedAccountId, isUnlocked } = useAccountStore();
  const [initialLoading, setInitialLoading] = React.useState(true);

  useEffect(() => {
    // Inicializa listeners do tema do sistema operacional
    const cleanupTheme = useThemeStore.getState().initTheme();

    api.accounts.getAll()
      .then((accs) => {
        setAccounts(accs);
      })
      .catch((err) => {
        console.error('Failed to load accounts in App:', err);
      })
      .finally(() => {
        setInitialLoading(false);
      });

    return () => {
      cleanupTheme();
    };
  }, [setAccounts]);

  const needsOnboarding = accounts.length === 0;
  const isAccountActive = !!selectedAccountId && isUnlocked;

  if (initialLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="flex flex-col items-center gap-3">
          <GringottsLogo className="w-12 h-12 rounded-2xl animate-pulse shadow-lg shadow-amber-500/20" />
          <span className="text-sm font-medium text-gray-500">Iniciando Gringotts...</span>
        </div>
      </div>
    );
  }

  return (
    <HashRouter>
      <Routes>
        <Route path="/onboarding" element={<OnboardingPage />} />
        <Route 
          path="/select-account" 
          element={needsOnboarding ? <Navigate to="/onboarding" replace /> : <AccountSelectScreen />} 
        />
        
        {/* Rotas protegidas da sessão da conta */}
        <Route 
          element={
            needsOnboarding ? (
              <Navigate to="/onboarding" replace />
            ) : !isAccountActive ? (
              <Navigate to="/select-account" replace />
            ) : (
              <MainLayout />
            )
          }
        >
          <Route path="/" element={<DashboardPage />} />
          <Route path="/calm" element={<CalmPage />} />
          <Route path="/transactions" element={<TransactionsPage />} />
          <Route path="/calendar" element={<CalendarPage />} />
          <Route path="/accounts" element={<AccountsPage />} />
          <Route path="/categories" element={<CategoriesPage />} />
        </Route>
        
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  );
}

export default App;