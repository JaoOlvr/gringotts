import { db, accounts, categories, transactions, budgets, goals } from './db';
import crypto from 'node:crypto';

export async function populateRealisticSeedData() {
  const existingAccounts = await db.select().from(accounts);
  if (existingAccounts.length > 0) {
    return { success: true, message: 'Dados já existem no banco.' };
  }

  // 1. Criar Contas
  const accNubankId = crypto.randomUUID();
  const accItauId = crypto.randomUUID();
  const accCashId = crypto.randomUUID();

  await db.insert(accounts).values([
    {
      id: accNubankId,
      name: 'Nubank Principal',
      type: 'checking',
      balance_cents: 485000, // R$ 4.850,00
      currency: 'BRL',
      color: '#8a05be',
      is_active: true,
      created_at: new Date(),
      updated_at: new Date(),
    },
    {
      id: accItauId,
      name: 'Reserva de Emergência (Itaú)',
      type: 'savings',
      balance_cents: 1500000, // R$ 15.000,00
      currency: 'BRL',
      color: '#ec7000',
      is_active: true,
      created_at: new Date(),
      updated_at: new Date(),
    },
    {
      id: accCashId,
      name: 'Carteira Física',
      type: 'cash',
      balance_cents: 22000, // R$ 220,00
      currency: 'BRL',
      color: '#10b981',
      is_active: true,
      created_at: new Date(),
      updated_at: new Date(),
    },
  ]);

  // 2. Criar Categorias
  const catSalarioId = crypto.randomUUID();
  const catInvestId = crypto.randomUUID();
  const catMercadoId = crypto.randomUUID();
  const catMoradiaId = crypto.randomUUID();
  const catTransporteId = crypto.randomUUID();
  const catRestauranteId = crypto.randomUUID();
  const catLazerId = crypto.randomUUID();

  await db.insert(categories).values([
    {
      id: catSalarioId,
      name: 'Salário & Remuneração',
      group: 'Receitas',
      color: '#10b981',
      type: 'INCOME',
      created_at: new Date(),
    },
    {
      id: catInvestId,
      name: 'Rendimentos e Dividendos',
      group: 'Receitas',
      color: '#3b82f6',
      type: 'INCOME',
      created_at: new Date(),
    },
    {
      id: catMercadoId,
      name: 'Supermercado e Feira',
      group: 'Alimentação',
      color: '#ef4444',
      type: 'EXPENSE',
      created_at: new Date(),
    },
    {
      id: catMoradiaId,
      name: 'Aluguel & Contas da Casa',
      group: 'Moradia',
      color: '#6366f1',
      type: 'EXPENSE',
      created_at: new Date(),
    },
    {
      id: catTransporteId,
      name: 'Transporte & Combustível',
      group: 'Mobilidade',
      color: '#f59e0b',
      type: 'EXPENSE',
      created_at: new Date(),
    },
    {
      id: catRestauranteId,
      name: 'Restaurantes e Delivery',
      group: 'Alimentação',
      color: '#ec4899',
      type: 'EXPENSE',
      created_at: new Date(),
    },
    {
      id: catLazerId,
      name: 'Lazer e Streaming',
      group: 'Estilo de Vida',
      color: '#8b5cf6',
      type: 'EXPENSE',
      created_at: new Date(),
    },
  ]);

  // 3. Criar Transações do mês
  const now = new Date();
  const d = (daysAgo: number) => {
    const dt = new Date(now);
    dt.setDate(dt.getDate() - daysAgo);
    return dt;
  };

  await db.insert(transactions).values([
    {
      id: crypto.randomUUID(),
      amount_cents: 650000,
      date: d(12),
      description: 'Salário Mensal Tech Corp',
      account_id: accNubankId,
      category_id: catSalarioId,
      type: 'INCOME',
      status: 'PAID',
      tags: JSON.stringify(['salario', 'fixo']),
      created_at: d(12),
    },
    {
      id: crypto.randomUUID(),
      amount_cents: 14500,
      date: d(10),
      description: 'Rendimento CDB 100% CDI',
      account_id: accItauId,
      category_id: catInvestId,
      type: 'INCOME',
      status: 'PAID',
      tags: JSON.stringify(['investimentos']),
      created_at: d(10),
    },
    {
      id: crypto.randomUUID(),
      amount_cents: 210000,
      date: d(8),
      description: 'Aluguel do Apartamento',
      account_id: accNubankId,
      category_id: catMoradiaId,
      type: 'EXPENSE',
      status: 'PAID',
      tags: JSON.stringify(['moradia', 'fixo']),
      created_at: d(8),
    },
    {
      id: crypto.randomUUID(),
      amount_cents: 48590,
      date: d(6),
      description: 'Supermercado Pão de Açúcar',
      account_id: accNubankId,
      category_id: catMercadoId,
      type: 'EXPENSE',
      status: 'PAID',
      tags: JSON.stringify(['mercado']),
      created_at: d(6),
    },
    {
      id: crypto.randomUUID(),
      amount_cents: 6240,
      date: d(4),
      description: 'Uber para Reunião Centro',
      account_id: accNubankId,
      category_id: catTransporteId,
      type: 'EXPENSE',
      status: 'PAID',
      tags: JSON.stringify(['transporte', 'uber']),
      created_at: d(4),
    },
    {
      id: crypto.randomUUID(),
      amount_cents: 12500,
      date: d(2),
      description: 'Jantar Restaurante Outback',
      account_id: accNubankId,
      category_id: catRestauranteId,
      type: 'EXPENSE',
      status: 'PAID',
      tags: JSON.stringify(['restaurante', 'lazer']),
      created_at: d(2),
    },
    {
      id: crypto.randomUUID(),
      amount_cents: 5590,
      date: d(1),
      description: 'Assinatura Netflix Premium',
      account_id: accNubankId,
      category_id: catLazerId,
      type: 'EXPENSE',
      status: 'PAID',
      tags: JSON.stringify(['recorrente', 'streaming']),
      created_at: d(1),
    },
  ]);

  // 4. Criar Orçamentos
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  await db.insert(budgets).values([
    {
      id: crypto.randomUUID(),
      category_id: catMercadoId,
      amount_cents: 90000,
      month: currentMonth,
      year: currentYear,
      created_at: new Date(),
    },
    {
      id: crypto.randomUUID(),
      category_id: catMoradiaId,
      amount_cents: 230000,
      month: currentMonth,
      year: currentYear,
      created_at: new Date(),
    },
    {
      id: crypto.randomUUID(),
      category_id: catTransporteId,
      amount_cents: 25000,
      month: currentMonth,
      year: currentYear,
      created_at: new Date(),
    },
    {
      id: crypto.randomUUID(),
      category_id: catRestauranteId,
      amount_cents: 35000,
      month: currentMonth,
      year: currentYear,
      created_at: new Date(),
    },
  ]);

  // 5. Criar Metas
  const nextYear = new Date(now);
  nextYear.setFullYear(nextYear.getFullYear() + 1);

  await db.insert(goals).values([
    {
      id: crypto.randomUUID(),
      name: 'Reserva de Emergência (6 Meses)',
      target_amount_cents: 3000000,
      current_amount_cents: 1500000,
      deadline: nextYear,
      color: '#10b981',
      created_at: new Date(),
    },
    {
      id: crypto.randomUUID(),
      name: 'Viagem de Fim de Ano',
      target_amount_cents: 800000,
      current_amount_cents: 350000,
      deadline: nextYear,
      color: '#3b82f6',
      created_at: new Date(),
    },
  ]);

  return { success: true, message: 'Dados de exemplo populados com sucesso!' };
}
