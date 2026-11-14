import type {
  Account,
  Category,
  Transaction,
  Budget,
  Goal,
  Debt,
  P2pSyncStatus,
  SyncResultDetails,
} from '../types';
import { encryptPayloadWeb, decryptPayloadWeb, normalizePairingCode } from './mobileCrypto';
import { CapacitorHttp, Capacitor } from '@capacitor/core';

async function httpPostJson<T = any>(
  url: string,
  body: any,
  timeoutMs = 10000
): Promise<{ ok: boolean; status: number; data: T }> {
  if (Capacitor.isNativePlatform()) {
    try {
      const res = await CapacitorHttp.post({
        url,
        headers: { 'Content-Type': 'application/json' },
        data: body,
        connectTimeout: timeoutMs,
        readTimeout: timeoutMs,
      });
      return {
        ok: res.status >= 200 && res.status < 300,
        status: res.status,
        data: (typeof res.data === 'string' ? JSON.parse(res.data) : res.data) as T,
      };
    } catch (err: any) {
      throw new Error(
        `Falha de conexão nativa com ${url}: ${err.message || 'Verifique se o celular e o computador estão na mesma rede Wi-Fi.'}`
      );
    }
  }

  // Fallback para Web / Navegador / Testes
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    clearTimeout(timer);
    const data = await res.json().catch(() => ({}));
    return {
      ok: res.ok,
      status: res.status,
      data: data as T,
    };
  } catch (err: any) {
    clearTimeout(timer);
    if (err.name === 'AbortError') {
      throw new Error(
        `Tempo limite esgotado (${timeoutMs / 1000}s) ao conectar a ${url}. Verifique se ambos os aparelhos estão na mesma rede Wi-Fi e se o firewall do computador não está bloqueando a porta.`
      );
    }
    throw new Error(
      `Não foi possível alcançar o computador em ${url}. Verifique se o IP está correto e se o servidor P2P está iniciado no desktop.`
    );
  }
}

const STORAGE_KEYS = {
  ACCOUNTS: 'gringotts_mobile_accounts_v1',
  CATEGORIES: 'gringotts_mobile_categories_v1',
  TRANSACTIONS: 'gringotts_mobile_transactions_v1',
  BUDGETS: 'gringotts_mobile_budgets_v1',
  GOALS: 'gringotts_mobile_goals_v1',
  DEBTS: 'gringotts_mobile_debts_v1',
};

const DEFAULT_CATEGORIES: Category[] = [
  { id: 'cat-alimentacao', name: 'Alimentação', group: 'Essenciais', color: '#ef4444', type: 'EXPENSE', icon: 'utensils', createdAt: new Date() },
  { id: 'cat-moradia', name: 'Moradia / Aluguel', group: 'Essenciais', color: '#3b82f6', type: 'EXPENSE', icon: 'home', createdAt: new Date() },
  { id: 'cat-transporte', name: 'Transporte', group: 'Essenciais', color: '#f59e0b', type: 'EXPENSE', icon: 'car', createdAt: new Date() },
  { id: 'cat-saude', name: 'Saúde e Farmácia', group: 'Essenciais', color: '#10b981', type: 'EXPENSE', icon: 'heart-pulse', createdAt: new Date() },
  { id: 'cat-educacao', name: 'Educação', group: 'Desenvolvimento', color: '#6366f1', type: 'EXPENSE', icon: 'book', createdAt: new Date() },
  { id: 'cat-lazer', name: 'Lazer e Entretenimento', group: 'Estilo de Vida', color: '#ec4899', type: 'EXPENSE', icon: 'film', createdAt: new Date() },
  { id: 'cat-compras', name: 'Compras e Vestuário', group: 'Estilo de Vida', color: '#8b5cf6', type: 'EXPENSE', icon: 'shopping-bag', createdAt: new Date() },
  { id: 'cat-servicos', name: 'Assinaturas e Serviços', group: 'Fixos', color: '#06b6d4', type: 'EXPENSE', icon: 'tv', createdAt: new Date() },
  { id: 'cat-salario', name: 'Salário e Pró-labore', group: 'Rendimentos', color: '#10b981', type: 'INCOME', icon: 'briefcase', createdAt: new Date() },
  { id: 'cat-investimentos', name: 'Investimentos e Dividendos', group: 'Rendimentos', color: '#84cc16', type: 'INCOME', icon: 'trending-up', createdAt: new Date() },
  { id: 'cat-extras', name: 'Freelance e Renda Extra', group: 'Rendimentos', color: '#eab308', type: 'INCOME', icon: 'dollar-sign', createdAt: new Date() },
  { id: 'cat-outras-desp', name: 'Outras Despesas', group: 'Outros', color: '#64748b', type: 'EXPENSE', icon: 'more-horizontal', createdAt: new Date() },
];

