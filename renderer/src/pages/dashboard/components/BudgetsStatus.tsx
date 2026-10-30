import React, { useState } from 'react';
import { formatCurrency } from '../../../lib/utils';
import { api } from '../../../lib/ipc';
import { useQueryClient } from '@tanstack/react-query';
import { BudgetFormModal } from './BudgetFormModal';
import { Plus, Pencil, Trash2, AlertTriangle, CheckCircle2, TrendingUp, Sparkles } from 'lucide-react';
import type { Budget, Category, Transaction } from '../../../types';

interface BudgetsStatusProps {
  budgets: Budget[];
  transactions: Transaction[];
  categories: Category[];
  currentMonth: number;
  currentYear: number;
}

export const BudgetsStatus: React.FC<BudgetsStatusProps> = ({ 
  budgets, 
  transactions, 
  categories, 
  currentMonth, 
  currentYear 
}) => {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Filtra orçamentos para o mês e ano atuais garantindo conversão numérica segura
  const currentBudgets = budgets.filter(
    b => Number(b.month) === Number(currentMonth) && Number(b.year) === Number(currentYear)
  );

  // Calcula despesas por categoria no mês atual com segurança de datas
  const expensesByCategory: Record<string, number> = {};
  
  transactions
    .filter(t => {
      if (t.type !== 'EXPENSE') return false;
      const txDate = new Date(t.date);
      return txDate.getMonth() + 1 === currentMonth && txDate.getFullYear() === currentYear;
    })
    .forEach(t => {
      const catId = t.categoryId ?? 'uncategorized';
      expensesByCategory[catId] = (expensesByCategory[catId] || 0) + Math.abs(t.amountCents);
    });

  const handleEdit = (budget: Budget) => {
    setEditingBudget(budget);
    setIsModalOpen(true);
  };

  const handleCreate = () => {
    setEditingBudget(null);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Deseja realmente remover este orçamento?')) {
      setDeletingId(id);
      try {
        await api.budgets.delete(id);
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['budgets'] }),
          queryClient.refetchQueries({ queryKey: ['budgets'] }),
        ]);
      } catch (err) {
        console.error('Erro ao excluir orçamento:', err);
      } finally {
        setDeletingId(null);
      }
    }
  };

  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];
  const currentMonthName = monthNames[currentMonth - 1];

  return (
    <>
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700/60 p-6 flex flex-col justify-between">
        <div>
          {/* Header do Card */}
          <div className="flex items-center justify-between mb-5">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                  Orçamentos do Mês
                </h2>
                <span className="text-xs px-2 py-0.5 rounded-full bg-primary-50 dark:bg-primary-950/70 text-primary-700 dark:text-primary-300 font-medium">
                  {currentMonthName}/{currentYear}
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Acompanhe o teto de gastos por categoria
              </p>
            </div>
            
            <button
              onClick={handleCreate}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-primary-600 hover:bg-primary-700 text-white shadow-xs transition-colors"
              title="Definir novo orçamento"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Novo Orçamento</span>
            </button>
          </div>

          {/* Lista de Orçamentos ou Estado Vazio */}
          {currentBudgets.length === 0 ? (
            <div className="text-center py-8 px-4 rounded-xl border border-dashed border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/40">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-primary-100 dark:bg-primary-950/60 flex items-center justify-center text-primary-600 dark:text-primary-400 mb-3">
                <Sparkles className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">
                Nenhum orçamento para {currentMonthName}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm mx-auto mb-4">
                Defina tetos de gastos para suas despesas e evite surpresas no fim do mês.
              </p>
              <button
                onClick={handleCreate}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg bg-primary-50 text-primary-700 dark:bg-primary-950/50 dark:text-primary-300 hover:bg-primary-100 dark:hover:bg-primary-900/50 transition-colors border border-primary-200 dark:border-primary-800/40"
              >
                <Plus className="w-3.5 h-3.5" />
                Definir Primeiro Orçamento
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {currentBudgets.map(budget => {
                const category = categories.find(cat => cat.id === budget.categoryId);
                const categoryName = category?.name || 'Categoria Desconhecida';
                const categoryColor = category?.color || '#3b82f6';
                
                const budgetedAmount = budget.amountCents;
                const spentAmount = expensesByCategory[budget.categoryId] || 0;
                const percentage = budgetedAmount > 0 ? (spentAmount / budgetedAmount) * 100 : 0;
                const isOver = percentage > 100;
                const isWarning = percentage >= 80 && percentage <= 100;
                const remaining = budgetedAmount - spentAmount;
                
                return (
                  <div 
                    key={budget.id} 
                    className="p-3.5 rounded-xl border border-gray-100 dark:border-gray-700/60 bg-gray-50/40 dark:bg-gray-800/30 hover:border-gray-200 dark:hover:border-gray-600 transition-all space-y-2.5"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex items-center space-x-3">
                        <div 
                          className="h-8 w-8 flex items-center justify-center rounded-lg font-bold text-xs"
                          style={{ 
                            backgroundColor: `${categoryColor}20`,
                            color: categoryColor 
                          }}
                        >
                          {categoryName.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-1.5">
                            {categoryName}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            Teto: <span className="font-medium text-gray-700 dark:text-gray-300">{formatCurrency(budgetedAmount)}</span>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="text-right">
                          <div className="text-xs font-semibold">
                            {isOver ? (
                              <span className="text-rose-600 dark:text-rose-400 font-bold">
                                {formatCurrency(spentAmount)}
                              </span>
                            ) : (
                              <span className="text-gray-800 dark:text-gray-200">
                                {formatCurrency(spentAmount)}
                              </span>
                            )}
                            <span className="text-gray-400 font-normal"> / {formatCurrency(budgetedAmount)}</span>
                          </div>
                          
                          <div className="text-[11px] mt-0.5">
                            {isOver ? (
                              <span className="text-rose-600 dark:text-rose-400 font-medium inline-flex items-center gap-0.5">
                                <AlertTriangle className="w-3 h-3 inline" />
                                Estourado em {formatCurrency(Math.abs(remaining))}
                              </span>
                            ) : isWarning ? (
                              <span className="text-amber-600 dark:text-amber-400 font-medium">
                                Restam {formatCurrency(remaining)} ({percentage.toFixed(0)}%)
                              </span>
                            ) : (
                              <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                                Restam {formatCurrency(remaining)}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Botões de Ação */}
                        <div className="flex items-center gap-1 pl-2 border-l border-gray-200 dark:border-gray-700">
                          <button
                            onClick={() => handleEdit(budget)}
                            className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                            title="Editar orçamento"
                            aria-label="Editar"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(budget.id)}
                            disabled={deletingId === budget.id}
                            className="p-1.5 rounded-md text-gray-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                            title="Excluir orçamento"
                            aria-label="Excluir"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Barra de Progresso */}
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                      <div 
                        className={`h-2 rounded-full transition-all duration-500 ${
                          isOver 
                            ? 'bg-gradient-to-r from-rose-500 to-red-600' 
                            : isWarning 
                              ? 'bg-gradient-to-r from-amber-400 to-amber-500' 
                              : 'bg-gradient-to-r from-emerald-500 to-teal-500'
                        }`}
                        style={{ width: `${Math.min(percentage, 100)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <BudgetFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        categories={categories}
        budgetToEdit={editingBudget}
        currentMonth={currentMonth}
        currentYear={currentYear}
      />
    </>
  );
};
