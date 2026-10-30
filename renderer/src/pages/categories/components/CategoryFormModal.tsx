import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '../../../lib/ipc';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Select } from '../../../components/ui/select';
import { X, Check, Palette, Tag, Sparkles } from 'lucide-react';

const PREDEFINED_COLORS = [
  { hex: '#ef4444', name: 'Vermelho' },
  { hex: '#f43f5e', name: 'Cereja' },
  { hex: '#ec4899', name: 'Pink' },
  { hex: '#d946ef', name: 'Fúcsia' },
  { hex: '#a855f7', name: 'Roxo' },
  { hex: '#8b5cf6', name: 'Violeta' },
  { hex: '#6366f1', name: 'Índigo' },
  { hex: '#3b82f6', name: 'Azul' },
  { hex: '#0ea5e9', name: 'Azul Céu' },
  { hex: '#06b6d4', name: 'Ciano' },
  { hex: '#14b8a6', name: 'Turquesa' },
  { hex: '#10b981', name: 'Esmeralda' },
  { hex: '#22c55e', name: 'Verde' },
  { hex: '#84cc16', name: 'Limão' },
  { hex: '#eab308', name: 'Amarelo' },
  { hex: '#f59e0b', name: 'Âmbar' },
  { hex: '#f97316', name: 'Laranja' },
  { hex: '#64748b', name: 'Grafite' },
];

const categoryFormSchema = z.object({
  name: z.string().min(1, 'Nome da categoria é obrigatório'),
  group: z.string().optional(),
  icon: z.string().optional(),
  color: z.string().optional(),
  type: z.enum(['INCOME', 'EXPENSE']),
  parentId: z.string().optional().nullable(),
});

type CategoryFormValues = z.infer<typeof categoryFormSchema>;

interface CategoryFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  categoryId?: string | null;
}

