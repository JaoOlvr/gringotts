import { ipcMain } from 'electron';
import { z } from 'zod';
import { CategoriesRepository } from '../../repositories/categoriesRepository';

// Initialize the repository
const categoriesRepository = new CategoriesRepository();

// Define Zod schemas for validation
const categorySchema = z.object({
  name: z.string().min(1, 'Category name is required'),
  group: z.string().optional(),
  icon: z.string().optional(),
  color: z.string().optional(),
  type: z.enum(['INCOME', 'EXPENSE']),
  parentId: z.string().optional().nullable(), // Allow null for top-level categories
});

// For update, we allow partial
const updateCategorySchema = categorySchema.partial();

// Handler functions
export function registerCategoriesHandlers() {
  // Get all categories
  ipcMain.handle('categories:getAll', async () => {
    return await categoriesRepository.getAllCategories();
  });

  // Get category by id
  ipcMain.handle('categories:getById', async (event, id: string) => {
    return await categoriesRepository.getCategoryById(id);
  });

  // Create category
  ipcMain.handle('categories:create', async (event, categoryData: unknown) => {
    // Validate input
    const parsed = categorySchema.parse(categoryData);
    return await categoriesRepository.createCategory(parsed);
  });

  // Update category
  ipcMain.handle('categories:update', async (event, { id, categoryData }: { id: string; categoryData: unknown }) => {
    // Validate input
    const parsed = updateCategorySchema.parse(categoryData);
    return await categoriesRepository.updateCategory(id, parsed);
  });

  // Delete category
  ipcMain.handle('categories:delete', async (event, id: string) => {
    return await categoriesRepository.deleteCategory(id);
  });
}