function generateUuid(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
}

class MobileStorageService {
  private accountsCache: Account[] | null = null;
  private categoriesCache: Category[] | null = null;
  private transactionsCache: Transaction[] | null = null;
  private budgetsCache: Budget[] | null = null;
  private goalsCache: Goal[] | null = null;
  private debtsCache: Debt[] | null = null;

  private load<T>(key: string, defaultValue: T): T {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return defaultValue;
      return JSON.parse(raw) as T;
    } catch {
      return defaultValue;
    }
  }

  private save<T>(key: string, data: T): void {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
      console.warn('Erro ao salvar no localStorage móvel:', e);
    }
  }

  // --- ACCOUNTS ---
  getAccounts(): Account[] {
    if (!this.accountsCache) {
      const stored = this.load<any[]>(STORAGE_KEYS.ACCOUNTS, []);
      if (stored.length === 0) {
        // Conta padrão inicial caso não exista
        const initialAccount: Account = {
          id: 'acc-principal-mobile',
          name: 'Conta Principal',
          type: 'checking',
          balanceCents: 0,
          currency: 'BRL',
          color: '#3b82f6',
          icon: 'wallet',
          isActive: true,
          includeInTotal: true,
          isLocked: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        this.accountsCache = [initialAccount];
        this.save(STORAGE_KEYS.ACCOUNTS, this.accountsCache);
      } else {
        this.accountsCache = stored.map((a) => ({
          ...a,
          createdAt: new Date(a.createdAt || a.created_at || Date.now()),
          updatedAt: new Date(a.updatedAt || a.updated_at || Date.now()),
        }));
      }
    }
    return [...this.accountsCache];
  }

  createAccount(account: Omit<Account, 'id' | 'createdAt' | 'updatedAt'>): Account {
    const accounts = this.getAccounts();
    const newAcc: Account = {
      ...account,
      id: generateUuid(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    accounts.push(newAcc);
    this.accountsCache = accounts;
    this.save(STORAGE_KEYS.ACCOUNTS, accounts);
    return newAcc;
  }

  updateAccount(id: string, updates: Partial<Omit<Account, 'id' | 'createdAt' | 'updatedAt'>>): Account | null {
    const accounts = this.getAccounts();
    const idx = accounts.findIndex((a) => a.id === id);
    if (idx === -1) return null;
    const updated = {
      ...accounts[idx]!,
      ...updates,
      updatedAt: new Date(),
    };
    accounts[idx] = updated;
    this.accountsCache = accounts;
    this.save(STORAGE_KEYS.ACCOUNTS, accounts);
    return updated;
  }

  deleteAccount(id: string): boolean {
    const accounts = this.getAccounts().filter((a) => a.id !== id);
    this.accountsCache = accounts;
    this.save(STORAGE_KEYS.ACCOUNTS, accounts);
    return true;
  }

  // --- CATEGORIES ---
  getCategories(): Category[] {
    if (!this.categoriesCache) {
      const stored = this.load<any[]>(STORAGE_KEYS.CATEGORIES, []);
      if (stored.length === 0) {
        this.categoriesCache = DEFAULT_CATEGORIES;
        this.save(STORAGE_KEYS.CATEGORIES, this.categoriesCache);
      } else {
        this.categoriesCache = stored.map((c) => ({
          ...c,
          createdAt: new Date(c.createdAt || c.created_at || Date.now()),
        }));
      }
    }
    return [...this.categoriesCache];
  }

  createCategory(category: Omit<Category, 'id' | 'createdAt'>): Category {
    const categories = this.getCategories();
    const newCat: Category = {
      ...category,
      id: generateUuid(),
      createdAt: new Date(),
    };
    categories.push(newCat);
    this.categoriesCache = categories;
    this.save(STORAGE_KEYS.CATEGORIES, categories);
    return newCat;
  }

  // --- TRANSACTIONS ---
  getTransactions(filters?: { accountId?: string; limit?: number }): Transaction[] {
    if (!this.transactionsCache) {
      const stored = this.load<any[]>(STORAGE_KEYS.TRANSACTIONS, []);
      this.transactionsCache = stored.map((t) => ({
        ...t,
        date: new Date(t.date),
        createdAt: new Date(t.createdAt || t.created_at || Date.now()),
        tags: Array.isArray(t.tags) ? t.tags : (typeof t.tags === 'string' ? JSON.parse(t.tags || '[]') : []),
      }));
    }

    let txs = [...this.transactionsCache];
    if (filters?.accountId) {
      txs = txs.filter((t) => t.accountId === filters.accountId);
    }
    // Ordenar da mais recente para a mais antiga
    txs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    if (filters?.limit) {
      txs = txs.slice(0, filters.limit);
    }
    return txs;
  }

  createTransaction(tx: Omit<Transaction, 'id' | 'createdAt'>): Transaction {
    const transactions = this.getTransactions();
    const newTx: Transaction = {
      ...tx,
      id: generateUuid(),
      createdAt: new Date(),
    };
    transactions.push(newTx);
    this.transactionsCache = transactions;
    this.save(STORAGE_KEYS.TRANSACTIONS, transactions);
    this.recalculateBalances();
    return newTx;
  }

  deleteTransaction(id: string): boolean {
    const transactions = this.getTransactions().filter((t) => t.id !== id);
    this.transactionsCache = transactions;
    this.save(STORAGE_KEYS.TRANSACTIONS, transactions);
    this.recalculateBalances();
    return true;
  }

  // --- DEBTS ---
  getDebts(): Debt[] {
    if (!this.debtsCache) {
      const stored = this.load<any[]>(STORAGE_KEYS.DEBTS, []);
      this.debtsCache = stored.map((d) => ({
        ...d,
        createdAt: new Date(d.createdAt || d.created_at || Date.now()),
        updatedAt: new Date(d.updatedAt || d.updated_at || Date.now()),
      }));
    }
    return [...this.debtsCache];
  }

  createDebt(debt: Omit<Debt, 'id' | 'createdAt' | 'updatedAt'>): Debt {
    const debts = this.getDebts();
    const newDebt: Debt = {
      ...debt,
      id: generateUuid(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    debts.push(newDebt);
    this.debtsCache = debts;
    this.save(STORAGE_KEYS.DEBTS, debts);
    return newDebt;
  }

  updateDebt(id: string, updates: Partial<Omit<Debt, 'id' | 'createdAt'>>): Debt | null {
    const debts = this.getDebts();
    const idx = debts.findIndex((d) => d.id === id);
    if (idx === -1) return null;
    const updated = {
      ...debts[idx]!,
      ...updates,
      updatedAt: new Date(),
    };
    debts[idx] = updated;
    this.debtsCache = debts;
    this.save(STORAGE_KEYS.DEBTS, debts);
    return updated;
  }

  recordDebtPayment(id: string, paymentAmountCents: number): Debt | null {
    const debts = this.getDebts();
    const idx = debts.findIndex((d) => d.id === id);
    if (idx === -1) return null;
    const current = debts[idx]!;
    const newRemaining = Math.max(0, current.remainingAmountCents - paymentAmountCents);
    const updated = {
      ...current,
      remainingAmountCents: newRemaining,
      isPaid: newRemaining === 0,
      updatedAt: new Date(),
    };
    debts[idx] = updated;
    this.debtsCache = debts;
    this.save(STORAGE_KEYS.DEBTS, debts);
    return updated;
  }

  deleteDebt(id: string): boolean {
    const debts = this.getDebts().filter((d) => d.id !== id);
    this.debtsCache = debts;
    this.save(STORAGE_KEYS.DEBTS, debts);
    return true;
  }

  // --- BUDGETS & GOALS ---
  getBudgets(): Budget[] {
    if (!this.budgetsCache) {
      const stored = this.load<any[]>(STORAGE_KEYS.BUDGETS, []);
      this.budgetsCache = stored.map((b) => ({
        ...b,
        createdAt: new Date(b.createdAt || b.created_at || Date.now()),
      }));
    }
    return [...this.budgetsCache];
  }

  createBudget(budget: Omit<Budget, 'id' | 'createdAt'>): Budget {
    const budgets = this.getBudgets();
    const newB: Budget = {
      ...budget,
      id: generateUuid(),
      createdAt: new Date(),
    };
    budgets.push(newB);
    this.budgetsCache = budgets;
    this.save(STORAGE_KEYS.BUDGETS, budgets);
    return newB;
  }

  getGoals(): Goal[] {
    if (!this.goalsCache) {
      const stored = this.load<any[]>(STORAGE_KEYS.GOALS, []);
      this.goalsCache = stored.map((g) => ({
        ...g,
        deadline: g.deadline ? new Date(g.deadline) : null,
        createdAt: new Date(g.createdAt || g.created_at || Date.now()),
      }));
    }
    return [...this.goalsCache];
  }

  createGoal(goal: Omit<Goal, 'id' | 'createdAt'>): Goal {
    const goals = this.getGoals();
    const newG: Goal = {
      ...goal,
      id: generateUuid(),
      createdAt: new Date(),
    };
    goals.push(newG);
    this.goalsCache = goals;
    this.save(STORAGE_KEYS.GOALS, goals);
    return newG;
  }

  // --- RECÁLCULO DE SALDOS ---
  recalculateBalances(): void {
    const accounts = this.getAccounts();
    const transactions = this.getTransactions();

    const balanceMap = new Map<string, number>();
    for (const acc of accounts) {
      balanceMap.set(acc.id, 0);
    }

    for (const tx of transactions) {
      if (!balanceMap.has(tx.accountId)) continue;
      const current = balanceMap.get(tx.accountId)!;
      if (tx.type === 'INCOME') {
        balanceMap.set(tx.accountId, current + tx.amountCents);
      } else if (tx.type === 'EXPENSE') {
        balanceMap.set(tx.accountId, current - tx.amountCents);
      }
    }

    for (const acc of accounts) {
      acc.balanceCents = balanceMap.get(acc.id) || 0;
      acc.updatedAt = new Date();
    }

    this.accountsCache = accounts;
    this.save(STORAGE_KEYS.ACCOUNTS, accounts);
  }

  // --- SINCRONIZAÇÃO P2P MOBILE (CLIENTE) ---
  exportSyncDataset(): any {
    const accounts = this.getAccounts();
    const categories = this.getCategories();
    const transactions = this.getTransactions();
    const budgets = this.getBudgets();
    const goals = this.getGoals();
    const debts = this.getDebts();

    return {
      deviceId: `mobile-gringotts-${navigator.userAgent.slice(0, 20)}`,
      deviceName: 'Gringotts Mobile',
      exportedAt: Date.now(),
      accounts: accounts.map((a) => ({
        ...a,
        created_at: new Date(a.createdAt).getTime(),
        updated_at: new Date(a.updatedAt).getTime(),
      })),
      categories: categories.map((c) => ({
        ...c,
        created_at: new Date(c.createdAt).getTime(),
      })),
      transactions: transactions.map((t) => ({
        ...t,
        date: new Date(t.date).getTime(),
        created_at: new Date(t.createdAt).getTime(),
      })),
      budgets: budgets.map((b) => ({
        ...b,
        created_at: new Date(b.createdAt).getTime(),
      })),
      goals: goals.map((g) => ({
        ...g,
        deadline: g.deadline ? new Date(g.deadline).getTime() : null,
        created_at: new Date(g.createdAt).getTime(),
      })),
      debts: debts.map((d) => ({
        ...d,
        created_at: new Date(d.createdAt).getTime(),
        updated_at: new Date(d.updatedAt).getTime(),
      })),
    };
  }

  mergeSyncDataset(remote: any): any {
    let accountsMerged = 0;
    let categoriesMerged = 0;
    let transactionsMerged = 0;
    let debtsMerged = 0;
    let budgetsMerged = 0;
    let goalsMerged = 0;

    // 1. Categorias
    if (Array.isArray(remote.categories)) {
      const localCats = this.getCategories();
      for (const cat of remote.categories) {
        if (!cat.id || !cat.name) continue;
        if (!localCats.some((c) => c.id === cat.id)) {
          localCats.push({
            id: cat.id,
            name: cat.name,
            group: cat.group ?? null,
            icon: cat.icon ?? null,
            color: cat.color ?? null,
            type: cat.type,
            parentId: cat.parent_id ?? null,
            createdAt: new Date(cat.created_at || Date.now()),
          });
          categoriesMerged++;
        }
      }
      this.categoriesCache = localCats;
      this.save(STORAGE_KEYS.CATEGORIES, localCats);
    }

    // 2. Contas
    if (Array.isArray(remote.accounts)) {
      const localAccs = this.getAccounts();
      for (const acc of remote.accounts) {
        if (!acc.id || !acc.name) continue;
        const existingIdx = localAccs.findIndex((a) => a.id === acc.id);
        if (existingIdx === -1) {
          localAccs.push({
            id: acc.id,
            name: acc.name,
            type: acc.type,
            balanceCents: acc.balance_cents || 0,
            currency: acc.currency || 'BRL',
            color: acc.color ?? null,
            icon: acc.icon ?? null,
            isActive: acc.is_active ?? true,
            includeInTotal: acc.include_in_total ?? true,
            isLocked: false,
            createdAt: new Date(acc.created_at || Date.now()),
            updatedAt: new Date(acc.updated_at || Date.now()),
          });
          accountsMerged++;
        } else {
          const localUpdated = new Date(localAccs[existingIdx]!.updatedAt).getTime();
          const remoteUpdated = Number(acc.updated_at) || 0;
          if (remoteUpdated > localUpdated) {
            localAccs[existingIdx] = {
              ...localAccs[existingIdx]!,
              name: acc.name,
              type: acc.type,
              color: acc.color ?? localAccs[existingIdx]!.color,
              updatedAt: new Date(remoteUpdated),
            };
            accountsMerged++;
          }
        }
      }
      this.accountsCache = localAccs;
      this.save(STORAGE_KEYS.ACCOUNTS, localAccs);
    }

    // 3. Transações
    if (Array.isArray(remote.transactions)) {
      const localTxs = this.getTransactions();
      for (const tx of remote.transactions) {
        if (!tx.id || !tx.account_id) continue;
        if (!localTxs.some((t) => t.id === tx.id)) {
          localTxs.push({
            id: tx.id,
            amountCents: tx.amount_cents,
            date: new Date(tx.date || Date.now()),
            description: tx.description ?? null,
            accountId: tx.account_id,
            categoryId: tx.category_id ?? null,
            type: tx.type,
            status: tx.status || 'PAID',
            tags: Array.isArray(tx.tags) ? tx.tags : (typeof tx.tags === 'string' ? JSON.parse(tx.tags || '[]') : []),
            attachmentPath: tx.attachment_path ?? null,
            recurrenceId: tx.recurrence_id ?? null,
            createdAt: new Date(tx.created_at || Date.now()),
          });
          transactionsMerged++;
        }
      }
      this.transactionsCache = localTxs;
      this.save(STORAGE_KEYS.TRANSACTIONS, localTxs);
    }

    // 4. Dívidas
    if (Array.isArray(remote.debts)) {
      const localDebts = this.getDebts();
      for (const debt of remote.debts) {
        if (!debt.id || !debt.name) continue;
        const existingIdx = localDebts.findIndex((d) => d.id === debt.id);
        if (existingIdx === -1) {
          localDebts.push({
            id: debt.id,
            name: debt.name,
            creditor: debt.creditor ?? null,
            totalAmountCents: debt.total_amount_cents,
            remainingAmountCents: debt.remaining_amount_cents,
            interestRateMonthly: debt.interest_rate_monthly || 0,
            minimumPaymentCents: debt.minimum_payment_cents || 0,
            dueDay: debt.due_day ?? null,
            categoryId: debt.category_id ?? null,
            color: debt.color ?? null,
            notes: debt.notes ?? null,
            isPaid: Boolean(debt.is_paid),
            createdAt: new Date(debt.created_at || Date.now()),
            updatedAt: new Date(debt.updated_at || Date.now()),
          });
          debtsMerged++;
        }
      }
      this.debtsCache = localDebts;
      this.save(STORAGE_KEYS.DEBTS, localDebts);
    }

    this.recalculateBalances();

    const totalMerged = accountsMerged + categoriesMerged + transactionsMerged + debtsMerged + budgetsMerged + goalsMerged;
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

  async connectAndSync(params: { host: string; port: number; pairingCode: string }): Promise<SyncResultDetails> {
    const { host, port, pairingCode } = params;
    const normalizedCode = normalizePairingCode(pairingCode);

    const baseUrl = `http://${host}:${port}`;

    // 1. Handshake
    const handshake = await httpPostJson<{ ok: boolean; deviceName?: string; error?: string }>(
      `${baseUrl}/api/sync/handshake`,
      {
        pairingCode: normalizedCode,
        deviceName: 'Gringotts Mobile',
      }
    );

    if (!handshake.ok || !handshake.data?.ok) {
      throw new Error(
        handshake.data?.error || `Falha no pareamento com o computador (status ${handshake.status}). Código de pareamento incorreto ou recusado.`
      );
    }

    const handshakeData = handshake.data;

    // 2. Exportar dataset local e criptografar com WebCrypto
    const localDataset = this.exportSyncDataset();
    const localEnvelope = await encryptPayloadWeb(localDataset, normalizedCode);

    // 3. Troca de dados
    const exchange = await httpPostJson<{
      ok: boolean;
      envelope?: any;
      mergeResult?: any;
      deviceName?: string;
      error?: string;
    }>(`${baseUrl}/api/sync/exchange`, {
      pairingCode: normalizedCode,
      envelope: localEnvelope,
    });

    if (!exchange.ok || !exchange.data?.ok) {
      throw new Error(
        exchange.data?.error || `Erro durante a sincronização de dados (${exchange.status}).`
      );
    }

    const exchangeData = exchange.data;
    if (!exchangeData.envelope) {
      throw new Error('O computador não enviou os dados criptografados para sincronização.');
    }

    // 4. Descriptografar dados remotos e mesclar no armazenamento local
    const remoteDataset = await decryptPayloadWeb<any>(exchangeData.envelope, normalizedCode);
    const clientMergeResult = this.mergeSyncDataset(remoteDataset);

    const totalMerged = clientMergeResult.totalMerged + (exchangeData.mergeResult?.totalMerged || 0);

    return {
      success: true,
      localMergeResult: clientMergeResult,
      remoteMergeResult: exchangeData.mergeResult,
      totalMerged,
      peerDeviceName: exchangeData.deviceName || handshakeData.deviceName || host,
      timestamp: Date.now(),
    };
  }
}

export const mobileStorage = new MobileStorageService();
