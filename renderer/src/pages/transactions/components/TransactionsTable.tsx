import React, { useState } from 'react';
import { formatCurrency } from '../../../lib/utils';
import type { Transaction } from '../../../types';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

interface TransactionsTableProps {
  transactions: Transaction[];
  categories?: Array<{ id: string; name: string; color?: string }>;
  onDelete?: (id: string) => void;
}

export const TransactionsTable: React.FC<TransactionsTableProps> = ({ transactions, categories = [], onDelete }) => {
  const categoryMap = new Map(categories.map(c => [c.id, c]));
  const [sortConfig, setSortConfig] = useState<{ key: keyof Transaction; direction: 'asc' | 'desc' }>({
    key: 'date',
    direction: 'desc',
  });

  const sortedTransactions = [...transactions].sort((a, b) => {
    if (sortConfig.key === 'date') {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return sortConfig.direction === 'asc' ? dateA - dateB : dateB - dateA;
    }
    if (sortConfig.key === 'amountCents') {
      return sortConfig.direction === 'asc'
        ? a.amountCents - b.amountCents
        : b.amountCents - a.amountCents;
    }
    if (sortConfig.key === 'description') {
      const descA = a.description ?? '';
      const descB = b.description ?? '';
      return sortConfig.direction === 'asc'
        ? descA.localeCompare(descB)
        : descB.localeCompare(descA);
    }
    return 0;
  });

  const requestSort = (key: keyof Transaction) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (key: keyof Transaction) => {
    if (sortConfig.key !== key) return <ArrowUpDown className="w-3.5 h-3.5 ml-1 inline text-gray-400" />;
    return sortConfig.direction === 'asc' 
      ? <ArrowUp className="w-3.5 h-3.5 ml-1 inline text-primary-600" />
      : <ArrowDown className="w-3.5 h-3.5 ml-1 inline text-primary-600" />;
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-750 shadow-xs overflow-hidden">
      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        <thead className="bg-gray-50 dark:bg-gray-850">
          <tr>
            <th 
              onClick={() => requestSort('date')}
              className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 select-none"
            >
              Data {getSortIcon('date')}
            </th>
            <th 
              onClick={() => requestSort('description')}
              className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 select-none"
            >
              Descrição {getSortIcon('description')}
            </th>
            <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Categoria
            </th>
            <th 
              onClick={() => requestSort('amountCents')}
              className="px-6 py-3.5 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 select-none"
            >
              Valor {getSortIcon('amountCents')}
            </th>
            <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Tipo
            </th>
            <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Status
            </th>
            {onDelete && (
              <th className="px-6 py-3.5 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Ações
              </th>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-750 bg-white dark:bg-gray-800">
          {sortedTransactions.map((tx) => {
            const txDate = new Date(tx.date);
            const dateStr = isNaN(txDate.getTime()) ? '-' : txDate.toLocaleDateString('pt-BR');
            const isIncome = tx.type === 'INCOME';
            const cat = tx.categoryId ? categoryMap.get(tx.categoryId) : null;

            const tags = Array.isArray(tx.tags)
              ? tx.tags
              : typeof tx.tags === 'string'
              ? (() => {
                  try {
                    return JSON.parse(tx.tags);
                  } catch {
                    return [];
                  }
                })()
              : [];
            const isTransferIn = tags.includes('TRANSFER_IN') || tags.includes('Resgate') || (!!tx.description && tx.description.toLowerCase().startsWith('resgate'));
            const isTransfer = tx.type === 'TRANSFER';

            return (
              <tr key={tx.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-750/50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                  {dateStr}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                  {tx.description || 'Sem descrição'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {cat ? (
                    <span 
                      className="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-medium rounded-full"
                      style={{
                        backgroundColor: `${cat.color || '#6366f1'}20`,
                        color: cat.color || '#6366f1',
                      }}
                    >
                      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: cat.color || '#6366f1' }} />
                      {cat.name}
                    </span>
                  ) : (
                    <span className="text-xs text-gray-400">Sem categoria</span>
                  )}
                </td>
                <td className={`px-6 py-4 whitespace-nowrap text-right text-sm font-semibold ${
                  isIncome || (isTransfer && isTransferIn)
                    ? 'text-emerald-600 dark:text-emerald-400' 
                    : isTransfer
                    ? 'text-indigo-600 dark:text-indigo-400'
                    : 'text-rose-600 dark:text-rose-400'
                }`}>
                  {isIncome || (isTransfer && isTransferIn) ? '+' : '-'}{formatCurrency(Math.abs(tx.amountCents))}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2.5 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    isIncome 
                      ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300' 
                      : isTransfer
                      ? isTransferIn
                        ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300'
                        : 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300'
                      : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300'
                  }`}>
                    {isIncome ? 'Receita' : isTransfer ? (isTransferIn ? 'Resgate Meta' : 'Aporte Meta') : 'Despesa'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2.5 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    tx.status === 'PAID'
                      ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                      : tx.status === 'PENDING'
                      ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
                      : 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300'
                  }`}>
                    {tx.status === 'PAID' ? 'Pago' : tx.status === 'PENDING' ? 'Pendente' : 'Conciliado'}
                  </span>
                </td>
                {onDelete && (
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                    <button 
                      onClick={() => onDelete(tx.id)}
                      className="text-gray-400 hover:text-rose-600 transition-colors"
                      title="Excluir"
                    >
                      Excluir
                    </button>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default TransactionsTable;
