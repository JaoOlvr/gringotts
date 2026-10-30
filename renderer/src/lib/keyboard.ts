import { useEffect } from 'react';
import { useTransactionStore } from '../store/useTransactionStore';

/**
 * Hook para configurar atalhos de teclado globais
 * Chame este hook no componente raiz da aplicação
 */
export const useGlobalKeyboardShortcuts = () => {
  const { setQuickAddOpen } = useTransactionStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+N (ou Cmd+N no Mac) para novo lançamento rápido
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'n' && !e.shiftKey && !e.altKey) {
        e.preventDefault(); // Prevenir comportamento padrão do navegador
        setQuickAddOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [setQuickAddOpen]);
};