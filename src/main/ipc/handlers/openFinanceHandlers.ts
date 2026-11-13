import { ipcMain } from 'electron';
import { z } from 'zod';
import { openFinanceService } from '../../services/openFinance/openFinanceService';

const parseStatementSchema = z.object({
  fileContent: z.string(),
  fileName: z.string().optional(),
  accountId: z.string().optional(),
});

const importTransactionsSchema = z.object({
  accountId: z.string().min(1),
  transactions: z.array(
    z.object({
      amountCents: z.number(),
      date: z.string(),
      description: z.string(),
      type: z.enum(['INCOME', 'EXPENSE']),
      categoryId: z.string().optional(),
      fitid: z.string().optional(),
      status: z.enum(['PAID', 'PENDING', 'RECONCILED']).optional(),
    })
  ),
  updateAccountBalance: z.boolean().optional(),
});

export function registerOpenFinanceHandlers() {
  // Abre o seletor nativo de arquivos do sistema operacional
  ipcMain.handle('openFinance:selectFile', async () => {
    try {
      return await openFinanceService.selectStatementFile();
    } catch (error: any) {
      console.error('Erro ao selecionar arquivo de extrato:', error);
      throw new Error(error.message || 'Falha ao selecionar arquivo');
    }
  });

  // Processa o conteúdo de um extrato
  ipcMain.handle('openFinance:parseStatement', async (_event, payload: unknown) => {
    try {
      const { fileContent, fileName, accountId } = parseStatementSchema.parse(payload);
      return await openFinanceService.parseStatement(fileContent, fileName, accountId);
    } catch (error: any) {
      console.error('Erro ao processar extrato:', error);
      throw new Error(error.message || 'Falha ao processar extrato');
    }
  });

  // Salva transações selecionadas no banco de dados local
  ipcMain.handle('openFinance:importTransactions', async (_event, payload: unknown) => {
    try {
      const params = importTransactionsSchema.parse(payload);
      return await openFinanceService.importTransactions(params);
    } catch (error: any) {
      console.error('Erro ao importar transações:', error);
      throw new Error(error.message || 'Falha ao importar transações');
    }
  });
}