export const CategoryFormModal: React.FC<CategoryFormModalProps> = ({ 
  isOpen, 
  onClose, 
  categoryId 
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();
  
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CategoryFormValues>({
    resolver: zodResolver(categoryFormSchema) as any,
    defaultValues: {
      name: '',
      type: 'EXPENSE',
      group: '',
      color: '#ef4444',
      parentId: null,
    },
  });

  const currentColor = watch('color') || '#ef4444';
  const currentName = watch('name');
  const currentType = watch('type');
  const currentGroup = watch('group');

  useEffect(() => {
    if (isOpen && categoryId) {
      api.categories.getById(categoryId).then((cat) => {
        if (cat) {
          reset({
            name: cat.name,
            type: cat.type,
            group: cat.group || '',
            color: cat.color || '#ef4444',
            parentId: cat.parentId || null,
          });
        }
      }).catch(console.error);
    } else if (isOpen && !categoryId) {
      reset({
        name: '',
        type: 'EXPENSE',
        group: '',
        color: '#ef4444',
        parentId: null,
      });
    }
  }, [isOpen, categoryId, reset]);

  // Ao mudar o tipo de Despesa para Receita (se novo cadastro), sugerir esmeralda se ainda estiver na cor padrão
  const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newType = e.target.value as 'INCOME' | 'EXPENSE';
    setValue('type', newType);
    if (!categoryId) {
      if (newType === 'INCOME' && currentColor === '#ef4444') {
        setValue('color', '#10b981');
      } else if (newType === 'EXPENSE' && currentColor === '#10b981') {
        setValue('color', '#ef4444');
      }
    }
  };

  const onSubmit = async (data: CategoryFormValues) => {
    setIsLoading(true);
    setError(null);
    try {
      if (categoryId) {
        await api.categories.update(categoryId, {
          name: data.name,
          group: data.group || undefined,
          color: data.color,
          type: data.type,
          parentId: data.parentId ?? undefined,
        });
      } else {
        await api.categories.create({
          name: data.name,
          group: data.group || undefined,
          color: data.color,
          type: data.type,
          parentId: data.parentId ?? undefined,
        });
      }
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      reset();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar categoria');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const isCustomColor = !PREDEFINED_COLORS.some((c) => c.hex.toLowerCase() === currentColor.toLowerCase());

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="relative bg-white dark:bg-gray-850 p-6 w-full max-w-md rounded-3xl shadow-2xl border border-gray-100 dark:border-gray-750">
        <div className="flex justify-between items-center mb-5">
          <div className="flex items-center gap-2.5">
            <div 
              className="w-8 h-8 rounded-xl flex items-center justify-center text-white shadow-2xs transition-colors"
              style={{ backgroundColor: currentColor }}
            >
              <Tag className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 leading-tight">
                {categoryId ? 'Editar Categoria' : 'Nova Categoria'}
              </h2>
              <span className="text-xs text-gray-400">Personalize nome, tipo e cor de destaque</span>
            </div>
          </div>

          <button
            className="rounded-xl p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-750 dark:hover:text-gray-200 transition-colors"
            onClick={onClose}
            aria-label="Fechar"
            type="button"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Preview Card */}
        <div className="mb-5 p-3.5 rounded-2xl bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-750 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <span
              className="w-9 h-9 rounded-xl flex items-center justify-center text-white shrink-0 shadow-2xs transition-all"
              style={{ backgroundColor: currentColor }}
            >
              <Tag className="w-4 h-4" />
            </span>
            <div className="min-w-0">
              <span className="text-xs font-bold text-gray-900 dark:text-gray-100 block truncate">
                {currentName.trim() || 'Nome da Categoria'}
              </span>
              <span className="text-[11px] text-gray-400 truncate block">
                {currentGroup ? `Grupo: ${currentGroup}` : 'Sem grupo definido'}
              </span>
            </div>
          </div>

          <span 
            className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border shrink-0"
            style={{
              backgroundColor: `${currentColor}15`,
              color: currentColor,
              borderColor: `${currentColor}40`,
            }}
          >
            {currentType === 'INCOME' ? 'Receita' : 'Despesa'}
          </span>
        </div>
        
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
              Nome da Categoria
            </label>
            <Input
              {...register('name')}
              placeholder="Ex: Alimentação, Lazer, Salário, Moradia"
              autoFocus
            />
            {errors.name && (
              <span className="text-xs text-rose-500 mt-1 block">{errors.name.message}</span>
            )}
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
                Tipo
              </label>
              <Select {...register('type')} onChange={handleTypeChange}>
                <option value="EXPENSE">Despesa</option>
                <option value="INCOME">Receita</option>
              </Select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
                Grupo (opcional)
              </label>
              <Input
                {...register('group')}
                placeholder="Ex: Essenciais, Fixos"
              />
            </div>
          </div>

          {/* Seção de Cores Pré-definidas */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                Cores Pré-definidas
              </label>
              <span className="text-[11px] font-mono text-gray-400 font-medium">
                {currentColor.toUpperCase()}
              </span>
            </div>

            {/* Grid de Amostras de Cores */}
            <div className="grid grid-cols-6 sm:grid-cols-9 gap-2 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-750">
              {PREDEFINED_COLORS.map((c) => {
                const isSelected = currentColor.toLowerCase() === c.hex.toLowerCase();
                return (
                  <button
                    key={c.hex}
                    type="button"
                    onClick={() => setValue('color', c.hex)}
                    className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full transition-all duration-150 flex items-center justify-center relative hover:scale-110 active:scale-95 shadow-2xs ${
                      isSelected
                        ? 'ring-2 ring-offset-2 ring-primary-500 dark:ring-offset-gray-900 scale-105'
                        : 'hover:opacity-90'
                    }`}
                    style={{ backgroundColor: c.hex }}
                    title={c.name}
                  >
                    {isSelected && (
                      <Check className="w-3.5 h-3.5 text-white stroke-[3] drop-shadow-xs" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Seletor de Cor Personalizada e Código Hex */}
            <div className="flex items-center justify-between mt-2.5 px-1">
              <div className="flex items-center gap-2">
                <div className="relative flex items-center">
                  <input
                    type="color"
                    id="customColorPicker"
                    value={currentColor}
                    onChange={(e) => setValue('color', e.target.value)}
                    className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                  />
                  <label
                    htmlFor="customColorPicker"
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold cursor-pointer border transition-colors ${
                      isCustomColor 
                        ? 'bg-primary-50 dark:bg-primary-950/40 border-primary-300 dark:border-primary-700 text-primary-600 dark:text-primary-400' 
                        : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-750'
                    }`}
                  >
                    <Palette className="w-3.5 h-3.5" />
                    <span>Outra Cor</span>
                  </label>
                </div>
                {isCustomColor && (
                  <span className="text-[11px] text-primary-600 dark:text-primary-400 font-medium flex items-center gap-1">
                    <Sparkles className="w-3 h-3" /> Cor personalizada
                  </span>
                )}
              </div>

              {/* Input de Hexadecimal */}
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-gray-400">HEX:</span>
                <input
                  type="text"
                  value={currentColor}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val.startsWith('#') && val.length <= 7) {
                      setValue('color', val);
                    } else if (!val.startsWith('#') && val.length <= 6) {
                      setValue('color', `#${val}`);
                    }
                  }}
                  className="w-20 px-2 py-0.5 text-xs font-mono rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 uppercase focus:outline-none focus:ring-1 focus:ring-primary-500"
                  maxLength={7}
                />
              </div>
            </div>
          </div>
          
          <div className="flex justify-end space-x-2 pt-3 border-t border-gray-100 dark:border-gray-750">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading || isSubmitting}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || isLoading}
              className="bg-primary-600 hover:bg-primary-700 text-white font-semibold"
            >
              {isSubmitting || isLoading ? 'Salvando...' : 'Salvar Categoria'}
            </Button>
          </div>
          
          {error && (
            <div className="p-3 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-xl text-rose-600 dark:text-rose-400 text-xs">
              {error}
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default CategoryFormModal;
