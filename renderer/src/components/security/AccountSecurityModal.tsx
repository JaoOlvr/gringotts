import React, { useState } from 'react';
import { api } from '../../lib/ipc';
import { useAccountStore } from '../../store/useAccountStore';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { 
  X, 
  Lock, 
  KeyRound, 
  ShieldCheck, 
  ShieldAlert, 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  Trash2,
  Binary
} from 'lucide-react';
import type { Account, LockType } from '../../types';

interface AccountSecurityModalProps {
  isOpen: boolean;
  onClose: () => void;
  account: Account | null;
  onSuccess?: () => void;
}

export const AccountSecurityModal: React.FC<AccountSecurityModalProps> = ({
  isOpen,
  onClose,
  account,
  onSuccess,
}) => {
  const [selectedType, setSelectedType] = useState<LockType>('PIN');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [currentSecret, setCurrentSecret] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen || !account) return null;

  const isAlreadyLocked = !!account.isLocked;

  const handleSetLock = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    const secretToSave = selectedType === 'PIN' ? pin : password;
    const confirmToMatch = selectedType === 'PIN' ? confirmPin : confirmPassword;

    if (selectedType === 'PIN') {
      if (!/^\d{4,6}$/.test(pin)) {
        setError('O PIN deve conter entre 4 e 6 dígitos numéricos');
        return;
      }
    } else {
      if (password.length < 4) {
        setError('A senha deve conter no mínimo 4 caracteres');
        return;
      }
    }

    if (secretToSave !== confirmToMatch) {
      setError(selectedType === 'PIN' ? 'Os PINs digitados não coincidem' : 'As senhas digitadas não coincidem');
      return;
    }

    setIsLoading(true);
    try {
      const ok = await api.accounts.setLock(account.id, selectedType, secretToSave);
      if (ok) {
        const refreshed = await api.accounts.getAll();
        useAccountStore.getState().setAccounts(refreshed);
        setSuccessMessage(`Bloqueio por ${selectedType === 'PIN' ? 'PIN' : 'Senha'} ativado com sucesso!`);
        setTimeout(() => {
          onSuccess?.();
          onClose();
        }, 1200);
      } else {
        setError('Não foi possível ativar o bloqueio na conta.');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao configurar senha');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveLock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentSecret) {
      setError('Informe a senha ou PIN atual para remover a proteção');
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const ok = await api.accounts.removeLock(account.id, currentSecret);
      if (ok) {
        const refreshed = await api.accounts.getAll();
        useAccountStore.getState().setAccounts(refreshed);
        setSuccessMessage('Proteção por senha removida com sucesso!');
        setTimeout(() => {
          onSuccess?.();
          onClose();
        }, 1200);
      } else {
        setError('Senha ou PIN atual incorreto.');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao remover proteção');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="relative bg-white dark:bg-gray-850 p-6 w-full max-w-md rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-750">
        {/* Header */}
        <div className="flex justify-between items-center mb-5">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-amber-100 dark:bg-amber-950/60 rounded-xl text-amber-600 dark:text-amber-400">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                Trancar Conta / Carteira
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Conta: <span className="font-semibold text-gray-700 dark:text-gray-300">{account.name}</span>
              </p>
            </div>
          </div>
          <button
            className="rounded-lg p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-750 dark:hover:text-gray-200 transition-colors"
            onClick={onClose}
            aria-label="Fechar"
            type="button"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Atual */}
        <div className="mb-4 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-750 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isAlreadyLocked ? (
              <ShieldAlert className="w-4 h-4 text-amber-500" />
            ) : (
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
            )}
            <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
              Status: {isAlreadyLocked ? `Protegida por ${account.lockType === 'PIN' ? 'PIN Numérico' : 'Senha Padrão'}` : 'Sem senha (Livre)'}
            </span>
          </div>

          {isAlreadyLocked && (
            <button
              type="button"
              onClick={() => {
                setIsRemoving(!isRemoving);
                setError(null);
                setSuccessMessage(null);
              }}
              className="text-xs font-semibold text-rose-600 dark:text-rose-400 hover:underline inline-flex items-center gap-1"
            >
              {isRemoving ? 'Cancelar remoção' : 'Remover senha'}
            </button>
          )}
        </div>

        {/* Formulário de Remoção de Senha */}
        {isAlreadyLocked && isRemoving ? (
          <form onSubmit={handleRemoveLock} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Digite o {account.lockType === 'PIN' ? 'PIN' : 'Senha'} atual para destrancar:
              </label>
              <Input
                type="password"
                value={currentSecret}
                onChange={(e) => setCurrentSecret(e.target.value)}
                placeholder={account.lockType === 'PIN' ? 'Ex: 1234' : 'Digite sua senha atual'}
                autoFocus
              />
            </div>

            {error && (
              <div className="p-3 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-lg text-rose-600 dark:text-rose-400 text-xs">
                {error}
              </div>
            )}
            {successMessage && (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                {successMessage}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setIsRemoving(false)}>
                Voltar
              </Button>
              <Button type="submit" disabled={isLoading} className="bg-rose-600 hover:bg-rose-700 text-white">
                {isLoading ? 'Removendo...' : 'Confirmar Remoção'}
              </Button>
            </div>
          </form>
        ) : (
          /* Formulário de Configuração / Alteração de Senha */
          <form onSubmit={handleSetLock} className="space-y-4">
            {/* Escolha do Tipo de Senha (PIN vs Senha Padrão) */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
                Escolha o Tipo de Bloqueio:
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedType('PIN');
                    setError(null);
                  }}
                  className={`p-3 rounded-xl border text-left transition-all flex flex-col gap-1 ${
                    selectedType === 'PIN'
                      ? 'border-amber-500 bg-amber-50/60 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200 ring-2 ring-amber-500/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold text-sm">
                    <Binary className="w-4 h-4 text-amber-500" />
                    <span>PIN Numérico</span>
                  </div>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400">
                    Apenas números (4 a 6 dígitos). Ideal para acesso rápido.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedType('PASSWORD');
                    setError(null);
                  }}
                  className={`p-3 rounded-xl border text-left transition-all flex flex-col gap-1 ${
                    selectedType === 'PASSWORD'
                      ? 'border-amber-500 bg-amber-50/60 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200 ring-2 ring-amber-500/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold text-sm">
                    <KeyRound className="w-4 h-4 text-amber-500" />
                    <span>Senha Padrão</span>
                  </div>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400">
                    Letras, números e símbolos. Máxima segurança.
                  </p>
                </button>
              </div>
            </div>

            {/* Campos para PIN */}
            {selectedType === 'PIN' ? (
              <div className="space-y-3 pt-1">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Definir PIN (4 a 6 números)
                  </label>
                  <Input
                    type="password"
                    inputMode="numeric"
                    maxLength={6}
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                    placeholder="••••"
                    className="font-mono text-center tracking-widest text-lg"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Confirmar PIN
                  </label>
                  <Input
                    type="password"
                    inputMode="numeric"
                    maxLength={6}
                    value={confirmPin}
                    onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                    placeholder="••••"
                    className="font-mono text-center tracking-widest text-lg"
                  />
                </div>
              </div>
            ) : (
              /* Campos para Senha Padrão */
              <div className="space-y-3 pt-1">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Definir Senha
                  </label>
                  <div className="relative">
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Digite uma senha segura"
                      className="pr-10"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Confirmar Senha
                  </label>
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Digite a senha novamente"
                  />
                </div>
              </div>
            )}

            {error && (
              <div className="p-3 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-lg text-rose-600 dark:text-rose-400 text-xs">
                {error}
              </div>
            )}
            {successMessage && (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                {successMessage}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-3">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isLoading}
                className="bg-amber-600 hover:bg-amber-700 text-white"
              >
                {isLoading ? 'Salvando...' : isAlreadyLocked ? 'Alterar Bloqueio' : 'Ativar Bloqueio'}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
