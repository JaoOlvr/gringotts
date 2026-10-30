import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/ipc';
import { formatCurrency } from '../../lib/utils';
import { useAccountStore } from '../../store/useAccountStore';
import { Button } from '../../components/ui/button';
import { AccountFormModal } from './components/AccountFormModal';
import { AccountSecurityModal } from '../../components/security/AccountSecurityModal';
import { DeleteAccountModal } from '../../components/security/DeleteAccountModal';
import { Landmark, Plus, Trash2, KeyRound, Lock, ShieldCheck, Pencil } from 'lucide-react';
import type { Account } from '../../types';

export const AccountsPage: React.FC = () => {
  const { accounts, setAccounts, setLoading, setError } = useAccountStore();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [securityAccount, setSecurityAccount] = useState<Account | null>(null);
  const [deletingAccount, setDeletingAccount] = useState<Account | null>(null);
  
  const {
    data: fetchedAccounts,
    isLoading,
    error: queryError,
    refetch,
  } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => api.accounts.getAll(),
  });

  useEffect(() => {
    if (isLoading) {
      setLoading(true);
      setError(null);
    }
    
    if (fetchedAccounts !== undefined) {
      setAccounts(fetchedAccounts);
      setLoading(false);
      setError(null);
    }
    
    if (queryError) {
      setLoading(false);
      setError(queryError instanceof Error ? queryError.message : String(queryError));
    }
  }, [fetchedAccounts, queryError, isLoading, setAccounts, setLoading, setError]);

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`Tem certeza de que deseja excluir a conta "${name}"?`)) {
      await api.accounts.delete(id);
      refetch();
    }
  };

  const handleEdit = (id: string) => {
    setEditingId(id);
    setModalOpen(true);
  };

  const displayAccounts = fetchedAccounts ?? accounts;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
            Contas Bancárias e Carteiras
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Gerencie suas contas, saldos e senhas de proteção
          </p>
        </div>
        <Button onClick={() => { setEditingId(null); setModalOpen(true); }} className="gap-2">
          <Plus className="w-4 h-4" />
          Nova Conta
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
      
      {!isLoading && displayAccounts.length === 0 && (
        <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-2xl border border-dashed border-gray-300 dark:border-gray-700 p-8">
          <Landmark className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">Nenhuma conta cadastrada</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 mb-4">
            Cadastre sua conta corrente, poupança ou cartão de crédito para começar.
          </p>
          <Button onClick={() => { setEditingId(null); setModalOpen(true); }}>
            Cadastrar Primeira Conta
          </Button>
        </div>
      )}
      
      {!isLoading && displayAccounts.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {displayAccounts.map((account) => {
            const isLocked = !!account.isLocked;

            return (
              <div 
                key={account.id} 
                className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-750 shadow-xs hover:shadow-md transition-shadow relative group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div 
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold shadow-xs"
                        style={{ backgroundColor: account.color || '#3b82f6' }}
                      >
                        <Landmark className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-gray-100">{account.name}</h3>
                        <span className="text-xs text-gray-400 uppercase font-medium">{account.type}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-1">
                      {/* Botão de Segurança / Senha */}
                      <button
                        onClick={() => setSecurityAccount(account)}
                        className={`p-1.5 rounded-lg transition-colors ${
                          isLocked 
                            ? 'text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40' 
                            : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-750'
                        }`}
                        title={isLocked ? 'Gerenciar senha da conta' : 'Adicionar senha a esta conta'}
                      >
                        <KeyRound className="w-4 h-4" />
                      </button>

                      {/* Botão Editar */}
                      <button
                        onClick={() => handleEdit(account.id)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-750 transition-colors"
                        title="Editar conta"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>

                      {/* Botão Excluir */}
                      <button 
                        onClick={() => setDeletingAccount(account)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                        title="Excluir conta"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Status de Bloqueio */}
                  <div className="mt-3">
                    {isLocked ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/40">
                        <Lock className="w-3 h-3" />
                        {account.lockType === 'PIN' ? 'Protegida por PIN' : 'Protegida por Senha'}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/40">
                        <ShieldCheck className="w-3 h-3" />
                        Acesso Livre (Sem senha)
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-750">
                  <div className="text-xs text-gray-400 dark:text-gray-500">Saldo Atual</div>
                  <div className={`text-2xl font-bold mt-0.5 ${
                    account.balanceCents >= 0 
                      ? 'text-emerald-600 dark:text-emerald-400' 
                      : 'text-rose-600 dark:text-rose-400'
                  }`}>
                    {formatCurrency(account.balanceCents, account.currency)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de Formulário de Conta */}
      <AccountFormModal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); refetch(); }}
        accountId={editingId}
      />

      {/* Modal de Configuração de Senha */}
      <AccountSecurityModal
        isOpen={!!securityAccount}
        onClose={() => setSecurityAccount(null)}
        account={securityAccount}
        onSuccess={() => refetch()}
      />

      {/* Modal de Exclusão de Conta com Confirmação e Validação de Senha */}
      <DeleteAccountModal
        isOpen={!!deletingAccount}
        onClose={() => setDeletingAccount(null)}
        account={deletingAccount}
        onDeleted={() => {
          refetch();
        }}
      />
    </div>
  );
};

export default AccountsPage;
