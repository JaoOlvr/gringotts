import { ipcMain } from 'electron';
import { z } from 'zod';
import { receiptOcrService } from '../../services/receiptOcr/receiptOcrService';

const scanReceiptSchema = z.object({
  imageInput: z.string().min(1, 'Imagem é obrigatória'),
});

export function registerReceiptHandlers() {
  // Abre o seletor nativo de imagem de comprovante
  ipcMain.handle('receipt:selectFile', async () => {
    try {
      return await receiptOcrService.selectReceiptImage();
    } catch (error: any) {
      console.error('Erro ao selecionar imagem do comprovante:', error);
      throw new Error(error.message || 'Falha ao selecionar arquivo');
    }
  });

  // Executa o OCR offline sobre a imagem fornecida (caminho local ou base64)
  ipcMain.handle('receipt:scanReceipt', async (_event, payload: unknown) => {
    try {
      const { imageInput } = scanReceiptSchema.parse(payload);
      return await receiptOcrService.scanReceipt(imageInput);
    } catch (error: any) {
      console.error('Erro ao processar OCR do comprovante:', error);
      throw new Error(error.message || 'Falha ao escanear comprovante');
    }
  });
}
