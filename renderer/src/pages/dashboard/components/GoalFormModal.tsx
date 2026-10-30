import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '../../../lib/ipc';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { X, Target } from 'lucide-react';
import type { Goal } from '../../../types';

const goalFormSchema = z.object({
  name: z.string().min(1, 'O nome da meta é obrigatório'),
  targetAmount: z.string().min(1, 'Informe o valor alvo'),
  currentAmount: z.string().optional(),
  deadline: z.string().optional(),
  color: z.string().optional(),
});

type GoalFormValues = z.infer<typeof goalFormSchema>;

interface GoalFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  goalToEdit?: Goal | null;
}

const PRESET_COLORS = [
  '#10b981', // Emerald
  '#3b82f6', // Blue
  '#6366f1', // Indigo
  '#8b5cf6', // Violet
  '#ec4899', // Pink
  '#f59e0b', // Amber
  '#06b6d4', // Cyan
  '#14b8a6', // Teal
];

export const GoalFormModal: React.FC<GoalFormModalProps> = ({
  isOpen,
  onClose,
  goalToEdit,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState('#10b981');
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<GoalFormValues>({
    resolver: zodResolver(goalFormSchema),
    defaultValues: {
      name: '',
      targetAmount: '',
      currentAmount: '',
      deadline: '',
      color: '#10b981',
    },
  });

  useEffect(() => {
    if (isOpen) {
      if (goalToEdit) {
        let deadlineStr = '';
        if (goalToEdit.deadline) {
          const d = new Date(goalToEdit.deadline);
          if (!isNaN(d.getTime())) {
            deadlineStr = d.toISOString().split('T')[0];
          }
        }
        const color = goalToEdit.color || '#10b981';
        setSelectedColor(color);
        reset({
          name: goalToEdit.name,
          targetAmount: (goalToEdit.targetAmountCents / 100).toFixed(2),
          currentAmount: (goalToEdit.currentAmountCents / 100).toFixed(2),
          deadline: deadlineStr,
          color,
        });
      } else {
        setSelectedColor('#10b981');
        reset({
          name: '',
          targetAmount: '',
          currentAmount: '0.00',
          deadline: '',
          color: '#10b981',
        });
      }
      setError(null);
    }
  }, [isOpen, goalToEdit, reset]);

  const handleSelectColor = (c: string) => {
    setSelectedColor(c);
    setValue('color', c);
  };

  const onSubmit = async (data: GoalFormValues) => {
    setIsLoading(true);
    setError(null);

    const cleanTarget = data.targetAmount.replace(/[^\d.,]/g, '').replace(',', '.');
    const parsedTarget = parseFloat(cleanTarget);
    if (isNaN(parsedTarget) || parsedTarget <= 0) {
      setError('Informe um valor alvo válido maior que zero');
      setIsLoading(false);
      return;
    }

    const cleanCurrent = (data.currentAmount || '0').replace(/[^\d.,]/g, '').replace(',', '.');
    const parsedCurrent = parseFloat(cleanCurrent);
    const targetAmountCents = Math.round(parsedTarget * 100);
    const currentAmountCents = isNaN(parsedCurrent) ? 0 : Math.round(parsedCurrent * 100);

    let deadlineDate: Date | null = null;
    if (data.deadline) {
      const parsedD = new Date(data.deadline + 'T12:00:00');
      if (!isNaN(parsedD.getTime())) {
        deadlineDate = parsedD;
      }
    }

    try {
      if (goalToEdit) {
        await api.goals.update(goalToEdit.id, {
          name: data.name,
          targetAmountCents,
          currentAmountCents,
          deadline: deadlineDate,
          color: selectedColor,
        });
      } else {
        await api.goals.create({
          name: data.name,
          targetAmountCents,
          currentAmountCents,
          deadline: deadlineDate,
          color: selectedColor,
        });
      }

      await queryClient.invalidateQueries({ queryKey: ['goals'] });
      reset();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar meta');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="relative bg-white dark:bg-gray-850 p-6 w-full max-w-md rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-750">
        <div className="flex justify-between items-center mb-5">
          <div className="flex items-center gap-2.5">
            <div 
              className="p-2.5 rounded-xl text-white shadow-xs"
              style={{ backgroundColor: selectedColor }}
            >
              <Target className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                {goalToEdit ? 'Editar Meta' : 'Nova Meta de Economia'}
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Planeje conquistas e poupança de médio e longo prazo
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

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Nome da Meta
            </label>
            <Input
              {...register('name')}
              placeholder="Ex: Reserva de emergência, Viagem, Carro novo"
            />
            {errors.name && (
              <span className="text-xs text-rose-500 mt-1 block">{errors.name.message}</span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Valor Alvo (R$)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">
                  R$
                </span>
                <Input
                  {...register('targetAmount')}
                  type="text"
                  placeholder="10.000,00"
                  className="pl-10 font-semibold"
                />
              </div>
              {errors.targetAmount && (
                <span className="text-xs text-rose-500 mt-1 block">{errors.targetAmount.message}</span>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Já Guardado (R$)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">
                  R$
                </span>
                <Input
                  {...register('currentAmount')}
                  type="text"
                  placeholder="0,00"
                  className="pl-10"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Prazo / Data Limite (opcional)
            </label>
            <Input
              type="date"
              {...register('deadline')}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Cor de Destaque
            </label>
            <div className="flex items-center gap-2 flex-wrap">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => handleSelectColor(c)}
                  className={`w-7 h-7 rounded-full transition-transform ${
                    selectedColor === c ? 'scale-125 ring-2 ring-offset-2 ring-primary-500' : 'hover:scale-110'
                  }`}
                  style={{ backgroundColor: c }}
                  aria-label={`Cor ${c}`}
                />
              ))}
            </div>
          </div>

          {error && (
            <div className="p-3 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-lg text-rose-600 dark:text-rose-400 text-xs">
              {error}
            </div>
          )}

          <div className="flex justify-end space-x-3 pt-3">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || isLoading}
            >
              {isSubmitting || isLoading ? 'Salvando...' : goalToEdit ? 'Atualizar Meta' : 'Criar Meta'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
