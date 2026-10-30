import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  Home, 
  DollarSign, 
  Landmark, 
  Tag, 
  Calendar,
  PlusCircle, 
  Sparkles,
  Lock,
  LogOut,
  Wallet,
  Heart
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useTransactionStore } from '../../store/useTransactionStore';
import { useAccountStore } from '../../store/useAccountStore';
import { useDonationStore } from '../../store/useDonationStore';

interface SidebarProps {
  selected?: string;
  onSelect?: (path: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onSelect }) => {
  const setQuickAddOpen = useTransactionStore((state) => state.setQuickAddOpen);
  const openDonationModal = useDonationStore((state) => state.openDonationModal);
  const accounts = useAccountStore((state) => state.accounts);
  const selectedAccountId = useAccountStore((state) => state.selectedAccountId);
  const lockSession = useAccountStore((state) => state.lockSession);

  const activeAccount = accounts.find((a) => a.id === selectedAccountId) || accounts[0];

  const items = [
    { name: 'Início', path: '/', icon: Home },
    { name: 'Lançamentos', path: '/transactions', icon: DollarSign },
    { name: 'Calendário', path: '/calendar', icon: Calendar },
    { name: 'Contas', path: '/accounts', icon: Landmark },
    { name: 'Categorias', path: '/categories', icon: Tag },
  ];

  return (
    <aside className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col justify-between shrink-0">
      <div className="p-4">
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-yellow-300 flex items-center justify-center shadow-md shadow-amber-500/20">
            <Sparkles className="w-5 h-5 text-amber-950" />
          </div>
          <div>
            <span className="text-xl font-bold tracking-tight text-gray-900 dark:text-gray-100">Gringotts</span>
            <span className="block text-[10px] font-medium uppercase tracking-wider text-amber-600 dark:text-amber-400">Finanças Pessoais</span>
          </div>
        </div>

        {/* Quick Add Button */}
        <button
          onClick={() => setQuickAddOpen(true)}
          className="w-full mb-6 flex items-center justify-center gap-2 px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium shadow-sm transition duration-150 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
          title="Atalho: Ctrl+N"
        >
          <PlusCircle className="w-5 h-5" />
          <span>Novo Lançamento</span>
          <kbd className="ml-auto hidden sm:inline-block text-[10px] bg-primary-700/60 px-1.5 py-0.5 rounded text-primary-100 font-mono">^N</kbd>
        </button>

        <nav className="flex flex-col space-y-1">
          {items.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                cn(
                  'flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition duration-150',
                  isActive
                    ? 'bg-primary-50 dark:bg-primary-950/50 text-primary-600 dark:text-primary-400'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-750'
                )
              }
              onClick={() => onSelect?.(item.path)}
            >
              <item.icon className="w-5 h-5" />
              <span className="ml-3">{item.name}</span>
            </NavLink>
          ))}
        </nav>
      </div>

      {/* Rodapé: Conta Ativa e Botão de Bloquear / Trocar Conta */}
      <div className="p-3 border-t border-gray-200 dark:border-gray-700 space-y-2">
        {/* Botão Permanente de Apoio / Pix */}
        <button
          onClick={() => openDonationModal()}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-amber-700 dark:text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/25 transition-all group shadow-2xs"
          title="Apoiar o projeto Gringotts com Pix"
        >
          <Heart className="w-3.5 h-3.5 fill-amber-500 text-amber-500 transition-transform group-hover:scale-125" />
          <span className="font-semibold">Apoiar o Gringotts</span>
          <span className="ml-auto text-[10px] bg-amber-500/20 text-amber-800 dark:text-amber-300 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
            Pix
          </span>
        </button>

        {activeAccount && (
          <div className="p-2.5 rounded-xl bg-gray-50 dark:bg-gray-750/60 border border-gray-100 dark:border-gray-700 flex items-center justify-between">
            <div className="flex items-center space-x-2.5 min-w-0">
              <div 
                className="w-8 h-8 rounded-lg flex items-center justify-center text-white shrink-0 shadow-2xs text-xs font-bold"
                style={{ backgroundColor: activeAccount.color || '#3b82f6' }}
              >
                <Wallet className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 truncate">
                  {activeAccount.name}
                </p>
                <span className="text-[10px] text-gray-400 flex items-center gap-1">
                  {activeAccount.isLocked ? <Lock className="w-2.5 h-2.5 text-amber-500" /> : null}
                  {activeAccount.isLocked ? 'Protegida' : 'Livre'}
                </span>
              </div>
            </div>

            <button
              onClick={() => lockSession()}
              className="p-1.5 rounded-lg text-gray-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-white dark:hover:bg-gray-700 transition-colors"
              title="Trancar / Trocar Conta"
              aria-label="Trancar e Trocar Conta"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="text-[11px] text-gray-400 dark:text-gray-500 text-center">
          Gringotts • Offline First
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
