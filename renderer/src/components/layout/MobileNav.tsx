import React, { useState, useEffect } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { 
  Home, 
  DollarSign,
  Plus, 
  Calculator, 
  Menu, 
  X, 
  Landmark, 
  ShieldAlert, 
  Tag, 
  Calendar, 
  Leaf, 
  Camera, 
  ArrowDownToLine, 
  RefreshCw, 
  Heart, 
  LogOut, 
  Lock,
  ChevronRight,
  Wallet
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useTransactionStore } from '../../store/useTransactionStore';
import { useCalculatorStore } from '../../store/useCalculatorStore';
import { useReceiptScannerStore } from '../../store/useReceiptScannerStore';
import { useOpenFinanceStore } from '../../store/useOpenFinanceStore';
import { useP2pSyncStore } from '../../store/useP2pSyncStore';
import { useDonationStore } from '../../store/useDonationStore';
import { useAccountStore } from '../../store/useAccountStore';
import { GringottsLogo } from '../common/GringottsLogo';
import { ThemeSelector } from '../common/ThemeSelector';

export const MobileNav: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const setQuickAddOpen = useTransactionStore((s) => s.setQuickAddOpen);
  const toggleCalculator = useCalculatorStore((s) => s.toggleCalculator);
  const openReceiptScanner = useReceiptScannerStore((s) => s.openModal);
  const openOpenFinance = useOpenFinanceStore((s) => s.openModal);
  const openP2pSync = useP2pSyncStore((s) => s.openModal);
  const openDonationModal = useDonationStore((s) => s.openDonationModal);
  
  const accounts = useAccountStore((s) => s.accounts);
  const selectedAccountId = useAccountStore((s) => s.selectedAccountId);
  const lockSession = useAccountStore((s) => s.lockSession);

  const activeAccount = accounts.find((a) => a.id === selectedAccountId) || accounts[0];

  // Fecha o menu sempre que a rota mudar
  useEffect(() => {
    setIsMenuOpen(false);
  }, [location.pathname]);

  // Rotas que pertencem às opções do menu suspenso
  const isMenuSubRoute = ['/debts', '/accounts', '/categories', '/calendar', '/calm'].includes(location.pathname);

  const handleNavigate = (path: string) => {
    setIsMenuOpen(false);
    navigate(path);
  };

  const handleAction = (action: () => void) => {
    setIsMenuOpen(false);
    action();
  };

  return (
    <>
      {/* Barra de Navegação Inferior Principal */}
      <nav 
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-gray-850/95 backdrop-blur-md border-t border-gray-200 dark:border-gray-750 px-3 pt-1.5 pb-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] flex items-center justify-between shadow-lg"
        aria-label="Navegação móvel"
      >
        {/* 1. Início */}
        <NavLink
          to="/"
          className={({ isActive }) =>
            cn(
              'flex flex-col items-center justify-center flex-1 py-1 rounded-xl text-[10px] font-medium transition-colors',
              isActive
                ? 'text-primary-600 dark:text-primary-400 font-bold'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
            )
          }
        >
          <Home className="w-5 h-5 mb-0.5" />
          <span>Início</span>
        </NavLink>

        {/* 2. Lançamentos / Extrato */}
        <NavLink
          to="/transactions"
          className={({ isActive }) =>
            cn(
              'flex flex-col items-center justify-center flex-1 py-1 rounded-xl text-[10px] font-medium transition-colors',
              isActive
                ? 'text-primary-600 dark:text-primary-400 font-bold'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
            )
          }
        >
          <DollarSign className="w-5 h-5 mb-0.5" />
          <span>Extrato</span>
        </NavLink>

        {/* 3. Botão Central em Destaque: Novo Lançamento (+) */}
        <div className="flex-1 flex justify-center -mt-6">
          <button
            onClick={() => setQuickAddOpen(true)}
            className="flex items-center justify-center bg-gradient-to-tr from-primary-600 to-primary-500 hover:from-primary-700 hover:to-primary-600 text-white rounded-full w-12 h-12 shadow-lg shadow-primary-500/35 active:scale-90 transition-transform cursor-pointer"
            aria-label="Novo Lançamento"
            title="Novo Lançamento Rápido"
          >
            <Plus className="w-6 h-6 stroke-[2.5]" />
          </button>
        </div>

        {/* 4. Calculadora Financeira */}
        <button
          onClick={() => toggleCalculator()}
          className="flex flex-col items-center justify-center flex-1 py-1 rounded-xl text-[10px] font-medium text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 transition-colors cursor-pointer"
          title="Calculadora Financeira (Juros, Rachar Conta, Padrão)"
          aria-label="Abrir Calculadora Financeira"
        >
          <Calculator className="w-5 h-5 mb-0.5" />
          <span>Calculadora</span>
        </button>

        {/* 5. Menu Mais Opções */}
        <button
          onClick={() => setIsMenuOpen(true)}
          className={cn(
            'flex flex-col items-center justify-center flex-1 py-1 rounded-xl text-[10px] font-medium transition-colors relative cursor-pointer',
            isMenuOpen || isMenuSubRoute
              ? 'text-primary-600 dark:text-primary-400 font-bold'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
          )}
          title="Mais opções e ferramentas"
          aria-label="Mais opções"
        >
          <div className="relative">
            <Menu className="w-5 h-5 mb-0.5" />
            {isMenuSubRoute && !isMenuOpen && (
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-primary-500 ring-2 ring-white dark:ring-gray-850" />
            )}
          </div>
          <span>Mais</span>
        </button>
      </nav>

      {/* Drawer / Bottom Sheet de Mais Opções */}
      {isMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50">
          {/* Backdrop Escuro */}
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
            onClick={() => setIsMenuOpen(false)}
          />

          {/* Painel Inferior */}
          <div 
            className="fixed bottom-0 inset-x-0 bg-white dark:bg-gray-850 rounded-t-3xl border-t border-gray-200 dark:border-gray-750 shadow-2xl flex flex-col max-h-[85vh] animate-in slide-in-from-bottom duration-250 pb-[max(1rem,env(safe-area-inset-bottom))]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Puxador Superior */}
            <div className="pt-3 pb-1 flex justify-center cursor-pointer" onClick={() => setIsMenuOpen(false)}>
              <div className="w-12 h-1.5 bg-gray-300 dark:bg-gray-600 rounded-full" />
            </div>

            {/* Cabeçalho do Menu */}
            <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <GringottsLogo className="w-8 h-8 rounded-xl shadow-xs shadow-amber-500/20" />
                <div>
                  <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">Gringotts</h3>
                  <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                    Menu Completo
                  </span>
                </div>
              </div>

              <button
                onClick={() => setIsMenuOpen(false)}
                className="p-1.5 rounded-xl text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                aria-label="Fechar menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Conteúdo Rolável */}
            <div className="overflow-y-auto px-4 py-3 space-y-4">
              {/* Cartão da Conta Ativa */}
              {activeAccount && (
                <div className="p-3 rounded-2xl bg-gray-50 dark:bg-gray-800/70 border border-gray-100 dark:border-gray-700/80 flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div 
                      className="w-9 h-9 rounded-xl flex items-center justify-center text-white shrink-0 shadow-2xs text-xs font-bold"
                      style={{ backgroundColor: activeAccount.color || '#3b82f6' }}
                    >
                      <Wallet className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-gray-900 dark:text-gray-100 truncate">
                        {activeAccount.name}
                      </p>
                      <span className="text-[10px] text-gray-400 flex items-center gap-1">
                        {activeAccount.isLocked ? <Lock className="w-2.5 h-2.5 text-amber-500" /> : null}
                        {activeAccount.isLocked ? 'Carteira Protegida' : 'Carteira Livre'}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setIsMenuOpen(false);
                      lockSession();
                    }}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium text-amber-600 dark:text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 transition-colors"
                    title="Trancar ou Trocar de Conta"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Trocar</span>
                  </button>
                </div>
              )}

              {/* Seção 1: Navegação Principal */}
              <div>
                <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider px-1">
                  Gerenciamento
                </span>
                <div className="grid grid-cols-2 gap-2 mt-1.5">
                  <button
                    onClick={() => handleNavigate('/accounts')}
                    className={cn(
                      'flex items-center gap-2.5 p-3 rounded-2xl text-left border transition-all',
                      location.pathname === '/accounts'
                        ? 'bg-primary-50 dark:bg-primary-950/40 border-primary-500/40 text-primary-600 dark:text-primary-400'
                        : 'bg-gray-50 dark:bg-gray-800/50 border-gray-100 dark:border-gray-750 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800'
                    )}
                  >
                    <div className="w-8 h-8 rounded-xl bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                      <Landmark className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-xs font-bold block truncate">Contas</span>
                      <span className="text-[10px] text-gray-400 block truncate">Saldos & Cartões</span>
                    </div>
                  </button>

                  <button
                    onClick={() => handleNavigate('/debts')}
                    className={cn(
                      'flex items-center gap-2.5 p-3 rounded-2xl text-left border transition-all',
                      location.pathname === '/debts'
                        ? 'bg-primary-50 dark:bg-primary-950/40 border-primary-500/40 text-primary-600 dark:text-primary-400'
                        : 'bg-gray-50 dark:bg-gray-800/50 border-gray-100 dark:border-gray-750 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800'
                    )}
                  >
                    <div className="w-8 h-8 rounded-xl bg-rose-500/15 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                      <ShieldAlert className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-xs font-bold block truncate">Dívidas</span>
                      <span className="text-[10px] text-gray-400 block truncate">Contas & Parcelas</span>
                    </div>
                  </button>

                  <button
                    onClick={() => handleNavigate('/categories')}
                    className={cn(
                      'flex items-center gap-2.5 p-3 rounded-2xl text-left border transition-all',
                      location.pathname === '/categories'
                        ? 'bg-primary-50 dark:bg-primary-950/40 border-primary-500/40 text-primary-600 dark:text-primary-400'
                        : 'bg-gray-50 dark:bg-gray-800/50 border-gray-100 dark:border-gray-750 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800'
                    )}
                  >
                    <div className="w-8 h-8 rounded-xl bg-violet-500/15 text-violet-600 dark:text-violet-400 flex items-center justify-center shrink-0">
                      <Tag className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-xs font-bold block truncate">Categorias</span>
                      <span className="text-[10px] text-gray-400 block truncate">Tags & Metas</span>
                    </div>
                  </button>

                  <button
                    onClick={() => handleNavigate('/calendar')}
                    className={cn(
                      'flex items-center gap-2.5 p-3 rounded-2xl text-left border transition-all',
                      location.pathname === '/calendar'
                        ? 'bg-primary-50 dark:bg-primary-950/40 border-primary-500/40 text-primary-600 dark:text-primary-400'
                        : 'bg-gray-50 dark:bg-gray-800/50 border-gray-100 dark:border-gray-750 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800'
                    )}
                  >
                    <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                      <Calendar className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-xs font-bold block truncate">Calendário</span>
                      <span className="text-[10px] text-gray-400 block truncate">Vencimentos</span>
                    </div>
                  </button>

                  <button
                    onClick={() => handleNavigate('/calm')}
                    className={cn(
                      'col-span-2 flex items-center justify-between p-3 rounded-2xl text-left border transition-all',
                      location.pathname === '/calm'
                        ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-500/40 text-emerald-600 dark:text-emerald-400'
                        : 'bg-gray-50 dark:bg-gray-800/50 border-gray-100 dark:border-gray-750 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800'
                    )}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                        <Leaf className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <span className="text-xs font-bold block">Modo Calma</span>
                        <span className="text-[10px] text-gray-400 block">Visão minimalista sem ansiedade</span>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-500 border border-emerald-500/30 uppercase">
                      Zen
                    </span>
                  </button>
                </div>
              </div>

              {/* Seção 2: Ferramentas Inteligentes */}
              <div>
                <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider px-1">
                  Ferramentas Inteligentes
                </span>
                <div className="space-y-1.5 mt-1.5">
                  {/* Calculadora */}
                  <button
                    onClick={() => handleAction(toggleCalculator)}
                    className="w-full flex items-center justify-between p-3 rounded-2xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-750 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200 transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                        <Calculator className="w-4 h-4" />
                      </div>
                      <div className="text-left">
                        <span className="text-xs font-bold block">Calculadora Financeira</span>
                        <span className="text-[10px] text-gray-400 block">Juros compostos, divisão de conta & padrão</span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />
                  </button>

                  {/* Escanear Nota OCR */}
                  <button
                    onClick={() => handleAction(openReceiptScanner)}
                    className="w-full flex items-center justify-between p-3 rounded-2xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-750 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200 transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                        <Camera className="w-4 h-4" />
                      </div>
                      <div className="text-left">
                        <span className="text-xs font-bold block">Escanear Nota ou Cupom</span>
                        <span className="text-[10px] text-gray-400 block">Leitura OCR 100% offline via câmera</span>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25 uppercase shrink-0">
                      OCR
                    </span>
                  </button>

                  {/* Importar Extrato OFX */}
                  <button
                    onClick={() => handleAction(openOpenFinance)}
                    className="w-full flex items-center justify-between p-3 rounded-2xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-750 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200 transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-primary-500/15 text-primary-600 dark:text-primary-400 flex items-center justify-center shrink-0">
                        <ArrowDownToLine className="w-4 h-4" />
                      </div>
                      <div className="text-left">
                        <span className="text-xs font-bold block">Importar Extrato Bancário</span>
                        <span className="text-[10px] text-gray-400 block">Arquivos .OFX ou Open Finance JSON</span>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary-500/15 text-primary-600 dark:text-primary-400 border border-primary-500/25 uppercase shrink-0">
                      OFX
                    </span>
                  </button>

                  {/* Sincronização P2P */}
                  <button
                    onClick={() => handleAction(openP2pSync)}
                    className="w-full flex items-center justify-between p-3 rounded-2xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-750 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200 transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                        <RefreshCw className="w-4 h-4" />
                      </div>
                      <div className="text-left">
                        <span className="text-xs font-bold block">Sincronização P2P</span>
                        <span className="text-[10px] text-gray-400 block">Sincronizar dados com o Computador</span>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/25 uppercase shrink-0">
                      Wi-Fi
                    </span>
                  </button>
                </div>
              </div>

              {/* Seção 3: Preferências & Apoio */}
              <div>
                <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider px-1">
                  Preferências & Apoio
                </span>
                <div className="space-y-2 mt-1.5">
                  {/* Botão de Apoio Pix */}
                  <button
                    onClick={() => handleAction(openDonationModal)}
                    className="w-full flex items-center justify-between p-3 rounded-2xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-800 dark:text-amber-300 transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-500 flex items-center justify-center shrink-0">
                        <Heart className="w-4 h-4 fill-amber-500" />
                      </div>
                      <div className="text-left">
                        <span className="text-xs font-bold block">Apoiar o Gringotts</span>
                        <span className="text-[10px] text-amber-700/80 dark:text-amber-400/80 block">
                          Contribua via Pix com o projeto livre
                        </span>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/25 text-amber-800 dark:text-amber-200 uppercase shrink-0">
                      Pix
                    </span>
                  </button>

                  {/* Seletor de Tema */}
                  <div className="p-3 rounded-2xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-750 space-y-2">
                    <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 block">
                      Aparência do Aplicativo
                    </span>
                    <ThemeSelector />
                  </div>
                </div>
              </div>

              {/* Rodapé do Menu */}
              <div className="pt-2 text-center text-[11px] text-gray-400 dark:text-gray-500">
                Gringotts v1.5.4 • 100% Offline & Privado
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default MobileNav;
