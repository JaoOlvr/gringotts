import { db, budgets } from '../services/db';
import { eq, and } from 'drizzle-orm';
import crypto from 'node:crypto';

export interface Budget {
  id: string;
  categoryId: string;
  amountCents: number;
  month: number; // 1-12
  year: number;
  createdAt: Date;
}

export class BudgetsRepository {
  async getAllBudgets(): Promise<Budget[]> {
    const dbBudgets = await db.select().from(budgets);
    return dbBudgets.map(b => ({
      id: b.id,
      categoryId: b.category_id,
      amountCents: b.amount_cents,
      month: b.month,
      year: b.year,
      createdAt: b.created_at,
    }));
  }

  async getBudgetById(id: string): Promise<Budget | null> {
    const dbBudgets = await db.select().from(budgets).where(eq(budgets.id, id));
    if (dbBudgets.length === 0) return null;
    const b = dbBudgets[0];
    return {
      id: b.id,
      categoryId: b.category_id,
      amountCents: b.amount_cents,
      month: b.month,
      year: b.year,
      createdAt: b.created_at,
    };
  }

  async getBudgetForCategoryMonthYear(categoryId: string, month: number, year: number): Promise<Budget | null> {
    const dbBudgets = await db.select().from(budgets).where(
      and(
        eq(budgets.category_id, categoryId),
        eq(budgets.month, month),
        eq(budgets.year, year)
      )
    );
    if (dbBudgets.length === 0) return null;
    const b = dbBudgets[0];
    return {
      id: b.id,
      categoryId: b.category_id,
      amountCents: b.amount_cents,
      month: b.month,
      year: b.year,
      createdAt: b.created_at,
    };
  }

  async createBudget(budget: Omit<Budget, 'id' | 'createdAt'>): Promise<Budget> {
    // Se já existir um orçamento para esta categoria no mês/ano, atualiza o teto
    const existing = await this.getBudgetForCategoryMonthYear(budget.categoryId, budget.month, budget.year);
    if (existing) {
      const updated = await this.updateBudget(existing.id, { amountCents: budget.amountCents });
      if (updated) return updated;
    }

    const id = crypto.randomUUID();
    const now = new Date();
    const [newBudget] = await db.insert(budgets).values({
      id,
      category_id: budget.categoryId,
      amount_cents: budget.amountCents,
      month: budget.month,
      year: budget.year,
      created_at: now,
    }).returning();
    
    return {
      id: newBudget.id,
      categoryId: newBudget.category_id,
      amountCents: newBudget.amount_cents,
      month: newBudget.month,
      year: newBudget.year,
      createdAt: newBudget.created_at,
    };
  }

  async updateBudget(id: string, budget: Partial<Omit<Budget, 'id' | 'createdAt'>>): Promise<Budget | null> {
    const updateData: any = {};
    if (budget.categoryId !== undefined) updateData.category_id = budget.categoryId;
    if (budget.amountCents !== undefined) updateData.amount_cents = budget.amountCents;
    if (budget.month !== undefined) updateData.month = budget.month;
    if (budget.year !== undefined) updateData.year = budget.year;
    // Note: We don't update created_at

    const [updatedBudget] = await db.update(budgets).set(updateData).where(eq(budgets.id, id)).returning();
    
    if (!updatedBudget) return null;
    return {
      id: updatedBudget.id,
      categoryId: updatedBudget.category_id,
      amountCents: updatedBudget.amount_cents,
      month: updatedBudget.month,
      year: updatedBudget.year,
      createdAt: updatedBudget.created_at,
    };
  }

  async deleteBudget(id: string): Promise<boolean> {
    const result = await db.delete(budgets).where(eq(budgets.id, id));
    return (result as any).changes > 0 || (result as any).rowCount > 0 || (result as any).count > 0;
  }
}
