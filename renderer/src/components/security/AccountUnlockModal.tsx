import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../../lib/ipc';
import { useAccountStore } from '../../store/useAccountStore';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { 
  Lock, 
  KeyRound, 
  Delete, 
  X, 
  ArrowLeft, 
  Eye, 
  EyeOff, 
  ShieldCheck, 
  Sparkles 
} from 'lucide-react';
import type { Account } from '../../types';

interface AccountUnlockModalProps {
  isOpen: boolean;
  onClose: () => void;
  account: Account | null;
  onUnlocked: (accountId: string) => void;
}

export const AccountUnlockModal: React.FC<AccountUnlockModalProps> = ({
  isOpen,
  onClose,
  account,
  onUnlocked,
}) => {
  const [pin, setPin] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [shake, setShake] = useState(false);

  const unlockAccount = useAccountStore((state) => state.unlockAccount);

  const isPin = account?.lockType === 'PIN';

  useEffect(() => {
    if (isOpen) {
      setPin('');
      setPassword('');
      setError(null);
      setIsVerifying(false);
      setIsSuccess(false);
      setShake(false);
    }
  }, [isOpen, account]);

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  const handleVerify = useCallback(async (secretToVerify: string) => {
    if (!account || !secretToVerify) return;
    setIsVerifying(true);
    setError(null);

    try {
      const isValid = await api.accounts.verifyLock(account.id, secretToVerify);
      if (isValid) {
        setIsSuccess(true);
        unlockAccount(account.id);
        setTimeout(() => {
          onUnlocked(account.id);
        }, 500);
      } else {
        triggerShake();
        setError(isPin ? 'PIN incorreto. Tente novamente.' : 'Senha incorreta. Tente novamente.');
        if (isPin) {
          setPin('');
        }
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao validar senha');
      triggerShake();
    } finally {
      setIsVerifying(false);
    }
  }, [account, isPin, onUnlocked, unlockAccount]);

  // Listener para teclado físico no modo PIN
  useEffect(() => {
    if (!isOpen || !isPin || isVerifying || isSuccess) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (/^[0-9]$/.test(e.key)) {
        e.preventDefault();
        setPin((prev) => {
          if (prev.length >= 6) return prev;
          const next = prev + e.key;
          if (next.length >= 4) {
            // Auto submete se atingir o tamanho
          }
          return next;
        });
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        setPin((prev) => prev.slice(0, -1));
        setError(null);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (pin.length >= 4) {
          handleVerify(pin);
        }
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isPin, pin, isVerifying, isSuccess, handleVerify, onClose]);

  const handleNumpadClick = (digit: string) => {
    if (pin.length >= 6 || isVerifying || isSuccess) return;
    const newPin = pin + digit;
    setPin(newPin);
    setError(null);
  };

  const handleDeleteDigit = () => {
    setPin((prev) => prev.slice(0, -1));
    setError(null);
  };

  const handleClearPin = () => {
    setPin('');
    setError(null);
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      setError('Digite a senha da conta');
      return;
    }
    handleVerify(password);
  };

  if (!isOpen || !account) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div 
        className={`relative bg-white dark:bg-gray-850 p-7 w-full max-w-sm rounded-3xl shadow-2xl border border-gray-150 dark:border-gray-750 transition-transform ${
          shake ? 'animate-shake' : ''
        }`}
      >
        {/* Botão Fechar / Voltar */}
        <button
          onClick={onClose}
          className="absolute left-4 top-4 p-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-750 dark:hover:text-gray-200 transition-colors"
          title="Voltar"
          type="button"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        {/* Header do Desbloqueio */}
        <div className="text-center pt-2 mb-6">
          <div 
            className="w-14 h-14 mx-auto mb-3 rounded-2xl flex items-center justify-center text-white shadow-lg transition-transform duration-300"
            style={{ 
              backgroundColor: account.color || '#f59e0b',
              transform: isSuccess ? 'scale(1.1)' : 'scale(1)',
            }}
          >
            {isSuccess ? (
              <ShieldCheck className="w-7 h-7 animate-bounce text-emerald-200" />
            ) : (
              <Lock className="w-7 h-7" />
            )}
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
            {account.name}
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {isPin ? 'Digite seu PIN de segurança' : 'Digite a senha da sua carteira'}
          </p>
        </div>

        {/* Modo PIN com Teclado Numérico */}
        {isPin ? (
          <div className="space-y-6">
            {/* Dots do PIN */}
            <div className="flex items-center justify-center gap-3 py-2">
              {[0, 1, 2, 3, 4, 5].map((index) => {
                const isFilled = index < pin.length;
                return (
                  <div
                    key={index}
                    className={`w-3.5 h-3.5 rounded-full transition-all duration-200 ${
                      isFilled
                        ? isSuccess
                          ? 'bg-emerald-500 scale-125'
                          : 'bg-amber-500 scale-125 shadow-sm shadow-amber-500/50'
                        : 'bg-gray-200 dark:bg-gray-700'
                    }`}
                  />
                );
              })}
            </div>

            {error && (
              <p className="text-xs font-semibold text-rose-500 text-center animate-shake">
                {error}
              </p>
            )}

            {/* Teclado Numérico Virtual */}
            <div className="grid grid-cols-3 gap-2.5 max-w-[240px] mx-auto select-none">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                <button
                  key={digit}
                  type="button"
                  onClick={() => handleNumpadClick(digit)}
                  disabled={isVerifying || isSuccess}
                  className="h-12 rounded-2xl bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-750 text-gray-900 dark:text-gray-100 font-bold text-lg border border-gray-100 dark:border-gray-700 active:scale-95 transition-all shadow-2xs"
                >
                  {digit}
                </button>
              ))}

              <button
                type="button"
                onClick={handleClearPin}
                disabled={pin.length === 0 || isVerifying || isSuccess}
                className="h-12 rounded-2xl bg-transparent hover:bg-gray-100 dark:hover:bg-gray-750 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xs font-semibold uppercase tracking-wider transition-all"
              >
                Limpar
              </button>

              <button
                type="button"
                onClick={() => handleNumpadClick('0')}
                disabled={isVerifying || isSuccess}
                className="h-12 rounded-2xl bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-750 text-gray-900 dark:text-gray-100 font-bold text-lg border border-gray-100 dark:border-gray-700 active:scale-95 transition-all shadow-2xs"
              >
                0
              </button>

              <button
                type="button"
                onClick={handleDeleteDigit}
                disabled={pin.length === 0 || isVerifying || isSuccess}
                className="h-12 rounded-2xl bg-transparent hover:bg-gray-100 dark:hover:bg-gray-750 text-gray-500 dark:text-gray-300 flex items-center justify-center transition-all"
                title="Apagar"
              >
                <Delete className="w-5 h-5" />
              </button>
            </div>

            <Button
              type="button"
              onClick={() => handleVerify(pin)}
              disabled={pin.length < 4 || isVerifying || isSuccess}
              className="w-full bg-amber-600 hover:bg-amber-700 text-white rounded-xl py-2.5 font-semibold transition-all shadow-md shadow-amber-600/20"
            >
              {isVerifying ? 'Verificando...' : isSuccess ? 'Desbloqueado!' : 'Desbloquear'}
            </Button>
          </div>
        ) : (
          /* Modo Senha Padrão */
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Digite sua senha"
                  className="pr-10 text-center text-base"
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

            {error && (
              <p className="text-xs font-semibold text-rose-500 text-center animate-shake">
                {error}
              </p>
            )}

            <Button
              type="submit"
              disabled={isVerifying || !password}
              className="w-full bg-amber-600 hover:bg-amber-700 text-white rounded-xl py-2.5 font-semibold transition-all shadow-md shadow-amber-600/20"
            >
              {isVerifying ? 'Verificando...' : isSuccess ? 'Desbloqueado!' : 'Entrar na Conta'}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
};
