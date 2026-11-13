import { db, debts } from '../services/db';
import { eq, asc, desc } from 'drizzle-orm';
import crypto from 'node:crypto';

export interface Debt {
  id: string;
  name: string;
  creditor?: string;
  totalAmountCents: number;
  remainingAmountCents: number;
  interestRateMonthly: number; // e.g. 1.99 (%)
  minimumPaymentCents: number;
  dueDay?: number;
  categoryId?: string;
  color?: string;
  notes?: string;
  isPaid: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class DebtsRepository {
  async getAllDebts(): Promise<Debt[]> {
    const rows = await db.select().from(debts).orderBy(asc(debts.is_paid), desc(debts.created_at));
    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      creditor: row.creditor ?? undefined,
      totalAmountCents: row.total_amount_cents,
      remainingAmountCents: row.remaining_amount_cents,
      interestRateMonthly: row.interest_rate_monthly,
      minimumPaymentCents: row.minimum_payment_cents,
      dueDay: row.due_day ?? undefined,
      categoryId: row.category_id ?? undefined,
      color: row.color ?? undefined,
      notes: row.notes ?? undefined,
      isPaid: Boolean(row.is_paid),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }

  async getDebtById(id: string): Promise<Debt | null> {
    const rows = await db.select().from(debts).where(eq(debts.id, id));
    if (rows.length === 0) return null;
    const row = rows[0]!;
    return {
      id: row.id,
      name: row.name,
      creditor: row.creditor ?? undefined,
      totalAmountCents: row.total_amount_cents,
      remainingAmountCents: row.remaining_amount_cents,
      interestRateMonthly: row.interest_rate_monthly,
      minimumPaymentCents: row.minimum_payment_cents,
      dueDay: row.due_day ?? undefined,
      categoryId: row.category_id ?? undefined,
      color: row.color ?? undefined,
      notes: row.notes ?? undefined,
      isPaid: Boolean(row.is_paid),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async createDebt(debt: Omit<Debt, 'id' | 'createdAt' | 'updatedAt'>): Promise<Debt> {
    const id = crypto.randomUUID();
    const now = new Date();

    const [newDebt] = await db
      .insert(debts)
      .values({
        id,
        name: debt.name,
        creditor: debt.creditor ?? null,
        total_amount_cents: debt.totalAmountCents,
        remaining_amount_cents: debt.remainingAmountCents,
        interest_rate_monthly: debt.interestRateMonthly || 0,
        minimum_payment_cents: debt.minimumPaymentCents || 0,
        due_day: debt.dueDay ?? null,
        category_id: debt.categoryId ?? null,
        color: debt.color ?? null,
        notes: debt.notes ?? null,
        is_paid: debt.remainingAmountCents <= 0 ? true : Boolean(debt.isPaid),
        created_at: now,
        updated_at: now,
      })
      .returning();

    return {
      id: newDebt!.id,
      name: newDebt!.name,
      creditor: newDebt!.creditor ?? undefined,
      totalAmountCents: newDebt!.total_amount_cents,
      remainingAmountCents: newDebt!.remaining_amount_cents,
      interestRateMonthly: newDebt!.interest_rate_monthly,
      minimumPaymentCents: newDebt!.minimum_payment_cents,
      dueDay: newDebt!.due_day ?? undefined,
      categoryId: newDebt!.category_id ?? undefined,
      color: newDebt!.color ?? undefined,
      notes: newDebt!.notes ?? undefined,
      isPaid: Boolean(newDebt!.is_paid),
      createdAt: newDebt!.created_at,
      updatedAt: newDebt!.updated_at,
    };
  }

  async updateDebt(id: string, updates: Partial<Omit<Debt, 'id' | 'createdAt'>>): Promise<Debt | null> {
    const now = new Date();
    const updateData: any = { updated_at: now };

    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.creditor !== undefined) updateData.creditor = updates.creditor;
    if (updates.totalAmountCents !== undefined) updateData.total_amount_cents = updates.totalAmountCents;
    if (updates.remainingAmountCents !== undefined) {
      updateData.remaining_amount_cents = Math.max(0, updates.remainingAmountCents);
      if (updates.remainingAmountCents <= 0) {
        updateData.is_paid = true;
      }
    }
    if (updates.interestRateMonthly !== undefined) updateData.interest_rate_monthly = updates.interestRateMonthly;
    if (updates.minimumPaymentCents !== undefined) updateData.minimum_payment_cents = updates.minimumPaymentCents;
    if (updates.dueDay !== undefined) updateData.due_day = updates.dueDay;
    if (updates.categoryId !== undefined) updateData.category_id = updates.categoryId;
    if (updates.color !== undefined) updateData.color = updates.color;
    if (updates.notes !== undefined) updateData.notes = updates.notes;
    if (updates.isPaid !== undefined) updateData.is_paid = updates.isPaid;

    const [updated] = await db.update(debts).set(updateData).where(eq(debts.id, id)).returning();
    if (!updated) return null;

    return {
      id: updated.id,
      name: updated.name,
      creditor: updated.creditor ?? undefined,
      totalAmountCents: updated.total_amount_cents,
      remainingAmountCents: updated.remaining_amount_cents,
      interestRateMonthly: updated.interest_rate_monthly,
      minimumPaymentCents: updated.minimum_payment_cents,
      dueDay: updated.due_day ?? undefined,
      categoryId: updated.category_id ?? undefined,
      color: updated.color ?? undefined,
      notes: updated.notes ?? undefined,
      isPaid: Boolean(updated.is_paid),
      createdAt: updated.created_at,
      updatedAt: updated.updated_at,
    };
  }

  async recordPayment(id: string, paymentAmountCents: number): Promise<Debt | null> {
    const existing = await this.getDebtById(id);
    if (!existing) return null;

    const newRemaining = Math.max(0, existing.remainingAmountCents - paymentAmountCents);
    const isPaid = newRemaining === 0;

    return this.updateDebt(id, {
      remainingAmountCents: newRemaining,
      isPaid,
    });
  }

  async deleteDebt(id: string): Promise<boolean> {
    const deleted = await db.delete(debts).where(eq(debts.id, id)).returning();
    return deleted.length > 0;
  }
}
