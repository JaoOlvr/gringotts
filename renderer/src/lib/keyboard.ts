import { useEffect } from 'react';
import { useTransactionStore } from '../store/useTransactionStore';
import { useCalculatorStore } from '../store/useCalculatorStore';

/**
 * Hook para configurar atalhos de teclado globais
 * Chame este hook no componente raiz da aplicação
 */
export const useGlobalKeyboardShortcuts = () => {
  const { setQuickAddOpen } = useTransactionStore();
  const toggleCalculator = useCalculatorStore((state) => state.toggleCalculator);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+N (ou Cmd+N no Mac) para novo lançamento rápido
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'n' && !e.shiftKey && !e.altKey) {
        e.preventDefault();
        setQuickAddOpen(true);
        return;
      }

      // Alt+C para abrir/fechar a Calculadora Financeira
      if (e.altKey && e.key.toLowerCase() === 'c') {
        e.preventDefault();
        toggleCalculator();
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [setQuickAddOpen, toggleCalculator]);
};