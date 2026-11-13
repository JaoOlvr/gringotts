import crypto from 'node:crypto';
import type { ParsedStatement, ParsedStatementTransaction } from './types';

const BRAZILIAN_BANKS_MAP: Record<string, string> = {
  '001': 'Banco do Brasil',
  '1': 'Banco do Brasil',
  '033': 'Santander',
  '33': 'Santander',
  '077': 'Banco Inter',
  '77': 'Banco Inter',
  '104': 'Caixa Econômica Federal',
  '208': 'BTG Pactual',
  '212': 'Banco Original',
  '237': 'Bradesco',
  '260': 'Nubank (Nu Pagamentos)',
  '290': 'PagBank (PagSeguro)',
  '336': 'C6 Bank',
  '341': 'Itaú Unibanco',
  '380': 'PicPay',
  '655': 'Banco Votorantim (Neon)',
};

/**
 * Converte data em formato OFX (ex: "20261005120000[-03:EST]" ou "20261005") para "YYYY-MM-DD"
 */
export function parseOfxDate(rawDateStr: string): string {
  if (!rawDateStr) {
    return new Date().toISOString().split('T')[0]!;
  }

  const clean = rawDateStr.trim().replace(/^\[.*?\]/, '');
  // Captura os primeiros 8 dígitos: YYYYMMDD
  const match = clean.match(/^(\d{4})(\d{2})(\d{2})/);
  if (match) {
    const [, year, month, day] = match;
    return `${year}-${month}-${day}`;
  }

  // Fallback se for timestamp ISO
  const d = new Date(rawDateStr);
  if (!isNaN(d.getTime())) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  return new Date().toISOString().split('T')[0]!;
}

/**
 * Converte string de valor monetário (ex: "-45.90", "3500.00", "-120,50") para centavos inteiros
 */
export function parseAmountToCents(amountStr: string): number {
  if (!amountStr) return 0;
  const normalized = amountStr.trim().replace(/\s/g, '').replace(',', '.');
  const parsedFloat = parseFloat(normalized);
  if (isNaN(parsedFloat)) return 0;
  return Math.round(parsedFloat * 100);
}

/**
 * Extrai o valor de uma tag OFX dentro de um bloco de texto (suporta SGML e XML)
 */
function extractTagValue(content: string, tagName: string): string | undefined {
  // Procura <TAG>valor (com ou sem </TAG>)
  const regex = new RegExp(`<${tagName}>([^<\\r\\n]+)(?:<\\/${tagName}>)?`, 'i');
  const match = content.match(regex);
  return match ? match[1]?.trim() : undefined;
}

/**
 * Extrai blocos repetidos de tags como <STMTTRN>...</STMTTRN> ou <STMTTRN>...
 */
function extractBlocks(content: string, blockTagName: string): string[] {
  const blocks: string[] = [];
  const startTagRegex = new RegExp(`<${blockTagName}>`, 'gi');
  let match: RegExpExecArray | null;

  const positions: number[] = [];
  while ((match = startTagRegex.exec(content)) !== null) {
    positions.push(match.index);
  }

  for (let i = 0; i < positions.length; i++) {
    const start = positions[i]!;
    const nextStart = i + 1 < positions.length ? positions[i + 1]! : content.length;
    let blockContent = content.substring(start, nextStart);

    // Se tiver tag de fechamento </STMTTRN>, pega apenas até ela
    const closeTagRegex = new RegExp(`</${blockTagName}>`, 'i');
    const closeMatch = blockContent.match(closeTagRegex);
    if (closeMatch && closeMatch.index !== undefined) {
      blockContent = blockContent.substring(0, closeMatch.index + closeMatch[0].length);
    }

    blocks.push(blockContent);
  }

  return blocks;
}

/**
 * Analisa e extrai dados completos de um extrato OFX (SGML ou XML)
 */
