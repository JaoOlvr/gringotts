import { 
  db, 
  accounts, 
  categories, 
  transactions, 
  budgets, 
  goals, 
  debts, 
  eq 
} from '../db';
import { TransactionsRepository } from '../../repositories/transactionsRepository';
import os from 'node:os';

export interface SyncDataset {
  deviceId: string;
  deviceName: string;
  exportedAt: number;
  accounts: any[];
  categories: any[];
  transactions: any[];
  budgets: any[];
  goals: any[];
  debts: any[];
}

export interface SyncMergeResult {
  success: boolean;
  accountsMerged: number;
  categoriesMerged: number;
  transactionsMerged: number;
  debtsMerged: number;
  budgetsMerged: number;
  goalsMerged: number;
  totalMerged: number;
}

export class SyncDataEngine {
  private transactionsRepo = new TransactionsRepository();

  /**
   * Exporta todo o conjunto de dados para sincronização
   */
  async exportSyncDataset(): Promise<SyncDataset> {
    const allAccounts = await db.select().from(accounts);
    const allCategories = await db.select().from(categories);
    const allTransactions = await db.select().from(transactions);
    const allBudgets = await db.select().from(budgets);
    const allGoals = await db.select().from(goals);
    const allDebts = await db.select().from(debts);

    return {
      deviceId: `${os.hostname()}-${os.platform()}`,
      deviceName: os.hostname(),
      exportedAt: Date.now(),
      accounts: allAccounts.map((a) => ({
        ...a,
        created_at: a.created_at ? new Date(a.created_at).getTime() : Date.now(),
        updated_at: a.updated_at ? new Date(a.updated_at).getTime() : Date.now(),
      })),
      categories: allCategories.map((c) => ({
        ...c,
        created_at: c.created_at ? new Date(c.created_at).getTime() : Date.now(),
      })),
      transactions: allTransactions.map((t) => ({
        ...t,
        date: t.date ? new Date(t.date).getTime() : Date.now(),
        created_at: t.created_at ? new Date(t.created_at).getTime() : Date.now(),
      })),
      budgets: allBudgets.map((b) => ({
        ...b,
        created_at: b.created_at ? new Date(b.created_at).getTime() : Date.now(),
      })),
      goals: allGoals.map((g) => ({
        ...g,
        deadline: g.deadline ? new Date(g.deadline).getTime() : null,
        created_at: g.created_at ? new Date(g.created_at).getTime() : Date.now(),
      })),
      debts: allDebts.map((d) => ({
        ...d,
        created_at: d.created_at ? new Date(d.created_at).getTime() : Date.now(),
        updated_at: d.updated_at ? new Date(d.updated_at).getTime() : Date.now(),
      })),
    };
  }

