import { formatCurrency } from '../../../lib/utils';

interface CardGridProps {
  totalBalance: number;
  incomeThisMonth: number;
  expensesThisMonth: number;
  netThisMonth: number;
  savingsRate: number;
}

export const CardGrid: React.FC<CardGridProps> = ({ 
  totalBalance, 
  incomeThisMonth, 
  expensesThisMonth, 
  netThisMonth, 
  savingsRate 
}) => {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {/* Total Balance Card */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Saldo Total
            </p>
            <p className="text-2xl font-bold mt-1">
              {formatCurrency(totalBalance)}
            </p>
          </div>
          <div className="flex items-center space-x-2">
            {/* Icon would go here */}
            <div className="h-8 w-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
              {/* Dollar sign or account icon */}
              <span className="text-gray-500 dark:text-gray-400">$</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Income This Month Card */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Receitas do Mês
            </p>
            <p className="text-2xl font-bold text-success-600 dark:text-success-400 mt-1">
              {formatCurrency(incomeThisMonth)}
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <div className="h-8 w-8 rounded-full bg-success-100 dark:bg-success-900 flex items-center justify-center">
              <span className="text-success-600 dark:text-success-400">+</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Expenses This Month Card */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Despesas do Mês
            </p>
            <p className="text-2xl font-bold text-danger-600 dark:text-danger-400 mt-1">
              {formatCurrency(expensesThisMonth)}
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <div className="h-8 w-8 rounded-full bg-danger-100 dark:bg-danger-900 flex items-center justify-center">
              <span className="text-danger-600 dark:text-danger-400">-</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Net This Month / Savings Rate Card */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Resultado do Mês
            </p>
            <p className="text-2xl font-bold mt-1">
              {formatCurrency(netThisMonth)}
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <div className="h-8 w-8 rounded-full 
              {netThisMonth >= 0 ? 'bg-success-100 dark:bg-success-900' : 'bg-danger-100 dark:bg-danger-900'} 
              flex items-center justify-center">
              <span className={`
                ${netThisMonth >= 0 ? 'text-success-600 dark:text-success-400' : 'text-danger-600 dark:text-danger-400'}
              `}>
                {netThisMonth >= 0 ? '+' : '-'}
              </span>
            </div>
          </div>
        </div>
        <div className="mt-4">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
            Taxa de Poupança
          </p>
          <p className="text-lg font-bold mt-1">
            {savingsRate >= 0 ? '+' : ''}{savingsRate.toFixed(1)}%
          </p>
        </div>
      </div>
    </div>
  );
};
