import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAccountStore } from '../../store/useAccountStore';
import { formatCurrency } from '../../lib/utils';
import { AccountUnlockModal } from '../../components/security/AccountUnlockModal';
import { AccountSecurityModal } from '../../components/security/AccountSecurityModal';
import { DeleteAccountModal } from '../../components/security/DeleteAccountModal';
import { AccountFormModal } from '../accounts/components/AccountFormModal';
import { GringottsLogo } from '../../components/common/GringottsLogo';
import { api } from '../../lib/ipc';
import { 
  Sparkles, 
  Lock, 
  ShieldCheck, 
  Plus, 
  Wallet, 
  Landmark, 
  CreditCard, 
  Coins, 
  TrendingUp, 
  HelpCircle,
  Eye, 
  EyeOff, 
  ArrowRight,
  KeyRound,
  Trash2,
  Pencil
} from 'lucide-react';
import type { Account } from '../../types';

export const AccountSelectScreen: React.FC = () => {
  const navigate = useNavigate();
  const accounts = useAccountStore((state) => state.accounts);
  const setAccounts = useAccountStore((state) => state.setAccounts);
  const unlockAccount = useAccountStore((state) => state.unlockAccount);

  const [selectedForUnlock, setSelectedForUnlock] = useState<Account | null>(null);
  const [selectedForSecurity, setSelectedForSecurity] = useState<Account | null>(null);
  const [selectedForDelete, setSelectedForDelete] = useState<Account | null>(null);
  const [isCreateAccountOpen, setIsCreateAccountOpen] = useState(false);
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
  const [showBalances, setShowBalances] = useState(true);

  const getAccountIcon = (type: string) => {
    switch (type) {
      case 'checking':
        return Landmark;
      case 'savings':
      case 'investment':
        return TrendingUp;
      case 'credit_card':
        return CreditCard;
      case 'cash':
        return Coins;
      default:
        return Wallet;
    }
  };

  const getAccountTypeName = (type: string) => {
    switch (type) {
      case 'checking':
        return 'Conta Corrente';
      case 'savings':
        return 'Poupança';
      case 'investment':
        return 'Investimentos';
      case 'credit_card':
        return 'Cartão de Crédito';
      case 'cash':
        return 'Dinheiro / Carteira';
      default:
        return 'Carteira';
    }
  };

  const reloadAccounts = async () => {
    try {
      const accs = await api.accounts.getAll();
      setAccounts(accs);
    } catch (err) {
      console.error('Falha ao recarregar contas:', err);
    }
  };

  const handleAccountClick = (acc: Account) => {
    if (acc.isLocked) {
      setSelectedForUnlock(acc);
    } else {
      unlockAccount(acc.id);
      navigate('/', { state: { selectedAccountId: acc.id } });
    }
  };

  const handleUnlocked = (accountId: string) => {
    setSelectedForUnlock(null);
    unlockAccount(accountId);
    navigate('/', { state: { selectedAccountId: accountId } });
  };

  return (
    <div className="h-full min-h-screen w-full bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 flex flex-col justify-between p-4 sm:p-6 lg:p-8 select-none overflow-y-auto overflow-x-hidden">
      {/* Top Header */}
      <div className="max-w-5xl w-full mx-auto flex items-center justify-between shrink-0 mb-4 sm:mb-6">
        <div className="flex items-center space-x-3">
          <GringottsLogo className="w-9 h-9 rounded-xl shadow-lg shadow-amber-500/20 shrink-0" />
          <div>
            <h1 className="text-lg font-bold tracking-tight text-gray-900 dark:text-gray-100">
              Gringotts
            </h1>
            <span className="block text-[10px] font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
              Controle Financeiro Seguro
            </span>
          </div>
        </div>

        {/* Toggle de Visualização de Saldo */}
        <button
          onClick={() => setShowBalances(!showBalances)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-white/70 dark:bg-gray-850/70 hover:bg-gray-100 dark:hover:bg-gray-800 text-xs font-medium text-gray-600 dark:text-gray-300 transition-colors shadow-2xs"
          title={showBalances ? 'Ocultar saldos' : 'Exibir saldos'}
        >
          {showBalances ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          <span>{showBalances ? 'Ocultar Saldos' : 'Mostrar Saldos'}</span>
        </button>
      </div>

      {/* Main Content: Seletor de Contas */}
      <div className="max-w-5xl w-full mx-auto my-auto py-2 sm:py-6">
        <div className="text-center mb-6 sm:mb-8">
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-gray-900 dark:text-gray-100">
            Quem está acessando?
          </h2>
          <p className="mt-1.5 text-xs sm:text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto">
            Selecione uma conta ou carteira para desbloquear e gerenciar suas finanças.
          </p>
        </div>

        {/* Grid de Contas */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {accounts.map((acc) => {
            const IconComponent = getAccountIcon(acc.type);
            const isLocked = !!acc.isLocked;

            return (
              <div
                key={acc.id}
                className="group relative bg-white dark:bg-gray-850 rounded-2xl p-5 border border-gray-200/80 dark:border-gray-750 hover:border-primary-500 dark:hover:border-primary-500 shadow-2xs hover:shadow-lg transition-all duration-200 flex flex-col justify-between cursor-pointer min-h-[175px]"
                onClick={() => handleAccountClick(acc)}
              >
                <div>
                  {/* Linha superior: Ícone da Conta e Badge de Segurança */}
                  <div className="flex items-start justify-between mb-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-sm transition-transform group-hover:scale-105"
                      style={{ backgroundColor: acc.color || '#3b82f6' }}
                    >
                      <IconComponent className="w-5 h-5" />
                    </div>

                    <div className="flex items-center gap-1">
                      {isLocked ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/50">
                          <Lock className="w-2.5 h-2.5" />
                          {acc.lockType === 'PIN' ? 'PIN' : 'Senha'}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/40">
                          <ShieldCheck className="w-2.5 h-2.5" />
                          Livre
                        </span>
                      )}

                      {/* Botão de Configuração de Senha diretamente no card */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedForSecurity(acc);
                        }}
                        className="p-1 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-750 transition-colors"
                        title={isLocked ? 'Alterar ou remover senha' : 'Adicionar senha a esta conta'}
                      >
                        <KeyRound className="w-3.5 h-3.5" />
                      </button>

                      {/* Botão de Editar Conta e Saldo Inicial */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingAccountId(acc.id);
                        }}
                        className="p-1 rounded-lg text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-gray-100 dark:hover:bg-gray-750 transition-colors"
                        title="Editar carteira, saldo e configurações"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>

                      {/* Botão de Excluir Conta com Confirmação/Senha */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedForDelete(acc);
                        }}
                        className="p-1 rounded-lg text-gray-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                        title="Excluir conta"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Nome da Conta e Tipo */}
                  <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors truncate">
                    {acc.name}
                  </h3>
                  <p className="text-[11px] text-gray-400 dark:text-gray-500">
                    {getAccountTypeName(acc.type)}
                  </p>
                </div>

                {/* Saldo e Ação de Entrada */}
                <div className="pt-3 mt-3 border-t border-gray-100 dark:border-gray-800 flex items-end justify-between">
                  <div>
                    <span className="block text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                      Saldo Disponível
                    </span>
                    <span className="text-lg font-bold tracking-tight text-gray-900 dark:text-gray-100 font-mono">
                      {showBalances ? formatCurrency(acc.balanceCents) : '••••••••'}
                    </span>
                  </div>

                  <div className="w-7 h-7 rounded-full bg-gray-100 dark:bg-gray-800 group-hover:bg-primary-600 dark:group-hover:bg-primary-600 group-hover:text-white flex items-center justify-center text-gray-400 transition-all">
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              </div>
            );
          })}

          {/* Card: Criar Nova Conta */}
          <div
            onClick={() => setIsCreateAccountOpen(true)}
            className="group rounded-2xl p-5 border-2 border-dashed border-gray-200 dark:border-gray-800 hover:border-primary-500 dark:hover:border-primary-500 bg-white/40 dark:bg-gray-900/40 hover:bg-primary-50/20 dark:hover:bg-primary-950/20 transition-all duration-200 flex flex-col items-center justify-center text-center cursor-pointer min-h-[175px]"
          >
            <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-800 group-hover:bg-primary-100 dark:group-hover:bg-primary-950/60 text-gray-500 dark:text-gray-400 group-hover:text-primary-600 dark:group-hover:text-primary-400 flex items-center justify-center mb-2.5 transition-colors">
              <Plus className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200 group-hover:text-primary-600 dark:group-hover:text-primary-400">
              Nova Carteira / Conta
            </h3>
            <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5 max-w-[180px]">
              Cadastre outra conta corrente, poupança ou cartão
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="max-w-5xl w-full mx-auto text-center text-xs text-gray-400 dark:text-gray-600 shrink-0 mt-4 sm:mt-6">
        Gringotts • Seus dados financeiros protegidos e criptografados localmente no seu computador.
      </div>

      {/* Modal de Desbloqueio */}
      <AccountUnlockModal
        isOpen={!!selectedForUnlock}
        onClose={() => setSelectedForUnlock(null)}
        account={selectedForUnlock}
        onUnlocked={handleUnlocked}
      />

      {/* Modal de Configuração de Senha */}
      <AccountSecurityModal
        isOpen={!!selectedForSecurity}
        onClose={() => {
          setSelectedForSecurity(null);
          reloadAccounts();
        }}
        account={selectedForSecurity}
      />

      {/* Modal de Exclusão de Conta com Validação de Senha/PIN */}
      <DeleteAccountModal
        isOpen={!!selectedForDelete}
        onClose={() => setSelectedForDelete(null)}
        account={selectedForDelete}
        onDeleted={reloadAccounts}
      />

      {/* Modal de Criação / Edição de Conta */}
      <AccountFormModal
        isOpen={isCreateAccountOpen || !!editingAccountId}
        accountId={editingAccountId}
        onClose={() => {
          setIsCreateAccountOpen(false);
          setEditingAccountId(null);
          reloadAccounts();
        }}
      />
    </div>
  );
};

export default AccountSelectScreen;
