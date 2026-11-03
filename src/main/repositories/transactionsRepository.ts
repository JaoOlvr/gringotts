import { db, transactions, accounts } from '../services/db';
import { eq, and, gte, lte, asc, desc } from 'drizzle-orm';
import crypto from 'node:crypto';

export type TransactionType = 'INCOME' | 'EXPENSE' | 'TRANSFER';
export type TransactionStatus = 'PENDING' | 'PAID' | 'RECONCILED';

export interface Transaction {
  id: string;
  amountCents: number;
  date: Date;
  description?: string;
  accountId: string;
  categoryId?: string;
  type: TransactionType;
  status: TransactionStatus;
  tags: string[];
  attachmentPath?: string;
  recurrenceId?: string;
  createdAt: Date;
}

export interface GetAllTransactionsOptions {
  limit?: number;
  offset?: number;
  sortBy?: 'date' | 'amount' | 'description';
  sortOrder?: 'asc' | 'desc';
  accountId?: string;
  categoryId?: string;
  startDate?: Date;
  endDate?: Date;
  type?: TransactionType;
  status?: TransactionStatus;
}

export class TransactionsRepository {
  private isTransferIn(t: { type: string; tags?: string[] | string | null; description?: string | null }): boolean {
    if (t.type !== 'TRANSFER') return false;
    const tags = Array.isArray(t.tags)
      ? t.tags
      : typeof t.tags === 'string'
      ? (() => {
          try {
            return JSON.parse(t.tags);
          } catch {
            return [];
          }
        })()
      : [];
    return tags.includes('TRANSFER_IN') || tags.includes('Resgate') || (!!t.description && t.description.toLowerCase().startsWith('resgate'));
  }

  private async applyBalanceDelta(accountId: string, deltaCents: number): Promise<void> {
    if (!accountId || deltaCents === 0) return;
    try {
      const accList = await db.select().from(accounts).where(eq(accounts.id, accountId));
      if (accList.length > 0) {
        const current = accList[0]!;
        const newBalance = current.balance_cents + deltaCents;
        await db.update(accounts).set({
          balance_cents: newBalance,
          updated_at: new Date(),
        }).where(eq(accounts.id, accountId));
      }
    } catch (err) {
      console.error('Failed to update account balance:', err);
    }
  }

  async recalculateAllAccountBalances(): Promise<void> {
    try {
      const allAccounts = await db.select().from(accounts);
      for (const acc of allAccounts) {
        const txs = await db.select().from(transactions).where(eq(transactions.account_id, acc.id));
        if (txs.length > 0) {
          let calculated = 0;
          for (const t of txs) {
            if (t.status === 'PENDING') continue;
            const isTrIn = this.isTransferIn(t);
            if (t.type === 'INCOME' || (t.type === 'TRANSFER' && isTrIn)) {
              calculated += Math.abs(t.amount_cents);
            } else if (t.type === 'EXPENSE' || (t.type === 'TRANSFER' && !isTrIn)) {
              calculated -= Math.abs(t.amount_cents);
            }
          }
          await db.update(accounts).set({
            balance_cents: calculated,
            updated_at: new Date(),
          }).where(eq(accounts.id, acc.id));
        }
      }
    } catch (err) {
      console.error('Failed to recalculate balances:', err);
    }
  }

