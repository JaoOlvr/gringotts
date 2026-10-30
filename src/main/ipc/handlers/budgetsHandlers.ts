import { ipcMain } from 'electron';
import { z } from 'zod';
import { BudgetsRepository } from '../../repositories/budgetsRepository';

const budgetsRepository = new BudgetsRepository();

const budgetSchema = z.object({
  categoryId: z.string().min(1, 'Categoria é obrigatória'),
  amountCents: z.coerce.number().int().positive('Valor do orçamento deve ser maior que zero'),
  month: z.coerce.number().int().min(1).max(12),
  year: z.coerce.number().int().min(2000).max(2100),
});

const updateBudgetSchema = budgetSchema.partial();

export function registerBudgetsHandlers() {
  ipcMain.handle('budgets:getAll', async () => {
    return await budgetsRepository.getAllBudgets();
  });

  ipcMain.handle('budgets:create', async (event, budgetData: unknown) => {
    const parsed = budgetSchema.parse(budgetData);
    return await budgetsRepository.createBudget(parsed);
  });

  ipcMain.handle('budgets:update', async (event, { id, budgetData }: { id: string; budgetData: unknown }) => {
    const parsed = updateBudgetSchema.parse(budgetData);
    return await budgetsRepository.updateBudget(id, parsed);
  });

  ipcMain.handle('budgets:delete', async (event, id: string) => {
    return await budgetsRepository.deleteBudget(id);
  });
}