  /**
   * Mescla com segurança o conjunto de dados recebido de outro dispositivo
   */
  async mergeSyncDataset(remote: SyncDataset): Promise<SyncMergeResult> {
    let accountsMerged = 0;
    let categoriesMerged = 0;
    let transactionsMerged = 0;
    let debtsMerged = 0;
    let budgetsMerged = 0;
    let goalsMerged = 0;

    // 1. Sincronizar Categorias
    if (Array.isArray(remote.categories)) {
      for (const cat of remote.categories) {
        if (!cat.id || !cat.name) continue;
        const existing = await db.select().from(categories).where(eq(categories.id, cat.id));
        if (existing.length === 0) {
          await db.insert(categories).values({
            id: cat.id,
            name: cat.name,
            group: cat.group ?? null,
            icon: cat.icon ?? null,
            color: cat.color ?? null,
            type: cat.type,
            parent_id: cat.parent_id ?? null,
            created_at: new Date(cat.created_at || Date.now()),
          });
          categoriesMerged++;
        }
      }
    }

    // 2. Sincronizar Contas
    if (Array.isArray(remote.accounts)) {
      for (const acc of remote.accounts) {
        if (!acc.id || !acc.name) continue;
        const existing = await db.select().from(accounts).where(eq(accounts.id, acc.id));
        if (existing.length === 0) {
          await db.insert(accounts).values({
            id: acc.id,
            name: acc.name,
            type: acc.type,
            balance_cents: acc.balance_cents || 0,
            currency: acc.currency || 'BRL',
            color: acc.color ?? null,
            icon: acc.icon ?? null,
            is_active: acc.is_active ?? true,
            include_in_total: acc.include_in_total ?? true,
            is_locked: false, // Mantém desbloqueada localmente até configuração do usuário
            lock_type: null,
            password_hash: null,
            salt: null,
            created_at: new Date(acc.created_at || Date.now()),
            updated_at: new Date(acc.updated_at || Date.now()),
          });
          accountsMerged++;
        } else {
          // Atualiza se remoto for mais recente
          const localUpdated = new Date(existing[0]!.updated_at).getTime();
          const remoteUpdated = Number(acc.updated_at) || 0;
          if (remoteUpdated > localUpdated) {
            await db.update(accounts).set({
              name: acc.name,
              type: acc.type,
              color: acc.color ?? existing[0]!.color,
              include_in_total: acc.include_in_total ?? existing[0]!.include_in_total,
              updated_at: new Date(remoteUpdated),
            }).where(eq(accounts.id, acc.id));
            accountsMerged++;
          }
        }
      }
    }

    // 3. Sincronizar Transações
    if (Array.isArray(remote.transactions)) {
      for (const tx of remote.transactions) {
        if (!tx.id || !tx.account_id) continue;
        const existing = await db.select().from(transactions).where(eq(transactions.id, tx.id));
        if (existing.length === 0) {
          await db.insert(transactions).values({
            id: tx.id,
            amount_cents: tx.amount_cents,
            date: new Date(tx.date || Date.now()),
            description: tx.description ?? null,
            account_id: tx.account_id,
            category_id: tx.category_id ?? null,
            type: tx.type,
            status: tx.status || 'PAID',
            tags: typeof tx.tags === 'string' ? tx.tags : JSON.stringify(tx.tags || []),
            attachment_path: tx.attachment_path ?? null,
            recurrence_id: tx.recurrence_id ?? null,
            created_at: new Date(tx.created_at || Date.now()),
          });
          transactionsMerged++;
        }
      }
    }

    // 4. Sincronizar Dívidas
    if (Array.isArray(remote.debts)) {
      for (const debt of remote.debts) {
        if (!debt.id || !debt.name) continue;
        const existing = await db.select().from(debts).where(eq(debts.id, debt.id));
        if (existing.length === 0) {
          await db.insert(debts).values({
            id: debt.id,
            name: debt.name,
            creditor: debt.creditor ?? null,
            total_amount_cents: debt.total_amount_cents,
            remaining_amount_cents: debt.remaining_amount_cents,
            interest_rate_monthly: debt.interest_rate_monthly || 0,
            minimum_payment_cents: debt.minimum_payment_cents || 0,
            due_day: debt.due_day ?? null,
            category_id: debt.category_id ?? null,
            color: debt.color ?? null,
            notes: debt.notes ?? null,
            is_paid: Boolean(debt.is_paid),
            created_at: new Date(debt.created_at || Date.now()),
            updated_at: new Date(debt.updated_at || Date.now()),
          });
          debtsMerged++;
        } else {
          const localUpdated = new Date(existing[0]!.updated_at).getTime();
          const remoteUpdated = Number(debt.updated_at) || 0;
          if (remoteUpdated > localUpdated) {
            await db.update(debts).set({
              name: debt.name,
              remaining_amount_cents: debt.remaining_amount_cents,
              is_paid: Boolean(debt.is_paid),
              updated_at: new Date(remoteUpdated),
            }).where(eq(debts.id, debt.id));
            debtsMerged++;
          }
        }
      }
    }

    // 5. Sincronizar Metas
    if (Array.isArray(remote.goals)) {
      for (const g of remote.goals) {
        if (!g.id || !g.name) continue;
        const existing = await db.select().from(goals).where(eq(goals.id, g.id));
        if (existing.length === 0) {
          await db.insert(goals).values({
            id: g.id,
            name: g.name,
            target_amount_cents: g.target_amount_cents,
            current_amount_cents: g.current_amount_cents || 0,
            deadline: g.deadline ? new Date(g.deadline) : null,
            color: g.color ?? null,
            created_at: new Date(g.created_at || Date.now()),
          });
          goalsMerged++;
        }
      }
    }

    // 6. Recalcular saldos de todas as contas para manter integridade contábil perfeita
    await this.transactionsRepo.recalculateAllAccountBalances();

    const totalMerged = 
      accountsMerged + 
      categoriesMerged + 
      transactionsMerged + 
      debtsMerged + 
      budgetsMerged + 
      goalsMerged;

    return {
      success: true,
      accountsMerged,
      categoriesMerged,
      transactionsMerged,
      debtsMerged,
      budgetsMerged,
      goalsMerged,
      totalMerged,
    };
  }
}

export const syncDataEngine = new SyncDataEngine();

