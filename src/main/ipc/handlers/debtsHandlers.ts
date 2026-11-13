import { ipcMain } from 'electron';
import { z } from 'zod';
import { DebtsRepository } from '../../repositories/debtsRepository';

const debtsRepo = new DebtsRepository();

const createDebtSchema = z.object({
  name: z.string().min(1, 'Nome da dívida é obrigatório'),
  creditor: z.string().optional(),
  totalAmountCents: z.number().int().positive('Valor total deve ser positivo'),
  remainingAmountCents: z.number().int().nonnegative('Saldo devedor deve ser não-negativo'),
  interestRateMonthly: z.number().nonnegative().default(0),
  minimumPaymentCents: z.number().int().nonnegative().default(0),
  dueDay: z.number().int().min(1).max(31).optional(),
  categoryId: z.string().optional(),
  color: z.string().optional(),
  notes: z.string().optional(),
  isPaid: z.boolean().default(false),
});

const updateDebtSchema = z.object({
  id: z.string().min(1),
  debt: z.object({
    name: z.string().optional(),
    creditor: z.string().optional(),
    totalAmountCents: z.number().int().optional(),
    remainingAmountCents: z.number().int().optional(),
    interestRateMonthly: z.number().optional(),
    minimumPaymentCents: z.number().int().optional(),
    dueDay: z.number().int().min(1).max(31).optional(),
    categoryId: z.string().optional(),
    color: z.string().optional(),
    notes: z.string().optional(),
    isPaid: z.boolean().optional(),
  }),
});

const recordPaymentSchema = z.object({
  id: z.string().min(1),
  paymentAmountCents: z.number().int().positive('Valor do pagamento deve ser positivo'),
});

export function registerDebtsHandlers() {
  ipcMain.handle('debts:getAll', async () => {
    try {
      return await debtsRepo.getAllDebts();
    } catch (error: any) {
      console.error('Erro ao buscar dívidas:', error);
      throw new Error(error.message || 'Falha ao buscar dívidas');
    }
  });

  ipcMain.handle('debts:create', async (_event, payload: unknown) => {
    try {
      const data = createDebtSchema.parse(payload);
      return await debtsRepo.createDebt(data);
    } catch (error: any) {
      console.error('Erro ao criar dívida:', error);
      throw new Error(error.message || 'Falha ao criar dívida');
    }
  });

  ipcMain.handle('debts:update', async (_event, payload: unknown) => {
    try {
      const { id, debt } = updateDebtSchema.parse(payload);
      return await debtsRepo.updateDebt(id, debt);
    } catch (error: any) {
      console.error('Erro ao atualizar dívida:', error);
      throw new Error(error.message || 'Falha ao atualizar dívida');
    }
  });

  ipcMain.handle('debts:recordPayment', async (_event, payload: unknown) => {
    try {
      const { id, paymentAmountCents } = recordPaymentSchema.parse(payload);
      return await debtsRepo.recordPayment(id, paymentAmountCents);
    } catch (error: any) {
      console.error('Erro ao registrar pagamento de dívida:', error);
      throw new Error(error.message || 'Falha ao registrar pagamento');
    }
  });

  ipcMain.handle('debts:delete', async (_event, id: string) => {
    try {
      return await debtsRepo.deleteDebt(id);
    } catch (error: any) {
      console.error('Erro ao excluir dívida:', error);
      throw new Error(error.message || 'Falha ao excluir dívida');
    }
  });
}

