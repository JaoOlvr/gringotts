import { 
  sqliteTable, 
  text, 
  integer, 
} from 'drizzle-orm/sqlite-core';
import { relations } from 'drizzle-orm';

// Accounts table
export const accounts = sqliteTable('accounts', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  type: text('type').notNull(), // 'checking', 'savings', 'credit_card', 'cash', 'investment', 'loan'
  balance_cents: integer('balance_cents').notNull().default(0),
  currency: text('currency').notNull().default('BRL'),
  color: text('color'),
  icon: text('icon'),
  is_active: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  is_locked: integer('is_locked', { mode: 'boolean' }).notNull().default(false),
  lock_type: text('lock_type'), // 'PIN' | 'PASSWORD'
  password_hash: text('password_hash'),
  salt: text('salt'),
  created_at: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updated_at: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

// Categories table
export const categories = sqliteTable('categories', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  group: text('group'),
  icon: text('icon'),
  color: text('color'),
  type: text('type').notNull(), // 'INCOME' or 'EXPENSE'
  parent_id: text('parent_id'),
  created_at: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

// Transactions table
export const transactions = sqliteTable('transactions', {
  id: text('id').primaryKey(),
  amount_cents: integer('amount_cents').notNull(),
  date: integer('date', { mode: 'timestamp' }).notNull(),
  description: text('description'),
  account_id: text('account_id').notNull(),
  category_id: text('category_id'),
  type: text('type').notNull(), // 'INCOME', 'EXPENSE', 'TRANSFER'
  status: text('status').notNull().default('PENDING'), // PENDING, PAID, RECONCILED
  tags: text('tags'), // JSON stringified array
  attachment_path: text('attachment_path'),
  recurrence_id: text('recurrence_id'),
  created_at: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

// Transfers table
export const transfers = sqliteTable('transfers', {
  id: text('id').primaryKey(),
  transaction_id: text('transaction_id').notNull(),
  from_account_id: text('from_account_id').notNull(),
  to_account_id: text('to_account_id').notNull(),
  created_at: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

// Recurrences table
export const recurrences = sqliteTable('recurrences', {
  id: text('id').primaryKey(),
  frequency: text('frequency').notNull(), // DAILY, WEEKLY, MONTHLY, YEARLY
  interval: integer('interval').notNull().default(1),
  start_date: integer('start_date', { mode: 'timestamp' }).notNull(),
  end_date: integer('end_date', { mode: 'timestamp' }),
  amount_cents: integer('amount_cents').notNull(),
  category_id: text('category_id').notNull(),
  account_id: text('account_id').notNull(),
  type: text('type').notNull(),
  created_at: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

// Budgets table
export const budgets = sqliteTable('budgets', {
  id: text('id').primaryKey(),
  category_id: text('category_id').notNull(),
  amount_cents: integer('amount_cents').notNull(),
  month: integer('month').notNull(),
  year: integer('year').notNull(),
  created_at: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

// Goals table
export const goals = sqliteTable('goals', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  target_amount_cents: integer('target_amount_cents').notNull(),
  current_amount_cents: integer('current_amount_cents').notNull().default(0),
  deadline: integer('deadline', { mode: 'timestamp' }),
  color: text('color'),
  created_at: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

// Credit Card Bills table
export const creditCardBills = sqliteTable('creditCardBills', {
  id: text('id').primaryKey(),
  account_id: text('account_id').notNull(),
  closing_date: integer('closing_date', { mode: 'timestamp' }).notNull(),
  due_date: integer('due_date', { mode: 'timestamp' }).notNull(),
  is_closed: integer('is_closed', { mode: 'boolean' }).notNull().default(false),
  created_at: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

// Relations
export const accountsRelations = relations(accounts, ({ many }) => ({
  transactions: many(transactions),
}));

export const categoriesRelations = relations(categories, ({ many }) => ({
  transactions: many(transactions),
  budgets: many(budgets),
}));

export const transactionsRelations = relations(transactions, ({ one }) => ({
  account: one(accounts, {
    fields: [transactions.account_id],
    references: [accounts.id],
  }),
  category: one(categories, {
    fields: [transactions.category_id],
    references: [categories.id],
  }),
}));
