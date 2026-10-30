import { db, categories } from '../services/db';
import { eq } from 'drizzle-orm';
import { Category } from '../../domain/entities/category';

export class CategoriesRepository {
  async getAllCategories(): Promise<Category[]> {
    const dbCategories = await db.select().from(categories);
    return dbCategories.map(cat => ({
      id: cat.id,
      name: cat.name,
      group: cat.group,
      icon: cat.icon,
      color: cat.color,
      type: cat.type as any, // Assuming it matches TransactionType
      parentId: cat.parent_id,
      createdAt: cat.created_at,
    }));
  }

  async getCategoryById(id: string): Promise<Category | null> {
    const dbCategories = await db.select().from(categories).where(eq(categories.id, id));
    if (dbCategories.length === 0) return null;
    const cat = dbCategories[0];
    return {
      id: cat.id,
      name: cat.name,
      group: cat.group,
      icon: cat.icon,
      color: cat.color,
      type: cat.type as any,
      parentId: cat.parent_id,
      createdAt: cat.created_at,
    };
  }

  async createCategory(category: Omit<Category, 'id' | 'createdAt'>): Promise<Category> {
    const id = crypto.randomUUID ? crypto.randomUUID() : String(Date.now());
    const [newCategory] = await db.insert(categories).values({
      id,
      name: category.name,
      group: category.group,
      icon: category.icon,
      color: category.color,
      type: category.type,
      parent_id: category.parentId,
    }).returning();
    
    return {
      id: newCategory.id,
      name: newCategory.name,
      group: newCategory.group,
      icon: newCategory.icon,
      color: newCategory.color,
      type: newCategory.type as any,
      parentId: newCategory.parent_id,
      createdAt: newCategory.created_at,
    };
  }

  async updateCategory(id: string, category: Partial<Omit<Category, 'id' | 'createdAt'>>): Promise<Category | null> {
    const updateData: any = {};
    if (category.name !== undefined) updateData.name = category.name;
    if (category.group !== undefined) updateData.group = category.group;
    if (category.icon !== undefined) updateData.icon = category.icon;
    if (category.color !== undefined) updateData.color = category.color;
    if (category.type !== undefined) updateData.type = category.type;
    if (category.parentId !== undefined) updateData.parent_id = category.parentId;
    // Note: We don't update created_at

    const [updatedCategory] = await db.update(categories).set(updateData).where(eq(categories.id, id)).returning();
    
    if (!updatedCategory) return null;
    return {
      id: updatedCategory.id,
      name: updatedCategory.name,
      group: updatedCategory.group,
      icon: updatedCategory.icon,
      color: updatedCategory.color,
      type: updatedCategory.type as any,
      parentId: updatedCategory.parent_id,
      createdAt: updatedCategory.created_at,
    };
  }

  async deleteCategory(id: string): Promise<boolean> {
    // Note: We should consider what happens to transactions and recurrences that reference this category.
    // For now, we just delete. In a real app, we might want to set to null or prevent deletion if used.
    const result = await db.delete(categories).where(eq(categories.id, id));
    return (result as any).changes > 0 || (result as any).rowCount > 0 || (result as any).count > 0;
  }
}
