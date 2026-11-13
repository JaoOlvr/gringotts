import crypto from 'node:crypto';
import type { ParsedStatement, ParsedStatementTransaction } from './types';
import { parseAmountToCents } from './ofxParser';

/**
 * Faz o parsing de extratos em formato JSON (padrão Open Finance Brasil ou exportações de agregadores)
 */
export function parseOpenFinanceJson(jsonString: string): ParsedStatement {
  let parsed: any;
  try {
    parsed = JSON.parse(jsonString);
  } catch (err) {
    throw new Error('Arquivo JSON inválido ou mal formatado.');
  }

  const root = parsed.data || parsed;

  const bankName = root.brandName || root.bankName || root.institutionName || root.banco || 'Open Finance Brasil';
  const bankId = root.bankId || root.compe || root.ispb;
  const accountNumber = root.accountNumber || root.conta || root.account?.number;
  const currency = root.currency || root.moeda || 'BRL';

  let rawTransactions: any[] = [];
  if (Array.isArray(root.transactions)) {
    rawTransactions = root.transactions;
  } else if (Array.isArray(root.lancamentos)) {
    rawTransactions = root.lancamentos;
  } else if (Array.isArray(root.extrato)) {
    rawTransactions = root.extrato;
  } else if (Array.isArray(root)) {
    rawTransactions = root;
  }

  const transactions: ParsedStatementTransaction[] = [];
  let totalIncomeCents = 0;
  let totalExpenseCents = 0;

  for (const item of rawTransactions) {
    if (!item) continue;

    // Id
    const fitid = item.transactionId || item.id || item.fitid || item.identificador;
    const id = crypto.randomUUID();

    // Data
    const rawDate = item.transactionDate || item.date || item.data || item.bookingDate || new Date().toISOString();
    const date = rawDate.split('T')[0]!;

    // Valor
    let amountCents = 0;
    if (typeof item.amountCents === 'number') {
      amountCents = item.amountCents;
    } else if (typeof item.amount === 'number') {
      amountCents = Math.round(item.amount * 100);
    } else if (typeof item.valor === 'number') {
      amountCents = Math.round(item.valor * 100);
    } else if (typeof item.amount === 'string') {
      amountCents = parseAmountToCents(item.amount);
    } else if (typeof item.valor === 'string') {
      amountCents = parseAmountToCents(item.valor);
    }

    // Tipo
    const rawType = String(item.type || item.tipo || item.creditDebitIndicator || '').toUpperCase();
    let type: 'INCOME' | 'EXPENSE';
    if (rawType.includes('CREDIT') || rawType.includes('CRÉDITO') || rawType.includes('RECEITA') || amountCents > 0) {
      type = 'INCOME';
      totalIncomeCents += Math.abs(amountCents);
    } else {
      type = 'EXPENSE';
      totalExpenseCents += Math.abs(amountCents);
    }

    const description = (item.description || item.descricao || item.transactionName || item.memo || 'Lançamento Open Finance').trim();

    transactions.push({
      id,
      fitid: fitid ? String(fitid) : undefined,
      date,
      rawDate,
      amountCents,
      absAmountCents: Math.abs(amountCents),
      type,
      description,
      memo: item.memo || item.detalhes,
      payeeName: item.payee || item.beneficiario,
      selected: true,
    });
  }

  transactions.sort((a, b) => b.date.localeCompare(a.date));

  return {
    bankId: bankId ? String(bankId) : undefined,
    bankName,
    accountNumber: accountNumber ? String(accountNumber) : undefined,
    currency,
    transactions,
    totalIncomeCents,
    totalExpenseCents,
    statementType: 'OPEN_FINANCE_JSON',
  };
}
