export type ReceiptDocumentType = 'NFCE_SAT' | 'PIX_RECEIPT' | 'CARD_SLIP' | 'GENERIC_RECEIPT';

export interface ParsedReceipt {
  rawText: string;
  merchantName?: string;
  amountCents?: number;
  date?: string; // "YYYY-MM-DD"
  rawDate?: string;
  cnpj?: string;
  documentType: ReceiptDocumentType;
  suggestedCategoryId?: string;
  suggestedCategoryName?: string;
  confidence: number;
}
