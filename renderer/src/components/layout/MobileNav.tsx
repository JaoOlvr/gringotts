import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  Home, 
  Leaf, 
  Plus, 
  ShieldAlert, 
  RefreshCw,
  Landmark
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useTransactionStore } from '../../store/useTransactionStore';
import { useP2pSyncStore } from '../../store/useP2pSyncStore';

export const MobileNav: React.FC = () => {
  const setQuickAddOpen = useTransactionStore((s) => s.setQuickAddOpen);
  const openSyncModal = useP2pSyncStore((s) => s.openModal);

  const navItems = [
    { name: 'Início', path: '/', icon: Home },
    { name: 'Zen', path: '/calm', icon: Leaf },
    { name: 'Dívidas', path: '/debts', icon: ShieldAlert },
    { name: 'Contas', path: '/accounts', icon: Landmark },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-gray-850/95 backdrop-blur-md border-t border-gray-200 dark:border-gray-750 px-2 py-1.5 flex items-center justify-around shadow-lg">
      {/* 2 primeiros itens */}
      {navItems.slice(0, 2).map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center justify-center py-1 px-3 rounded-xl text-[10px] font-medium transition-colors',
                isActive
                  ? 'text-primary-600 dark:text-primary-400 font-bold'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
              )
            }
          >
            <Icon className="w-5 h-5 mb-0.5" />
            <span>{item.name}</span>
          </NavLink>
        );
      })}

      {/* Botão Central de Lançamento Rápido (+) */}
      <button
        onClick={() => setQuickAddOpen(true)}
        className="flex flex-col items-center justify-center -mt-5 bg-gradient-to-tr from-primary-600 to-primary-500 hover:from-primary-700 hover:to-primary-600 text-white rounded-full w-12 h-12 shadow-lg shadow-primary-500/30 active:scale-95 transition-transform"
        aria-label="Novo Lançamento"
        title="Novo Lançamento"
      >
        <Plus className="w-6 h-6" />
      </button>

      {/* 2 últimos itens */}
      {navItems.slice(2).map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center justify-center py-1 px-3 rounded-xl text-[10px] font-medium transition-colors',
                isActive
                  ? 'text-primary-600 dark:text-primary-400 font-bold'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
              )
            }
          >
            <Icon className="w-5 h-5 mb-0.5" />
            <span>{item.name}</span>
          </NavLink>
        );
      })}

      {/* Botão Sincronizar P2P */}
      <button
        onClick={openSyncModal}
        className="flex flex-col items-center justify-center py-1 px-2.5 rounded-xl text-[10px] font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
        title="Sincronizar P2P com Computador"
      >
        <RefreshCw className="w-5 h-5 mb-0.5" />
        <span>P2P</span>
      </button>
    </nav>
  );
};

