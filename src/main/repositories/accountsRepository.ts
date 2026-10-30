import { db, accounts } from '../services/db';
import { eq } from 'drizzle-orm';
import { Account, LockType } from '../../domain/entities/account';
import crypto from 'node:crypto';
import { hashSecret, verifySecret } from '../services/cryptoService';

export class AccountsRepository {
  async getAllAccounts(): Promise<Account[]> {
    const dbAccounts = await db.select().from(accounts);
    return dbAccounts.map(acc => ({
      id: acc.id,
      name: acc.name,
      type: acc.type as any,
      balanceCents: acc.balance_cents,
      currency: acc.currency,
      color: acc.color,
      icon: acc.icon,
      isActive: acc.is_active,
      isLocked: !!acc.is_locked,
      lockType: (acc.lock_type as LockType) || undefined,
      createdAt: acc.created_at,
      updatedAt: acc.updated_at,
    }));
  }

  async getAccountById(id: string): Promise<Account | null> {
    const dbAccounts = await db.select().from(accounts).where(eq(accounts.id, id));
    if (dbAccounts.length === 0) return null;
    const acc = dbAccounts[0];
    return {
      id: acc.id,
      name: acc.name,
      type: acc.type as any,
      balanceCents: acc.balance_cents,
      currency: acc.currency,
      color: acc.color,
      icon: acc.icon,
      isActive: acc.is_active,
      isLocked: !!acc.is_locked,
      lockType: (acc.lock_type as LockType) || undefined,
      createdAt: acc.created_at,
      updatedAt: acc.updated_at,
    };
  }

  async createAccount(account: Omit<Account, 'id' | 'createdAt' | 'updatedAt'>): Promise<Account> {
    const id = crypto.randomUUID();
    const now = new Date();
    const [newAccount] = await db.insert(accounts).values({
      id,
      name: account.name,
      type: account.type,
      balance_cents: account.balanceCents,
      currency: account.currency,
      color: account.color,
      icon: account.icon,
      is_active: !!account.isActive,
      is_locked: !!account.isLocked,
      lock_type: account.lockType || null,
      created_at: now,
      updated_at: now,
    }).returning();
    
    return {
      id: newAccount.id,
      name: newAccount.name,
      type: newAccount.type as any,
      balanceCents: newAccount.balance_cents,
      currency: newAccount.currency,
      color: newAccount.color,
      icon: newAccount.icon,
      isActive: newAccount.is_active,
      isLocked: !!newAccount.is_locked,
      lockType: (newAccount.lock_type as LockType) || undefined,
      createdAt: newAccount.created_at,
      updatedAt: newAccount.updated_at,
    };
  }

  async updateAccount(id: string, account: Partial<Omit<Account, 'id' | 'createdAt' | 'updatedAt'>>): Promise<Account | null> {
    const updateData: any = {};
    if (account.name !== undefined) updateData.name = account.name;
    if (account.type !== undefined) updateData.type = account.type;
    if (account.balanceCents !== undefined) updateData.balance_cents = account.balanceCents;
    if (account.currency !== undefined) updateData.currency = account.currency;
    if (account.color !== undefined) updateData.color = account.color;
    if (account.icon !== undefined) updateData.icon = account.icon;
    if (account.isActive !== undefined) updateData.is_active = account.isActive;
    updateData.updated_at = new Date();

    const [updatedAccount] = await db.update(accounts).set(updateData).where(eq(accounts.id, id)).returning();
    
    if (!updatedAccount) return null;
    return {
      id: updatedAccount.id,
      name: updatedAccount.name,
      type: updatedAccount.type as any,
      balanceCents: updatedAccount.balance_cents,
      currency: updatedAccount.currency,
      color: updatedAccount.color,
      icon: updatedAccount.icon,
      isActive: updatedAccount.is_active,
      isLocked: !!updatedAccount.is_locked,
      lockType: (updatedAccount.lock_type as LockType) || undefined,
      createdAt: updatedAccount.created_at,
      updatedAt: updatedAccount.updated_at,
    };
  }

  async deleteAccount(id: string, secret?: string): Promise<boolean> {
    const rows = await db.select().from(accounts).where(eq(accounts.id, id));
    if (rows.length === 0) return false;
    const acc = rows[0];

    // Se a conta estiver protegida com senha/PIN, exigir e validar o segredo
    if (acc.is_locked) {
      if (!secret) {
        throw new Error('Esta conta é protegida. Informe o PIN ou Senha para autorizar a exclusão.');
      }
      if (!acc.password_hash || !acc.salt) {
        throw new Error('Dados de segurança da conta corrompidos.');
      }
      const isValid = verifySecret(secret, acc.password_hash, acc.salt);
      if (!isValid) {
        throw new Error('PIN ou Senha incorreto. Não foi possível excluir a conta.');
      }
    }

    const result = await db.delete(accounts).where(eq(accounts.id, id));
    return (result as any).changes > 0 || (result as any).rowCount > 0;
  }

  /**
   * Configura ou altera o bloqueio (PIN ou Senha) de uma conta
   */
  async setAccountLock(id: string, lockType: LockType, secret: string): Promise<boolean> {
    const { hash, salt } = hashSecret(secret);
    const result = await db.update(accounts).set({
      is_locked: true,
      lock_type: lockType,
      password_hash: hash,
      salt: salt,
      updated_at: new Date(),
    }).where(eq(accounts.id, id));

    return (result as any).changes > 0 || (result as any).rowCount > 0;
  }

  /**
   * Valida se o PIN ou Senha fornecido está correto
   */
  async verifyAccountLock(id: string, secret: string): Promise<boolean> {
    const rows = await db.select().from(accounts).where(eq(accounts.id, id));
    if (rows.length === 0) return false;
    const acc = rows[0];

    // Se a conta não está trancada, o acesso é liberado
    if (!acc.is_locked) return true;

    if (!acc.password_hash || !acc.salt) return false;

    return verifySecret(secret, acc.password_hash, acc.salt);
  }

  /**
   * Remove o bloqueio da conta mediante conferência da senha/PIN atual
   */
  async removeAccountLock(id: string, currentSecret: string): Promise<boolean> {
    const isValid = await this.verifyAccountLock(id, currentSecret);
    if (!isValid) return false;

    const result = await db.update(accounts).set({
      is_locked: false,
      lock_type: null,
      password_hash: null,
      salt: null,
      updated_at: new Date(),
    }).where(eq(accounts.id, id));

    return (result as any).changes > 0 || (result as any).rowCount > 0;
  }
}
