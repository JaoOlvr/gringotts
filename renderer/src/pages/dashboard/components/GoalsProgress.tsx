import React, { useMemo, useState } from 'react';
import { formatCurrency } from '../../../lib/utils';
import { api } from '../../../lib/ipc';
import { useQueryClient } from '@tanstack/react-query';
import { GoalFormModal } from './GoalFormModal';
import { DepositGoalModal } from './DepositGoalModal';
import { 
  Target, 
  PiggyBank, 
  Plus, 
  Pencil, 
  Trash2, 
  ArrowDownLeft, 
  ArrowUpRight, 
  Trophy, 
  Calendar,
  Sparkles 
} from 'lucide-react';
import type { Goal, Account } from '../../../types';

interface GoalsProgressProps {
  goals: Goal[];
  accounts?: Account[];
}

export const GoalsProgress: React.FC<GoalsProgressProps> = ({ goals, accounts = [] }) => {
  const queryClient = useQueryClient();
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);

  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
  const [depositGoal, setDepositGoal] = useState<Goal | null>(null);
  const [depositMode, setDepositMode] = useState<'deposit' | 'withdraw'>('deposit');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const goalsWithMetrics = useMemo(() => {
    const now = Date.now();

    return goals.map(goal => {
      const progress = goal.targetAmountCents > 0 
        ? (goal.currentAmountCents / goal.targetAmountCents) * 100 
        : 0;
      const isAchieved = progress >= 100;

      let monthlyRequired = null;
      let deadlineDate: Date | null = null;
      if (goal.deadline) {
        const d = new Date(goal.deadline);
        if (!isNaN(d.getTime())) {
          deadlineDate = d;
        }
      }

      if (!isAchieved && goal.targetAmountCents > 0 && deadlineDate) {
        const timeLeftMs = deadlineDate.getTime() - now;
        const timeLeftMonths = timeLeftMs / (1000 * 60 * 60 * 24 * 30.4375); // Média de dias por mês
        if (timeLeftMonths > 0) {
          monthlyRequired = (goal.targetAmountCents - goal.currentAmountCents) / timeLeftMonths;
        }
      }

      return {
        ...goal,
        progress,
        isAchieved,
        monthlyRequired,
        deadlineDate,
      };
    });
  }, [goals]);

  const handleCreateGoal = () => {
    setEditingGoal(null);
    setIsGoalModalOpen(true);
  };

  const handleEditGoal = (goal: Goal) => {
    setEditingGoal(goal);
    setIsGoalModalOpen(true);
  };

  const handleOpenDeposit = (goal: Goal, mode: 'deposit' | 'withdraw' = 'deposit') => {
    setDepositGoal(goal);
    setDepositMode(mode);
    setIsDepositModalOpen(true);
  };

  const handleDeleteGoal = async (id: string) => {
    if (confirm('Deseja realmente excluir esta meta de economia?')) {
      setDeletingId(id);
      try {
        await api.goals.delete(id);
        await queryClient.invalidateQueries({ queryKey: ['goals'] });
      } catch (err) {
        console.error('Erro ao excluir meta:', err);
      } finally {
        setDeletingId(null);
      }
    }
  };

  return (
    <>
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700/60 p-6 flex flex-col justify-between">
        <div>
          {/* Header do Card */}
          <div className="flex items-center justify-between mb-5">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                  Metas de Economia
                </h2>
                {goals.length > 0 && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 font-medium">
                    {goals.length} {goals.length === 1 ? 'meta' : 'metas'}
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Poupe com propósito e acompanhe o progresso
              </p>
            </div>

            <button
              onClick={handleCreateGoal}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors"
              title="Criar nova meta"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nova Meta</span>
            </button>
          </div>

          {/* Lista de Metas ou Estado Vazio */}
          {goals.length === 0 ? (
            <div className="text-center py-8 px-4 rounded-xl border border-dashed border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/40">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-3">
                <Target className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">
                Nenhuma meta criada
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm mx-auto mb-4">
                Defina objetivos como reserva de emergência, viagens ou compras planejadas.
              </p>
              <button
                onClick={handleCreateGoal}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors border border-emerald-200 dark:border-emerald-800/40"
              >
                <Plus className="w-3.5 h-3.5" />
                Criar Minha Primeira Meta
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {goalsWithMetrics.map(goal => {
                const goalColor = goal.color || '#10b981';
                const progressClamped = Math.min(100, Math.max(0, goal.progress));

                return (
                  <div
                    key={goal.id}
                    className="p-4 rounded-xl border border-gray-100 dark:border-gray-700/60 bg-gray-50/40 dark:bg-gray-800/30 hover:border-gray-200 dark:hover:border-gray-600 transition-all space-y-3"
                  >
                    {/* Linha superior: Ícone, Nome, Prazo e Valores */}
                    <div className="flex justify-between items-start">
                      <div className="flex items-center space-x-3">
                        <div
                          className="h-9 w-9 flex items-center justify-center rounded-xl text-white shadow-xs shrink-0"
                          style={{ backgroundColor: goalColor }}
                        >
                          {goal.isAchieved ? (
                            <Trophy className="w-4 h-4 text-amber-200" />
                          ) : (
                            <PiggyBank className="w-4 h-4" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                              {goal.name}
                            </p>
                            {goal.isAchieved && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-md font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300">
                                Concluída! 🏆
                              </span>
                            )}
                          </div>
                          {goal.deadlineDate && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-0.5">
                              <Calendar className="w-3 h-3" />
                              Até {goal.deadlineDate.toLocaleDateString('pt-BR')}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-xs font-semibold">
                          <span className={goal.isAchieved ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-gray-900 dark:text-gray-100'}>
                            {formatCurrency(goal.currentAmountCents)}
                          </span>
                          <span className="text-gray-400 font-normal"> / {formatCurrency(goal.targetAmountCents)}</span>
                        </div>
                        <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400">
                          {goal.progress.toFixed(0)}% alcançado
                        </span>
                      </div>
                    </div>

                    {/* Barra de Progresso com Gradiente */}
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 overflow-hidden">
                      <div
                        className="h-2.5 rounded-full transition-all duration-500"
                        style={{
                          width: `${progressClamped}%`,
                          backgroundColor: goalColor,
                        }}
                      />
                    </div>

                    {/* Rodapé da Meta: Necessidade mensal e Ações */}
                    <div className="flex items-center justify-between pt-1">
                      <div>
                        {!goal.isAchieved && goal.monthlyRequired !== null && goal.monthlyRequired > 0 && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                            <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                              {formatCurrency(goal.monthlyRequired)}
                            </span>
                            / mês necessário
                          </p>
                        )}
                      </div>

                      {/* Botões de Ação na Meta */}
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleOpenDeposit(goal, 'deposit')}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition-colors border border-emerald-200 dark:border-emerald-800/50"
                          title="Guardar dinheiro nesta meta"
                        >
                          <ArrowDownLeft className="w-3.5 h-3.5" />
                          <span>Guardar</span>
                        </button>

                        {goal.currentAmountCents > 0 && (
                          <button
                            onClick={() => handleOpenDeposit(goal, 'withdraw')}
                            className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-750 transition-colors"
                            title="Resgatar valor da meta"
                          >
                            <ArrowUpRight className="w-3.5 h-3.5" />
                            <span>Resgatar</span>
                          </button>
                        )}

                        <button
                          onClick={() => handleEditGoal(goal)}
                          className="p-1 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                          title="Editar meta"
                          aria-label="Editar"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => handleDeleteGoal(goal.id)}
                          disabled={deletingId === goal.id}
                          className="p-1 rounded-md text-gray-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                          title="Excluir meta"
                          aria-label="Excluir"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Modais */}
      <GoalFormModal
        isOpen={isGoalModalOpen}
        onClose={() => setIsGoalModalOpen(false)}
        goalToEdit={editingGoal}
      />

      <DepositGoalModal
        isOpen={isDepositModalOpen}
        onClose={() => setIsDepositModalOpen(false)}
        goal={depositGoal}
        accounts={accounts}
        mode={depositMode}
      />
    </>
  );
};
