import React, { useState, useEffect } from 'react';
import { api } from '../../lib/ipc';
import { useAccountStore } from '../../store/useAccountStore';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { 
  X, 
  Trash2, 
  Lock, 
  ShieldAlert, 
  Eye, 
  EyeOff, 
  AlertTriangle 
} from 'lucide-react';
import type { Account } from '../../types';

interface DeleteAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  account: Account | null;
  onDeleted: () => void;
}

export const DeleteAccountModal: React.FC<DeleteAccountModalProps> = ({
  isOpen,
  onClose,
  account,
  onDeleted,
}) => {
  const [secret, setSecret] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [shake, setShake] = useState(false);

  const selectedAccountId = useAccountStore((s) => s.selectedAccountId);
  const lockSession = useAccountStore((s) => s.lockSession);

  useEffect(() => {
    if (isOpen) {
      setSecret('');
      setError(null);
      setShowPassword(false);
      setIsLoading(false);
      setShake(false);
    }
  }, [isOpen, account]);

  if (!isOpen || !account) return null;

  const isLocked = !!account.isLocked;
  const isPin = account.lockType === 'PIN';

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  const handleDelete = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (isLocked && !secret.trim()) {
      setError(isPin ? 'Digite o PIN numérico da conta para confirmar a exclusão.' : 'Digite a senha da conta para confirmar a exclusão.');
      triggerShake();
      return;
    }

    setIsLoading(true);
    try {
      await api.accounts.delete(account.id, isLocked ? secret : undefined);
      
      // Se a conta excluída for a conta atualmente ativa na sessão, encerra a sessão
      if (selectedAccountId === account.id) {
        lockSession();
      }

      onDeleted();
      onClose();
    } catch (err: unknown) {
      triggerShake();
      const msg = err instanceof Error ? err.message : 'Falha ao excluir a conta.';
      setError(msg.includes('Senha ou PIN incorreto') ? `${isPin ? 'PIN' : 'Senha'} incorreto(a). A conta não foi excluída.` : msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className={`bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl transition-all ${
          shake ? 'animate-shake' : ''
        }`}
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              {isLocked ? <ShieldAlert className="w-5 h-5" /> : <Trash2 className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">
                {isLocked ? 'Confirmação de Segurança' : 'Excluir Conta'}
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {account.name}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="p-1 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleDelete} className="p-6 space-y-4">
          {isLocked ? (
            <div className="space-y-4">
              <div className="p-3.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-2xl flex items-start gap-3">
                <Lock className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div className="text-xs text-amber-800 dark:text-amber-300 space-y-1">
                  <p className="font-semibold">Esta conta está trancada por chave de proteção.</p>
                  <p className="text-amber-700 dark:text-amber-400/90 leading-relaxed">
                    Para autorizar a exclusão definitiva e apagar todos os dados associados, informe o{' '}
                    <strong>{isPin ? 'PIN numérico' : 'sua senha padrão'}</strong> da conta.
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-300 mb-1.5">
                  {isPin ? 'Digite o PIN da Conta' : 'Digite a Senha da Conta'}
                </label>
                <div className="relative">
                  <Input
                    type={isPin ? 'password' : (showPassword ? 'text' : 'password')}
                    value={secret}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSecret(isPin ? val.replace(/\D/g, '').slice(0, 6) : val);
                      if (error) setError(null);
                    }}
                    placeholder={isPin ? '• • • •' : 'Digite sua senha'}
                    className={isPin ? 'font-mono tracking-widest text-base' : ''}
                    autoFocus
                    required
                  />
                  {!isPin && (
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-3.5 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/50 rounded-2xl flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
              <div className="text-xs text-rose-800 dark:text-rose-300 space-y-1">
                <p className="font-semibold">Atenção: Ação irreversível!</p>
                <p className="text-rose-700 dark:text-rose-400/90 leading-relaxed">
                  Tem certeza de que deseja excluir a conta <strong>"{account.name}"</strong>? Todos os lançamentos e dados vinculados a ela serão permanentemente apagados.
                </p>
              </div>
            </div>
          )}

          {error && (
            <div className="p-3 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-xl text-rose-600 dark:text-rose-400 text-xs font-medium flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="destructive"
              disabled={isLoading || (isLocked && !secret)}
              className="gap-2 bg-rose-600 hover:bg-rose-700 text-white font-semibold"
            >
              <Trash2 className="w-4 h-4" />
              {isLoading ? 'Excluindo...' : 'Excluir Conta'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DeleteAccountModal;
