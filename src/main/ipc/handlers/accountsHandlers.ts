import { ipcMain } from 'electron';
import { z } from 'zod';
import { AccountsRepository } from '../../repositories/accountsRepository';

// Initialize the repository
const accountsRepository = new AccountsRepository();

// Define Zod schemas for validation
const accountSchema = z.object({
  name: z.string().min(1, 'Account name is required'),
  type: z.enum(['checking', 'savings', 'credit_card', 'cash', 'investment', 'loan']),
  balanceCents: z.number().int(),
  currency: z.string().length(3).default('BRL'),
  color: z.string().optional(),
  icon: z.string().optional(),
  isActive: z.boolean().default(true),
  includeInTotal: z.boolean().default(true).optional(),
});

// For update, we allow partial
const updateAccountSchema = accountSchema.partial();

// Handler functions
export function registerAccountsHandlers() {
  // Get all accounts
  ipcMain.handle('accounts:getAll', async () => {
    return await accountsRepository.getAllAccounts();
  });

  // Get account by id
  ipcMain.handle('accounts:getById', async (event, id: string) => {
    return await accountsRepository.getAccountById(id);
  });

  // Create account
  ipcMain.handle('accounts:create', async (event, accountData: unknown) => {
    // Validate input
    const parsed = accountSchema.parse(accountData);
    return await accountsRepository.createAccount(parsed);
  });

  // Update account
  ipcMain.handle('accounts:update', async (event, payload: { id: string; account?: unknown; accountData?: unknown }) => {
    // Validate input
    const rawData = payload.accountData !== undefined ? payload.accountData : payload.account;
    const parsed = updateAccountSchema.parse(rawData);
    return await accountsRepository.updateAccount(payload.id, parsed);
  });

  // Delete account
  ipcMain.handle('accounts:delete', async (event, payload: string | { id: string; secret?: string }, optionalSecret?: string) => {
    let id: string;
    let secret: string | undefined;

    if (typeof payload === 'string') {
      id = payload;
      secret = optionalSecret;
    } else {
      id = payload.id;
      secret = payload.secret;
    }

    return await accountsRepository.deleteAccount(id, secret);
  });

  // Configurar bloqueio por PIN ou Senha
  ipcMain.handle('accounts:setLock', async (event, { id, lockType, secret }: { id: string; lockType: 'PIN' | 'PASSWORD'; secret: string }) => {
    if (!id || !secret || (lockType !== 'PIN' && lockType !== 'PASSWORD')) {
      throw new Error('Parâmetros inválidos para configuração de bloqueio');
    }
    return await accountsRepository.setAccountLock(id, lockType, secret);
  });

  // Verificar bloqueio
  ipcMain.handle('accounts:verifyLock', async (event, { id, secret }: { id: string; secret: string }) => {
    if (!id || secret === undefined) return false;
    return await accountsRepository.verifyAccountLock(id, secret);
  });

  // Remover bloqueio
  ipcMain.handle('accounts:removeLock', async (event, { id, secret }: { id: string; secret: string }) => {
    if (!id || !secret) return false;
    return await accountsRepository.removeAccountLock(id, secret);
  });
}
