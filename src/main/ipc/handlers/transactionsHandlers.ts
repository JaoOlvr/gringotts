import { ipcMain } from 'electron';
import { z } from 'zod';
import { TransactionsRepository } from '../../repositories/transactionsRepository';

// Initialize the repository
const transactionsRepository = new TransactionsRepository();

// Define Zod schemas for validation
const transactionSchema = z.object({
  amountCents: z.number().int(),
  date: z.preprocess((arg) => {
    if (typeof arg === 'string' || arg instanceof Date) {
      return new Date(arg);
    }
    return arg;
  }, z.date()),
  description: z.string().optional(),
  accountId: z.string(),
  categoryId: z.string().optional().nullable(), // Allow null for transfers?
  type: z.enum(['INCOME', 'EXPENSE', 'TRANSFER']),
  status: z.enum(['PENDING', 'PAID', 'RECONCILED']).default('PENDING'),
  tags: z.array(z.string()).default([]),
  attachmentPath: z.string().optional(),
  recurrenceId: z.string().optional().nullable(),
});

// For update, we allow partial
const updateTransactionSchema = transactionSchema.partial();

// Handler functions
export function registerTransactionsHandlers() {
  // Get all transactions (with optional filtering and pagination)
  ipcMain.handle('transactions:getAll', async (event, options: unknown) => {
    // We'll validate options with a schema, but for now we'll just pass through.
    // We'll create a schema for options if needed.
    // For simplicity, we'll assume options is an object with optional fields.
    // We'll do a light validation: if options is not an object, we'll treat it as empty.
    let opts = {};
    if (options && typeof options === 'object') {
      opts = options as any;
    }
    return await transactionsRepository.getAllTransactions(opts);
  });

  // Get transaction by id
  ipcMain.handle('transactions:getById', async (event, id: string) => {
    return await transactionsRepository.getTransactionById(id);
  });

  // Create transaction
  ipcMain.handle('transactions:create', async (event, transactionData: unknown) => {
    // Validate input
    const parsed = transactionSchema.parse(transactionData);
    return await transactionsRepository.createTransaction(parsed as any);
  });

  // Update transaction
  ipcMain.handle('transactions:update', async (event, { id, transactionData }: { id: string; transactionData: unknown }) => {
    // Validate input
    const parsed = updateTransactionSchema.parse(transactionData);
    return await transactionsRepository.updateTransaction(id, parsed as any);
  });

  // Delete transaction
  ipcMain.handle('transactions:delete', async (event, id: string) => {
    return await transactionsRepository.deleteTransaction(id);
  });
}
