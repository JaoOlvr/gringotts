import { dialog, BrowserWindow } from 'electron';
import fs from 'node:fs/promises';
import path from 'node:path';
import { parseOfx } from './ofxParser';
import { parseOpenFinanceJson } from './openFinanceParser';
import { matchCategory } from './categoryMatcher';
import type {
  ParsedStatement,
  ParsedStatementTransaction,
  ImportTransactionsParams,
  ImportTransactionsResult,
} from './types';
import { CategoriesRepository } from '../../repositories/categoriesRepository';
import { TransactionsRepository } from '../../repositories/transactionsRepository';
import { AccountsRepository } from '../../repositories/accountsRepository';

export class OpenFinanceService {
  private categoriesRepo = new CategoriesRepository();
  private transactionsRepo = new TransactionsRepository();
  private accountsRepo = new AccountsRepository();

  /**
   * Abre a caixa de diálogo nativa do sistema operacional para o usuário escolher o arquivo de extrato
   */
  async selectStatementFile(): Promise<{ canceled: boolean; filePath?: string; fileContent?: string; fileName?: string }> {
    const focusedWindow = BrowserWindow.getFocusedWindow() || undefined;
    const result = await dialog.showOpenDialog(focusedWindow as any, {
      title: 'Selecionar Extrato Bancário / Open Finance',
      buttonLabel: 'Importar Extrato',
      filters: [
        { name: 'Extratos Bancários (*.ofx, *.json, *.qfx)', extensions: ['ofx', 'qfx', 'json'] },
        { name: 'Arquivos OFX / QFX (*.ofx, *.qfx)', extensions: ['ofx', 'qfx'] },
        { name: 'Extratos Open Finance JSON (*.json)', extensions: ['json'] },
        { name: 'Todos os arquivos (*.*)', extensions: ['*'] },
      ],
      properties: ['openFile'],
    });

    if (result.canceled || result.filePaths.length === 0) {
      return { canceled: true };
    }

    const filePath = result.filePaths[0]!;
    const fileName = path.basename(filePath);
    const fileContent = await fs.readFile(filePath, 'utf-8');

    return {
      canceled: false,
      filePath,
      fileName,
      fileContent,
    };
  }

  /**
   * Processa o conteúdo de um extrato (OFX ou JSON), categoriza automaticamente e identifica duplicidades
   */
  async parseStatement(
    fileContent: string,
    fileName?: string,
    accountId?: string
  ): Promise<ParsedStatement> {
    if (!fileContent || !fileContent.trim()) {
      throw new Error('O arquivo de extrato está vazio.');
    }

    const trimmed = fileContent.trim();
    let statement: ParsedStatement;

    // Detecta se é OFX ou JSON
    const isOfx =
      trimmed.includes('<OFX>') ||
      trimmed.includes('OFXHEADER') ||
      (fileName && (fileName.toLowerCase().endsWith('.ofx') || fileName.toLowerCase().endsWith('.qfx')));

    const isJson =
      trimmed.startsWith('{') ||
      trimmed.startsWith('[') ||
      (fileName && fileName.toLowerCase().endsWith('.json'));

    if (isOfx) {
      statement = parseOfx(fileContent);
    } else if (isJson) {
      statement = parseOpenFinanceJson(fileContent);
    } else {
      // Tenta OFX primeiro, se falhar tenta JSON
      try {
        statement = parseOfx(fileContent);
      } catch (errOfx) {
        try {
          statement = parseOpenFinanceJson(fileContent);
        } catch {
          throw new Error('Formato de arquivo não reconhecido. Suportamos arquivos .OFX e .JSON do Open Finance.');
        }
      }
    }

    // Enriquece transações com sugestão de categoria e detecção de duplicidade
    await this.enrichTransactions(statement, accountId);

    return statement;
  }