  async getAllTransactions(options?: GetAllTransactionsOptions): Promise<Transaction[]> {
    const conditions: any[] = [];

    if (options?.accountId) conditions.push(eq(transactions.account_id, options.accountId));
    if (options?.categoryId) conditions.push(eq(transactions.category_id, options.categoryId));
    if (options?.type) conditions.push(eq(transactions.type, options.type));
    if (options?.status) conditions.push(eq(transactions.status, options.status));
    if (options?.startDate) conditions.push(gte(transactions.date, options.startDate));
    if (options?.endDate) conditions.push(lte(transactions.date, options.endDate));

    let query = db.select().from(transactions).$dynamic();

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    const sortBy = options?.sortBy ?? 'date';
    const sortOrder = options?.sortOrder ?? 'desc';
    let orderByCol;
    if (sortBy === 'amount') {
      orderByCol = sortOrder === 'asc' ? asc(transactions.amount_cents) : desc(transactions.amount_cents);
    } else if (sortBy === 'description') {
      orderByCol = sortOrder === 'asc' ? asc(transactions.description) : desc(transactions.description);
    } else {
      orderByCol = sortOrder === 'asc' ? asc(transactions.date) : desc(transactions.date);
    }

    query = query.orderBy(orderByCol);

    if (options?.limit !== undefined) {
      query = query.limit(options.limit);
    }
    if (options?.offset !== undefined) {
      query = query.offset(options.offset);
    }

    const dbTransactions = await query;
    return dbTransactions.map(t => ({
      id: t.id,
      amountCents: t.amount_cents,
      date: t.date,
      description: t.description ?? undefined,
      accountId: t.account_id,
      categoryId: t.category_id ?? undefined,
      type: t.type as any,
      status: t.status as any,
      tags: typeof t.tags === 'string' ? JSON.parse(t.tags) : [],
      attachmentPath: t.attachment_path ?? undefined,
      recurrenceId: t.recurrence_id ?? undefined,
      createdAt: t.created_at,
    }));
  }

  async getTransactionById(id: string): Promise<Transaction | null> {
    const rows = await db.select().from(transactions).where(eq(transactions.id, id));
    if (rows.length === 0) return null;
    const t = rows[0]!;
    return {
      id: t.id,
      amountCents: t.amount_cents,
      date: t.date,
      description: t.description ?? undefined,
      accountId: t.account_id,
      categoryId: t.category_id ?? undefined,
      type: t.type as any,
      status: t.status as any,
      tags: typeof t.tags === 'string' ? JSON.parse(t.tags) : [],
      attachmentPath: t.attachment_path ?? undefined,
      recurrenceId: t.recurrence_id ?? undefined,
      createdAt: t.created_at,
    };
  }

  private getTransactionBalanceDelta(t: { type: string; amountCents?: number; amount_cents?: number; tags?: string[] | string | null; description?: string | null; status?: string }): number {
    if (t.status === 'PENDING') {
      return 0;
    }
    const amount = Math.abs(t.amountCents ?? t.amount_cents ?? 0);
    const isTrIn = this.isTransferIn(t);
    if (t.type === 'INCOME' || (t.type === 'TRANSFER' && isTrIn)) {
      return amount;
    }
    return -amount;
  }

  async createTransaction(transaction: Omit<Transaction, 'id' | 'createdAt'>): Promise<Transaction> {
    const id = crypto.randomUUID();
    const now = new Date();

    const [newTransaction] = await db.insert(transactions).values({
      id,
      amount_cents: transaction.amountCents,
      date: transaction.date,
      description: transaction.description ?? null,
      account_id: transaction.accountId,
      category_id: transaction.categoryId ?? null,
      type: transaction.type,
      status: transaction.status,
      tags: JSON.stringify(transaction.tags || []),
      attachment_path: transaction.attachmentPath ?? null,
      recurrence_id: transaction.recurrenceId ?? null,
      created_at: now,
    }).returning();

    // Atualiza saldo da conta correspondente
    const delta = this.getTransactionBalanceDelta(transaction);
    await this.applyBalanceDelta(transaction.accountId, delta);

    return {
      id: newTransaction!.id,
      amountCents: newTransaction!.amount_cents,
      date: newTransaction!.date,
      description: newTransaction!.description ?? undefined,
      accountId: newTransaction!.account_id,
      categoryId: newTransaction!.category_id ?? undefined,
      type: newTransaction!.type as any,
      status: newTransaction!.status as any,
      tags: transaction.tags || [],
      attachmentPath: newTransaction!.attachment_path ?? undefined,
      recurrenceId: newTransaction!.recurrence_id ?? undefined,
      createdAt: newTransaction!.created_at,
    };
  }

