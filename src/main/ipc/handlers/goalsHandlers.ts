import { ipcMain } from 'electron';
import { z } from 'zod';
import { GoalsRepository } from '../../repositories/goalsRepository';

const goalsRepository = new GoalsRepository();

const goalSchema = z.object({
  name: z.string().min(1),
  targetAmountCents: z.number().int(),
  currentAmountCents: z.number().int().default(0),
  deadline: z.preprocess((arg) => {
    if (typeof arg === 'string' || arg instanceof Date) {
      return new Date(arg);
    }
    return null;
  }, z.date().nullable().optional()),
  color: z.string().optional(),
});

const updateGoalSchema = goalSchema.partial();

export function registerGoalsHandlers() {
  ipcMain.handle('goals:getAll', async () => {
    return await goalsRepository.getAllGoals();
  });

  ipcMain.handle('goals:getById', async (event, id: string) => {
    return await goalsRepository.getGoalById(id);
  });

  ipcMain.handle('goals:create', async (event, goalData: unknown) => {
    const parsed = goalSchema.parse(goalData);
    return await goalsRepository.createGoal(parsed as any);
  });

  ipcMain.handle('goals:update', async (event, { id, goalData }: { id: string; goalData: unknown }) => {
    const parsed = updateGoalSchema.parse(goalData);
    return await goalsRepository.updateGoal(id, parsed as any);
  });

  ipcMain.handle('goals:delete', async (event, id: string) => {
    return await goalsRepository.deleteGoal(id);
  });

  ipcMain.handle('goals:addToGoal', async (event, { id, amountCents }: { id: string; amountCents: number }) => {
    return await goalsRepository.addToGoal(id, amountCents);
  });
}
