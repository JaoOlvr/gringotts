import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/ipc';
import { Button } from '../../components/ui/button';
import { CategoryFormModal } from './components/CategoryFormModal';
import { Tag, Plus, Trash2, Edit2 } from 'lucide-react';

export const CategoriesPage: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const {
    data: categories,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.categories.getAll(),
  });

  const handleOpenCreate = () => {
    setEditingId(null);
    setIsOpen(true);
  };

  const handleOpenEdit = (id: string) => {
    setEditingId(id);
    setIsOpen(true);
  };

  const handleClose = () => {
    setIsOpen(false);
    setEditingId(null);
    queryClient.invalidateQueries({ queryKey: ['categories'] });
    refetch();
  };

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`Tem certeza de que deseja excluir a categoria "${name}"?`)) {
      await api.categories.delete(id);
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      refetch();
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
            Categorias
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Organize suas despesas e receitas por áreas e grupos
          </p>
        </div>
        <Button onClick={handleOpenCreate} className="gap-2">
          <Plus className="w-4 h-4" />
          Nova Categoria
        </Button>
      </div>
      
      {isLoading && (
        <div className="h-64 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      )}
      
      {error && (
        <div className="p-4 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-xl text-rose-600 dark:text-rose-400 text-sm">
          {error instanceof Error ? error.message : String(error)}
        </div>
      )}
      
      {!isLoading && (categories === undefined || categories.length === 0) && (
        <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-2xl border border-dashed border-gray-300 dark:border-gray-700 p-8">
          <Tag className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">Nenhuma categoria cadastrada</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 mb-4">
            Crie categorias personalizadas com cores e grupos para organizar seus lançamentos.
          </p>
          <Button onClick={handleOpenCreate}>
            Criar Primeira Categoria
          </Button>
        </div>
      )}
      
      {!isLoading && categories && categories.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-750 shadow-xs overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-850">
              <tr>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Nome
                </th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Grupo
                </th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Tipo
                </th>
                <th className="px-6 py-3.5 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-750 bg-white dark:bg-gray-800">
              {categories.map((category) => (
                <tr key={category.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-750/50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-3">
                      <div 
                        className="w-3.5 h-3.5 rounded-full shrink-0" 
                        style={{ backgroundColor: category.color || '#64748b' }}
                      />
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{category.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {category.group ?? '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2.5 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      category.type === 'INCOME' 
                        ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300' 
                        : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300'
                    }`}>
                      {category.type === 'INCOME' ? 'Receita' : 'Despesa'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-1">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => handleOpenEdit(category.id)}
                      className="text-gray-400 hover:text-primary-600"
                      title="Editar categoria"
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => handleDelete(category.id, category.name)}
                      className="text-gray-400 hover:text-rose-600"
                      title="Excluir categoria"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      
      {isOpen && (
        <CategoryFormModal
          isOpen={isOpen}
          onClose={handleClose}
          categoryId={editingId}
        />
      )}
    </div>
  );
};

export default CategoriesPage;
