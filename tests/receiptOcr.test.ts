import { describe, it, expect } from 'vitest';
import { 
  parseBrlAmountToCents, 
  parseReceiptDate, 
  parseReceiptText 
} from '../src/main/services/receiptOcr/receiptTextParser';

describe('Leitor de Notas Fiscais e Comprovantes (OCR Parser)', () => {
  describe('Utilitários de Valores e Datas', () => {
    it('deve converter valores em formato brasileiro para centavos inteiros', () => {
      expect(parseBrlAmountToCents('45,90')).toBe(4590);
      expect(parseBrlAmountToCents('R$ 1.250,00')).toBe(125000);
      expect(parseBrlAmountToCents('89.90')).toBe(8990);
      expect(parseBrlAmountToCents('0,00')).toBe(0);
      expect(parseBrlAmountToCents('')).toBe(0);
    });

    it('deve converter datas brasileiras (DD/MM/AAAA e DD/MM/AA) para formato ISO YYYY-MM-DD', () => {
      expect(parseReceiptDate('13/11/2026')).toBe('2026-11-13');
      expect(parseReceiptDate('05-10-2026')).toBe('2026-10-05');
      expect(parseReceiptDate('25/12/26')).toBe('2026-12-25');
      expect(parseReceiptDate('invalid')).toBeUndefined();
    });
  });

  describe('Cupom Fiscal NFC-e / SAT', () => {
    const SAMPLE_NFCE = `
SUPERMERCADO CARREFOUR LTDA
CNPJ: 45.543.915/0001-81
DANFE NFC-e - Documento Auxiliar da Nota Fiscal de Consumidor Eletrônica
Não permite aproveitamento de crédito de ICMS

ITEM CODIGO DESCRICAO QTD UN VL UNIT VL TOTAL
001 789123 CAFE TRADICIONAL 500G 1 UN 18,90 18,90
002 789456 LEITE INTEGRAL 1L 2 UN 5,50 11,00

QTD. TOTAL DE ITENS: 2
VALOR TOTAL R$ 29,90
FORMA DE PAGAMENTO: CARTAO DE DEBITO
VALOR PAGO R$ 50,00
TROCO R$ 20,10

EMISSAO: 13/11/2026 15:30:00
CHAVE DE ACESSO: 3526 1145 5439 1500 0181 6500 1000 0012 3410 0000 1234
    `;

    it('deve extrair dados completos do cupom fiscal eletrônico', () => {
      const parsed = parseReceiptText(SAMPLE_NFCE);

      expect(parsed.documentType).toBe('NFCE_SAT');
      expect(parsed.merchantName).toBe('SUPERMERCADO CARREFOUR LTDA');
      expect(parsed.amountCents).toBe(2990); // R$ 29,90
      expect(parsed.date).toBe('2026-11-13');
      expect(parsed.cnpj).toBe('45.543.915/0001-81');
      expect(parsed.confidence).toBeGreaterThanOrEqual(80);
    });
  });

  describe('Comprovante de Transferência Pix', () => {
    const SAMPLE_PIX = `
Comprovante de Transferência Pix
Data da transferência: 10/11/2026 - 14:22:15
Valor: R$ 85,50
Destinatário: Restaurante Fogão Mineiro
Instituição: Banco Inter S.A.
Chave Pix: 12345678900
ID da Transação: E0041696820261110142215
    `;

    it('deve extrair dados do comprovante Pix', () => {
      const parsed = parseReceiptText(SAMPLE_PIX);

      expect(parsed.documentType).toBe('PIX_RECEIPT');
      expect(parsed.merchantName).toContain('Restaurante Fogão Mineiro');
      expect(parsed.amountCents).toBe(8550); // R$ 85,50
      expect(parsed.date).toBe('2026-11-10');
      expect(parsed.confidence).toBeGreaterThanOrEqual(80);
    });
  });

  describe('Comprovante de Maquininha de Cartão', () => {
    const SAMPLE_CARD = `
CIELO
DROGARIA SAO PAULO S/A
VIA CLIENTE
CARTAO DE DEBITO
VALOR: R$ 42,30
DATA: 08/11/2026 18:40
AUTORIZACAO: 123456
    `;

    it('deve extrair dados do comprovante de cartão', () => {
      const parsed = parseReceiptText(SAMPLE_CARD);

      expect(parsed.documentType).toBe('CARD_SLIP');
      expect(parsed.merchantName).toBe('DROGARIA SAO PAULO S/A');
      expect(parsed.amountCents).toBe(4230); // R$ 42,30
      expect(parsed.date).toBe('2026-11-08');
      expect(parsed.confidence).toBeGreaterThanOrEqual(80);
    });
  });
});