  /**
   * Enriquece cada transação com sugestões de categoria e checagem de duplicidade no banco
   */
  private async enrichTransactions(statement: ParsedStatement, accountId?: string): Promise<void> {
    const categories = await this.categoriesRepo.getAllCategories();
    const existingTransactions = await this.transactionsRepo.getAllTransactions(
      accountId ? { accountId } : undefined
    );

    for (const item of statement.transactions) {
      // 1. Sugestão inteligente de Categoria
      const matched = matchCategory(item.description, item.type, categories);
      if (matched.categoryId) {
        item.suggestedCategoryId = matched.categoryId;
        item.suggestedCategoryName = matched.categoryName;
      }

      // 2. Checagem de duplicidade
      const duplicate = this.findDuplicate(item, existingTransactions);
      if (duplicate) {
        item.isDuplicate = true;
        item.duplicateReason = duplicate.reason;
        item.selected = false; // Desmarcado por padrão para segurança do usuário
      } else {
        item.isDuplicate = false;
        item.selected = true;
      }
    }
  }

  /**
   * Verifica se uma transação do extrato já existe no banco de dados
   */
  private findDuplicate(
    candidate: ParsedStatementTransaction,
    existingList: Array<{
      date: Date;
      amountCents: number;
      description?: string;
      tags: string[];
    }>
  ): { reason: string } | null {
    // A. Match por FITID (Identificador único fornecido pelo banco)
    if (candidate.fitid) {
      const fitidTag = `fitid:${candidate.fitid}`;
      const hasFitidMatch = existingList.some(
        (t) => Array.isArray(t.tags) && t.tags.includes(fitidTag)
      );
      if (hasFitidMatch) {
        return { reason: `Transação já importada anteriormente (FITID: ${candidate.fitid})` };
      }
    }

    // B. Match por Data Exata + Valor Exato
    const candidateDateStr = candidate.date; // YYYY-MM-DD
    const exactMatch = existingList.find((t) => {
      const existingDateStr = t.date.toISOString().split('T')[0];
      const matchDate = existingDateStr === candidateDateStr;
      const matchAmount = Math.abs(t.amountCents) === candidate.absAmountCents;
      return matchDate && matchAmount;
    });

    if (exactMatch) {
      return {
        reason: `Transação com mesma data e valor já existe no sistema ("${exactMatch.description || 'Sem descrição'}")`,
      };
    }

    return null;
  }

  /**
   * Salva em lote as transações selecionadas no banco de dados SQLite local
   */
  async importTransactions(params: ImportTransactionsParams): Promise<ImportTransactionsResult> {
    const { accountId, transactions: toImport, updateAccountBalance } = params;

    if (!accountId) {
      throw new Error('Conta bancária de destino não especificada.');
    }

    const account = await this.accountsRepo.getAccountById(accountId);
    if (!account) {
      throw new Error('Conta de destino não encontrada.');
    }

    let importedCount = 0;
    let skippedCount = 0;

    for (const t of toImport) {
      if (!t.amountCents || t.amountCents === 0) {
        skippedCount++;
        continue;
      }

      const tags: string[] = ['OPEN_FINANCE', 'EXTRATO'];
      if (t.fitid) {
        tags.push(`fitid:${t.fitid}`);
      }

      // Cria a transação (o TransactionsRepository já atualiza o saldo da conta dinamicamente)
      await this.transactionsRepo.createTransaction({
        accountId,
        amountCents: Math.abs(t.amountCents),
        date: new Date(`${t.date}T12:00:00.000Z`), // Meio-dia UTC para evitar deslocamento de fuso
        description: t.description || 'Lançamento importado',
        categoryId: t.categoryId,
        type: t.type,
        status: t.status || 'PAID',
        tags,
      });

      importedCount++;
    }

    // Se o usuário solicitou atualizar explicitamente para o saldo informado no extrato
    let newAccountBalanceCents: number | undefined;
    if (updateAccountBalance) {
      const updatedAccount = await this.accountsRepo.getAccountById(accountId);
      newAccountBalanceCents = updatedAccount?.balanceCents;
    } else {
      const updatedAccount = await this.accountsRepo.getAccountById(accountId);
      newAccountBalanceCents = updatedAccount?.balanceCents;
    }

    return {
      importedCount,
      skippedCount,
      newAccountBalanceCents,
    };
  }
}

export const openFinanceService = new OpenFinanceService();
