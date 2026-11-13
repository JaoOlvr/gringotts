import { dialog, BrowserWindow, app } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import { createWorker } from 'tesseract.js';
import { parseReceiptText } from './receiptTextParser';
import type { ParsedReceipt } from './types';
import { matchCategory } from '../openFinance/categoryMatcher';
import { CategoriesRepository } from '../../repositories/categoriesRepository';

export class ReceiptOcrService {
  private categoriesRepo = new CategoriesRepository();

  /**
   * Localiza a pasta contendo os modelos treinados do Tesseract (tessdata) de forma resiliente
   */
  private getTessdataPath(): string {
    const candidatePaths = [
      path.join(process.cwd(), 'resources', 'tessdata'),
      path.join(app ? app.getAppPath() : process.cwd(), 'resources', 'tessdata'),
      process.resourcesPath ? path.join(process.resourcesPath, 'tessdata') : '',
      process.resourcesPath ? path.join(process.resourcesPath, 'resources', 'tessdata') : '',
      '/usr/share/tessdata',
    ].filter(Boolean);

    for (const p of candidatePaths) {
      if (fs.existsSync(p) && (fs.existsSync(path.join(p, 'por.traineddata')) || fs.existsSync(path.join(p, 'eng.traineddata')))) {
        return p;
      }
    }

    return path.join(process.cwd(), 'resources', 'tessdata');
  }

  /**
   * Abre o diálogo nativo do sistema operacional para o usuário selecionar uma foto ou imagem de comprovante
   */
  async selectReceiptImage(): Promise<{
    canceled: boolean;
    filePath?: string;
    fileName?: string;
    fileBase64?: string;
  }> {
    const focusedWindow = BrowserWindow.getFocusedWindow() || undefined;
    const result = await dialog.showOpenDialog(focusedWindow as any, {
      title: 'Selecionar Comprovante ou Nota Fiscal',
      buttonLabel: 'Escanear Imagem',
      filters: [
        {
          name: 'Imagens de Comprovantes (*.png, *.jpg, *.jpeg, *.webp)',
          extensions: ['png', 'jpg', 'jpeg', 'webp', 'bmp'],
        },
        { name: 'Todos os arquivos (*.*)', extensions: ['*'] },
      ],
      properties: ['openFile'],
    });

    if (result.canceled || result.filePaths.length === 0) {
      return { canceled: true };
    }

    const filePath = result.filePaths[0]!;
    const fileName = path.basename(filePath);
    const buffer = await fs.promises.readFile(filePath);
    const mime = filePath.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';
    const fileBase64 = `data:${mime};base64,${buffer.toString('base64')}`;

    return {
      canceled: false,
      filePath,
      fileName,
      fileBase64,
    };
  }

  /**
   * Executa o OCR 100% local e offline sobre a imagem do comprovante e extrai os campos estruturados
   */
  async scanReceipt(imageInput: string | Buffer): Promise<ParsedReceipt> {
    const tessdataPath = this.getTessdataPath();
    const hasPortuguese = fs.existsSync(path.join(tessdataPath, 'por.traineddata'));
    const lang = hasPortuguese ? 'por' : 'eng';

    let worker: any = null;
    let extractedText = '';

    try {
      worker = await createWorker(lang, 1, {
        langPath: tessdataPath,
        cachePath: tessdataPath,
        gzip: false,
        logger: () => {},
      });

      // Se for data URL em base64, converte para Buffer para o Tesseract
      let imageBuffer: Buffer | string = imageInput;
      if (typeof imageInput === 'string' && imageInput.startsWith('data:')) {
        const base64Data = imageInput.replace(/^data:image\/\w+;base64,/, '');
        imageBuffer = Buffer.from(base64Data, 'base64');
      }

      const ret = await worker.recognize(imageBuffer);
      extractedText = ret.data.text || '';
    } catch (err: any) {
      console.error('Erro durante execução do OCR local:', err);
      throw new Error(`Falha no OCR offline: ${err?.message || 'Não foi possível ler a imagem'}`);
    } finally {
      if (worker) {
        await worker.terminate();
      }
    }

    // 1. Extrai campos do texto lido
    const parsed = parseReceiptText(extractedText);

    // 2. Busca categorias do usuário para sugerir categoria inteligente
    try {
      const categories = await this.categoriesRepo.getAllCategories();
      const matched = matchCategory(
        parsed.merchantName || parsed.rawText,
        'EXPENSE',
        categories
      );
      if (matched.categoryId) {
        parsed.suggestedCategoryId = matched.categoryId;
        parsed.suggestedCategoryName = matched.categoryName;
      }
    } catch (catErr) {
      console.warn('Erro ao sugerir categoria para o comprovante:', catErr);
    }

    return parsed;
  }
}

export const receiptOcrService = new ReceiptOcrService();