export function parseOfx(ofxContent: string): ParsedStatement {
  if (!ofxContent || typeof ofxContent !== 'string') {
    throw new Error('Conteúdo OFX inválido ou vazio.');
  }

  // 1. Metadados do Banco e Conta
  const rawOrg = extractTagValue(ofxContent, 'ORG');
  const rawBankId = extractTagValue(ofxContent, 'BANKID') || extractTagValue(ofxContent, 'FID');
  const rawAcctId = extractTagValue(ofxContent, 'ACCTID');
  const rawAcctType = extractTagValue(ofxContent, 'ACCTTYPE');
  const currency = extractTagValue(ofxContent, 'CURDEF') || 'BRL';

  // Identifica o nome legível do banco
  let bankName = rawOrg;
  if (rawBankId && BRAZILIAN_BANKS_MAP[rawBankId]) {
    bankName = rawOrg ? `${rawOrg} (${BRAZILIAN_BANKS_MAP[rawBankId]})` : BRAZILIAN_BANKS_MAP[rawBankId];
  } else if (!bankName && rawBankId) {
    bankName = `Banco (${rawBankId})`;
  } else if (!bankName) {
    bankName = 'Extrato Bancário';
  }

  // Identifica o tipo de conta
  let accountType: 'checking' | 'savings' | 'credit_card' = 'checking';
  if (ofxContent.includes('<CCSTMTRS>') || ofxContent.includes('<CREDITCARDMSGSRSV1>') || rawAcctType?.toUpperCase() === 'CREDITCARD') {
    accountType = 'credit_card';
  } else if (rawAcctType?.toUpperCase() === 'SAVINGS') {
    accountType = 'savings';
  }

  // Período do extrato
  const dtStart = extractTagValue(ofxContent, 'DTSTART');
  const dtEnd = extractTagValue(ofxContent, 'DTEND');
  const startDate = dtStart ? parseOfxDate(dtStart) : undefined;
  const endDate = dtEnd ? parseOfxDate(dtEnd) : undefined;

  // Saldo informado
  const rawBalAmt = extractTagValue(ofxContent, 'BALAMT');
  const ledgerBalanceCents = rawBalAmt ? parseAmountToCents(rawBalAmt) : undefined;
  const rawDtAsOf = extractTagValue(ofxContent, 'DTASOF');
  const balanceDate = rawDtAsOf ? parseOfxDate(rawDtAsOf) : undefined;

  // 2. Extração das transações (<STMTTRN>)
  const transactionBlocks = extractBlocks(ofxContent, 'STMTTRN');
  const transactions: ParsedStatementTransaction[] = [];
  let totalIncomeCents = 0;
  let totalExpenseCents = 0;

  for (const block of transactionBlocks) {
    const rawTrnType = extractTagValue(block, 'TRNTYPE') || '';
    const dtPosted = extractTagValue(block, 'DTPOSTED') || '';
    const rawTrnAmt = extractTagValue(block, 'TRNAMT') || '0';
    const fitid = extractTagValue(block, 'FITID');
    const memo = extractTagValue(block, 'MEMO');
    const name = extractTagValue(block, 'NAME');

    const amountCents = parseAmountToCents(rawTrnAmt);
    const absAmountCents = Math.abs(amountCents);

    // No OFX padrão:
    // Valores negativos são débitos (despesas), positivos são créditos (receitas).
    // Ou se TRNTYPE for DEBIT / CREDIT.
    let type: 'INCOME' | 'EXPENSE';
    if (amountCents > 0 || rawTrnType.toUpperCase() === 'CREDIT') {
      type = 'INCOME';
      totalIncomeCents += absAmountCents;
    } else {
      type = 'EXPENSE';
      totalExpenseCents += absAmountCents;
    }

    // Descrição mais informativa
    let description = (memo || name || 'Lançamento bancário').trim();
    if (name && memo && name !== memo && !memo.includes(name)) {
      description = `${name} - ${memo}`;
    }

    const date = parseOfxDate(dtPosted);

    transactions.push({
      id: crypto.randomUUID(),
      fitid,
      date,
      rawDate: dtPosted,
      amountCents,
      absAmountCents,
      type,
      description,
      memo,
      payeeName: name,
      selected: true, // Selecionado por padrão para importação
    });
  }

  // Ordena por data decrescente (mais recentes primeiro)
  transactions.sort((a, b) => b.date.localeCompare(a.date));

  return {
    bankId: rawBankId,
    bankName,
    accountNumber: rawAcctId,
    accountType,
    currency,
    startDate,
    endDate,
    ledgerBalanceCents,
    balanceDate,
    transactions,
    totalIncomeCents,
    totalExpenseCents,
    statementType: 'OFX',
  };
}