  async createManyTransactions(txList: Omit<Transaction, 'id' | 'createdAt'>[]): Promise<Transaction[]> {
    if (txList.length === 0) return [];
    const now = new Date();
    const created: Transaction[] = [];

    for (const transaction of txList) {
      const id = crypto.randomUUID();
      const [newTransaction] = await db.insert(transactions).values({
        id,
        amount_cents: transaction.amountCents,
        date: transaction.date,
        description: transaction.description ?? null,
        account_id: transaction.accountId,
        category_id: transaction.categoryId ?? null,
        type: transaction.type,
        status: transaction.status,
        tags: JSON.stringify(transaction.tags || []),
        attachment_path: transaction.attachmentPath ?? null,
        recurrence_id: transaction.recurrenceId ?? null,
        created_at: now,
      }).returning();

      const delta = this.getTransactionBalanceDelta(transaction);
      await this.applyBalanceDelta(transaction.accountId, delta);

      created.push({
        id: newTransaction!.id,
        amountCents: newTransaction!.amount_cents,
        date: newTransaction!.date,
        description: newTransaction!.description ?? undefined,
        accountId: newTransaction!.account_id,
        categoryId: newTransaction!.category_id ?? undefined,
        type: newTransaction!.type as any,
        status: newTransaction!.status as any,
        tags: transaction.tags || [],
        attachmentPath: newTransaction!.attachment_path ?? undefined,
        recurrenceId: newTransaction!.recurrence_id ?? undefined,
        createdAt: newTransaction!.created_at,
      });
    }

    return created;
  }

  async updateTransaction(id: string, transaction: Partial<Omit<Transaction, 'id' | 'createdAt'>>): Promise<Transaction | null> {
    const existing = await this.getTransactionById(id);
    if (existing) {
      // Reverte efeito anterior
      const reverseDelta = -this.getTransactionBalanceDelta(existing);
      await this.applyBalanceDelta(existing.accountId, reverseDelta);
    }

    const updateData: any = {};
    if (transaction.amountCents !== undefined) updateData.amount_cents = transaction.amountCents;
    if (transaction.date !== undefined) updateData.date = transaction.date;
    if (transaction.description !== undefined) updateData.description = transaction.description ?? null;
    if (transaction.accountId !== undefined) updateData.account_id = transaction.accountId;
    if (transaction.categoryId !== undefined) updateData.category_id = transaction.categoryId ?? null;
    if (transaction.type !== undefined) updateData.type = transaction.type;
    if (transaction.status !== undefined) updateData.status = transaction.status;
    if (transaction.tags !== undefined) updateData.tags = JSON.stringify(transaction.tags);
    if (transaction.attachmentPath !== undefined) updateData.attachment_path = transaction.attachmentPath ?? null;
    if (transaction.recurrenceId !== undefined) updateData.recurrence_id = transaction.recurrenceId ?? null;

    const [updatedTransaction] = await db.update(transactions).set(updateData).where(eq(transactions.id, id)).returning();

    if (!updatedTransaction) return null;

    // Aplica novo efeito
    const targetAccountId = updatedTransaction.account_id;
    const newDelta = this.getTransactionBalanceDelta(updatedTransaction);
    await this.applyBalanceDelta(targetAccountId, newDelta);

    return {
      id: updatedTransaction.id,
      amountCents: updatedTransaction.amount_cents,
      date: updatedTransaction.date,
      description: updatedTransaction.description ?? undefined,
      accountId: updatedTransaction.account_id,
      categoryId: updatedTransaction.category_id ?? undefined,
      type: updatedTransaction.type as any,
      status: updatedTransaction.status as any,
      tags: typeof updatedTransaction.tags === 'string' ? JSON.parse(updatedTransaction.tags) : [],
      attachmentPath: updatedTransaction.attachment_path ?? undefined,
      recurrenceId: updatedTransaction.recurrence_id ?? undefined,
      createdAt: updatedTransaction.created_at,
    };
  }

  async deleteTransaction(id: string): Promise<boolean> {
    const existing = await this.getTransactionById(id);
    if (existing) {
      const reverseDelta = -this.getTransactionBalanceDelta(existing);
      await this.applyBalanceDelta(existing.accountId, reverseDelta);
    }

    const result = await db.delete(transactions).where(eq(transactions.id, id));
    return (result as any).changes > 0 || (result as any).rowCount > 0;
  }
}
