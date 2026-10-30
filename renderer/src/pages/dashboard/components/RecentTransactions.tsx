import { formatCurrency } from '../../../lib/utils';

interface Transaction {
  id: string;
  amountCents: number;
  date: Date;
  description?: string;
  accountId: string;
  categoryId?: string;
  type: 'INCOME' | 'EXPENSE' | 'TRANSFER';
  status: 'PENDING' | 'PAID' | 'RECONCILED';
  tags: string[];
  attachmentPath?: string;
  recurrenceId?: string;
  createdAt: Date;
}

interface Account {
  id: string;
  name: string;
  type: string;
  balanceCents: number;
  currency: string;
  color?: string;
  icon?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface Category {
  id: string;
  name: string;
  group?: string;
  icon?: string;
  color?: string;
  type: 'INCOME' | 'EXPENSE';
  parentId?: string;
  createdAt: Date;
}

interface RecentTransactionsProps {
  transactions: Transaction[];
  accounts: Account[];
  categories: Category[];
}

export const RecentTransactions: React.FC<RecentTransactionsProps> = ({ 
  transactions, 
  accounts, 
  categories 
}) => {
  // Create lookup maps for account and category names
  const accountMap = new Map(accounts.map(acc => [acc.id, acc.name]));
  const categoryMap = new Map(categories.map(cat => [cat.id, cat.name]));

  // Sort transactions by date descending (most recent first) and take top 5
  const sortedTransactions = [...transactions]
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .slice(0, 5);

  if (sortedTransactions.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
        <h2 className="mb-4 text-xl font-bold text-gray-900 dark:text-gray-100">
          Lançamentos Recentes
        </h2>
        <p className="text-gray-500 dark:text-gray-400 text-center py-4">
          Nenhum lançamento encontrado
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
      <h2 className="mb-4 text-xl font-bold text-gray-900 dark:text-gray-100">
        Lançamentos Recentes
      </h2>
      <div className="space-y-3">
        {sortedTransactions.map(transaction => {
          const accountName = accountMap.get(transaction.accountId) || 'Conta desconhecida';
          const categoryName = transaction.categoryId 
            ? categoryMap.get(transaction.categoryId) || 'Categoria desconhecida' 
            : '-';
          
          const tags = Array.isArray(transaction.tags)
            ? transaction.tags
            : typeof transaction.tags === 'string'
            ? (() => {
                try {
                  return JSON.parse(transaction.tags);
                } catch {
                  return [];
                }
              })()
            : [];
          const isTransferIn = tags.includes('TRANSFER_IN') || tags.includes('Resgate') || (!!transaction.description && transaction.description.toLowerCase().startsWith('resgate'));

          // Determine type color and icon
          const typeConfig = transaction.type === 'INCOME' 
            ? { color: 'text-success-600 dark:text-success-400', icon: '+', bg: 'bg-success-100 dark:bg-success-900' }
            : transaction.type === 'EXPENSE'
              ? { color: 'text-danger-600 dark:text-danger-400', icon: '-', bg: 'bg-danger-100 dark:bg-danger-900' }
              : isTransferIn
                ? { color: 'text-blue-600 dark:text-blue-400', icon: '↙', bg: 'bg-blue-100 dark:bg-blue-950/60' }
                : { color: 'text-indigo-600 dark:text-indigo-400', icon: '↗', bg: 'bg-indigo-100 dark:bg-indigo-950/60' };
          
          return (
            <div key={transaction.id} className="flex items-start space-x-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-md">
              <div className="flex-shrink-0">
                <div className={`h-8 w-8 flex items-center justify-center rounded-md ${typeConfig.bg}`}>
                  <span className={typeConfig.color}>{typeConfig.icon}</span>
                </div>
              </div>
              <div className="flex-1 space-y-1">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 line-clamp-1">
                  {transaction.description || 'Sem descrição'}
                </p>
                <div className="flex text-xs text-gray-500 dark:text-gray-400 space-x-3">
                  <span>{accountName}</span>
                  <span>{categoryName}</span>
                  <span className={`
                    ${transaction.type === 'INCOME' || (transaction.type === 'TRANSFER' && isTransferIn) ? 'text-emerald-600 dark:text-emerald-400' : transaction.type === 'EXPENSE' ? 'text-rose-600 dark:text-rose-400' : 'text-indigo-600 dark:text-indigo-400'}
                    font-medium
                  `}>
                    {transaction.type === 'INCOME' || (transaction.type === 'TRANSFER' && isTransferIn) ? '+' : '-'}{formatCurrency(Math.abs(transaction.amountCents))}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
