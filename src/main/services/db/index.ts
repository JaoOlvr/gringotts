import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import { accounts, categories, transactions, transfers, recurrences, budgets, goals, creditCardBills } from './schema';
import { eq } from 'drizzle-orm';
import path from 'node:path';
import { app } from 'electron';
import fs from 'node:fs';

// Path to the database file in the user's data directory
const userDataPath = app ? app.getPath('userData') : process.cwd();
if (!fs.existsSync(userDataPath)) {
  fs.mkdirSync(userDataPath, { recursive: true });
}

const dbPath = path.join(userDataPath, 'database.sqlite');

// Initialize the database connection
const sqlite = new Database(dbPath);
export const db = drizzle(sqlite);

// Run initial schema creation and migrations
export function runMigrations() {
  try {
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS accounts (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        balance_cents INTEGER NOT NULL DEFAULT 0,
        currency TEXT NOT NULL DEFAULT 'BRL',
        color TEXT,
        icon TEXT,
        is_active INTEGER NOT NULL DEFAULT 1,
        include_in_total INTEGER NOT NULL DEFAULT 1,
        is_locked INTEGER NOT NULL DEFAULT 0,
        lock_type TEXT,
        password_hash TEXT,
        salt TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS categories (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        "group" TEXT,
        icon TEXT,
        color TEXT,
        type TEXT NOT NULL,
        parent_id TEXT,
        created_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS recurrences (
        id TEXT PRIMARY KEY,
        frequency TEXT NOT NULL,
        interval INTEGER NOT NULL DEFAULT 1,
        start_date INTEGER NOT NULL,
        end_date INTEGER,
        amount_cents INTEGER NOT NULL,
        category_id TEXT NOT NULL,
        account_id TEXT NOT NULL,
        type TEXT NOT NULL,
        created_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS transactions (
        id TEXT PRIMARY KEY,
        amount_cents INTEGER NOT NULL,
        date INTEGER NOT NULL,
        description TEXT,
        account_id TEXT NOT NULL,
        category_id TEXT,
        type TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'PENDING',
        tags TEXT,
        attachment_path TEXT,
        recurrence_id TEXT,
        created_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS transfers (
        id TEXT PRIMARY KEY,
        transaction_id TEXT NOT NULL,
        from_account_id TEXT NOT NULL,
        to_account_id TEXT NOT NULL,
        created_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS budgets (
        id TEXT PRIMARY KEY,
        category_id TEXT NOT NULL,
        amount_cents INTEGER NOT NULL,
        month INTEGER NOT NULL,
        year INTEGER NOT NULL,
        created_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS goals (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        target_amount_cents INTEGER NOT NULL,
        current_amount_cents INTEGER NOT NULL DEFAULT 0,
        deadline INTEGER,
        color TEXT,
        created_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS creditCardBills (
        id TEXT PRIMARY KEY,
        account_id TEXT NOT NULL,
        closing_date INTEGER NOT NULL,
        due_date INTEGER NOT NULL,
        is_closed INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL
      );
    `);
    console.log('Database tables verified / created successfully');

    // Migração segura para adicionar colunas de bloqueio e configuração se tabela já existir
    try { sqlite.exec(`ALTER TABLE accounts ADD COLUMN include_in_total INTEGER NOT NULL DEFAULT 1;`); } catch {}
    try { sqlite.exec(`ALTER TABLE accounts ADD COLUMN is_locked INTEGER NOT NULL DEFAULT 0;`); } catch {}
    try { sqlite.exec(`ALTER TABLE accounts ADD COLUMN lock_type TEXT;`); } catch {}
    try { sqlite.exec(`ALTER TABLE accounts ADD COLUMN password_hash TEXT;`); } catch {}
    try { sqlite.exec(`ALTER TABLE accounts ADD COLUMN salt TEXT;`); } catch {}

    // Garante que todas as categorias padrão essenciais existam no banco
    const defaultCategories = [
      { id: 'cat-alimentacao', name: 'Alimentação', group: 'Essenciais', color: '#ef4444', type: 'EXPENSE', icon: 'utensils' },
      { id: 'cat-moradia', name: 'Moradia / Aluguel', group: 'Essenciais', color: '#3b82f6', type: 'EXPENSE', icon: 'home' },
      { id: 'cat-transporte', name: 'Transporte', group: 'Essenciais', color: '#f59e0b', type: 'EXPENSE', icon: 'car' },
      { id: 'cat-saude', name: 'Saúde e Farmácia', group: 'Essenciais', color: '#10b981', type: 'EXPENSE', icon: 'heart-pulse' },
      { id: 'cat-educacao', name: 'Educação', group: 'Desenvolvimento', color: '#6366f1', type: 'EXPENSE', icon: 'book' },
      { id: 'cat-lazer', name: 'Lazer e Entretenimento', group: 'Estilo de Vida', color: '#ec4899', type: 'EXPENSE', icon: 'film' },
      { id: 'cat-compras', name: 'Compras e Vestuário', group: 'Estilo de Vida', color: '#8b5cf6', type: 'EXPENSE', icon: 'shopping-bag' },
      { id: 'cat-servicos', name: 'Assinaturas e Serviços', group: 'Fixos', color: '#06b6d4', type: 'EXPENSE', icon: 'tv' },
      { id: 'cat-salario', name: 'Salário e Pró-labore', group: 'Rendimentos', color: '#10b981', type: 'INCOME', icon: 'briefcase' },
      { id: 'cat-investimentos', name: 'Investimentos e Dividendos', group: 'Rendimentos', color: '#84cc16', type: 'INCOME', icon: 'trending-up' },
      { id: 'cat-extras', name: 'Freelance e Renda Extra', group: 'Rendimentos', color: '#eab308', type: 'INCOME', icon: 'dollar-sign' },
      { id: 'cat-outras-desp', name: 'Outras Despesas', group: 'Outros', color: '#64748b', type: 'EXPENSE', icon: 'more-horizontal' },
    ];

    const insertStmt = sqlite.prepare(`
      INSERT OR IGNORE INTO categories (id, name, "group", icon, color, type, parent_id, created_at)
      VALUES (@id, @name, @group, @icon, @color, @type, NULL, @createdAt)
    `);

    const now = Date.now();
    for (const cat of defaultCategories) {
      const exists = sqlite.prepare('SELECT 1 FROM categories WHERE LOWER(name) = LOWER(?)').get(cat.name);
      if (!exists) {
        insertStmt.run({ ...cat, createdAt: now });
      }
    }
    console.log('Default categories verified and synchronized successfully');
  } catch (error) {
    console.error('Error initializing database tables:', error);
    throw error;
  }
}

// Helper function to close the database
export function closeDb() {
  sqlite.close();
}

export {
  accounts,
  categories,
  transactions,
  transfers,
  recurrences,
  budgets,
  goals,
  creditCardBills,
  eq,
};
