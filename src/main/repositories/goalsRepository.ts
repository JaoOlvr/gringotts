import { db, goals } from '../services/db';
import { eq } from 'drizzle-orm';
import crypto from 'node:crypto';

export interface Goal {
  id: string;
  name: string;
  targetAmountCents: number;
  currentAmountCents: number;
  deadline: Date | null;
  color?: string;
  createdAt: Date;
}

export class GoalsRepository {
  async getAllGoals(): Promise<Goal[]> {
    const dbGoals = await db.select().from(goals);
    return dbGoals.map(g => ({
      id: g.id,
      name: g.name,
      targetAmountCents: g.target_amount_cents,
      currentAmountCents: g.current_amount_cents,
      deadline: g.deadline,
      color: g.color,
      createdAt: g.created_at,
    }));
  }

  async getGoalById(id: string): Promise<Goal | null> {
    const dbGoals = await db.select().from(goals).where(eq(goals.id, id));
    if (dbGoals.length === 0) return null;
    const g = dbGoals[0];
    return {
      id: g.id,
      name: g.name,
      targetAmountCents: g.target_amount_cents,
      currentAmountCents: g.current_amount_cents,
      deadline: g.deadline,
      color: g.color,
      createdAt: g.created_at,
    };
  }

  async createGoal(goal: Omit<Goal, 'id' | 'createdAt'>): Promise<Goal> {
    const id = crypto.randomUUID();
    const now = new Date();
    const [newGoal] = await db.insert(goals).values({
      id,
      name: goal.name,
      target_amount_cents: goal.targetAmountCents,
      current_amount_cents: goal.currentAmountCents,
      deadline: goal.deadline ?? null,
      color: goal.color,
      created_at: now,
    }).returning();
    
    return {
      id: newGoal.id,
      name: newGoal.name,
      targetAmountCents: newGoal.target_amount_cents,
      currentAmountCents: newGoal.current_amount_cents,
      deadline: newGoal.deadline,
      color: newGoal.color,
      createdAt: newGoal.created_at,
    };
  }

  async updateGoal(id: string, goal: Partial<Omit<Goal, 'id' | 'createdAt'>>): Promise<Goal | null> {
    const updateData: any = {};
    if (goal.name !== undefined) updateData.name = goal.name;
    if (goal.targetAmountCents !== undefined) updateData.target_amount_cents = goal.targetAmountCents;
    if (goal.currentAmountCents !== undefined) updateData.current_amount_cents = goal.currentAmountCents;
    if (goal.deadline !== undefined) updateData.deadline = goal.deadline ?? null;
    if (goal.color !== undefined) updateData.color = goal.color;

    const [updatedGoal] = await db.update(goals).set(updateData).where(eq(goals.id, id)).returning();
    
    if (!updatedGoal) return null;
    return {
      id: updatedGoal.id,
      name: updatedGoal.name,
      targetAmountCents: updatedGoal.target_amount_cents,
      currentAmountCents: updatedGoal.current_amount_cents,
      deadline: updatedGoal.deadline,
      color: updatedGoal.color,
      createdAt: updatedGoal.created_at,
    };
  }

  async deleteGoal(id: string): Promise<boolean> {
    const result = await db.delete(goals).where(eq(goals.id, id));
    return (result as any).changes > 0 || (result as any).rowCount > 0 || (result as any).count > 0;
  }

  // Add amount to goal (for savings)
  async addToGoal(id: string, amountCents: number): Promise<Goal | null> {
    const goal = await this.getGoalById(id);
    if (!goal) return null;
    
    const newCurrentAmount = Math.max(0, goal.currentAmountCents + amountCents);
    return await this.updateGoal(id, { currentAmountCents: newCurrentAmount });
  }
}
