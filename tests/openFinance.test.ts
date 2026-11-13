import { describe, it, expect } from 'vitest';
import { parseOfx, parseOfxDate, parseAmountToCents } from '../src/main/services/openFinance/ofxParser';
import { parseOpenFinanceJson } from '../src/main/services/openFinance/openFinanceParser';
import { matchCategory } from '../src/main/services/openFinance/categoryMatcher';

describe('Open Finance & OFX Parser', () => {
  describe('Utilitários de Parsing (Datas e Valores)', () => {
    it('deve converter datas OFX com timezone para YYYY-MM-DD', () => {
      expect(parseOfxDate('20261025120000[-03:EST]')).toBe('2026-10-25');
      expect(parseOfxDate('20260105')).toBe('2026-01-05');
      expect(parseOfxDate('20261113093000')).toBe('2026-11-13');
    });

    it('deve converter valores monetários em formato texto para centavos inteiros', () => {
      expect(parseAmountToCents('-45.90')).toBe(-4590);
      expect(parseAmountToCents('3500.00')).toBe(350000);
      expect(parseAmountToCents('-120,50')).toBe(-12050);
      expect(parseAmountToCents('0')).toBe(0);
      expect(parseAmountToCents('')).toBe(0);
    });
  });

  describe('OFX SGML Parser (Padrão Bancos Brasileiros)', () => {
    const SAMPLE_NUBANK_OFX = `
OFXHEADER:100
DATA:OFXSGML
VERSION:102
SECURITY:NONE
ENCODING:UTF-8
CHARSET:1252
COMPRESSION:NONE
OLDFILEUID:NONE
NEWFILEUID:NONE

<OFX>
<SIGNONMSGSRSV1>
<SONRS>
<STATUS>
<CODE>0
<SEVERITY>INFO
</STATUS>
<DTSERVER>20261113120000[-03:EST]
<LANGUAGE>POR
<FI>
<ORG>Nu Pagamentos S.A.
<FID>260
</FI>
</SONRS>
</SIGNONMSGSRSV1>
<BANKMSGSRSV1>
<STMTTRNRS>
<TRNUID>1001
<STATUS>
<CODE>0
<SEVERITY>INFO
</STATUS>
<STMTRS>
<CURDEF>BRL
<BANKACCTFROM>
<BANKID>260
<ACCTID>998877-1
<ACCTTYPE>CHECKING
</BANKACCTFROM>
<BANKTRANLIST>
<DTSTART>20261001120000[-03:EST]
<DTEND>20261031120000[-03:EST]
<STMTTRN>
<TRNTYPE>DEBIT
<DTPOSTED>20261005120000[-03:EST]
<TRNAMT>-32.50
<FITID>nu-20261005-001
<MEMO>IFOOD *RESTAURANTE
</STMTTRN>
<STMTTRN>
<TRNTYPE>CREDIT
<DTPOSTED>20261006120000[-03:EST]
<TRNAMT>5000.00
<FITID>nu-20261006-002
<MEMO>PIX RECEBIDO - SALARIO
</STMTTRN>
<STMTTRN>
<TRNTYPE>DEBIT
<DTPOSTED>20261010120000[-03:EST]
<TRNAMT>-150.00
<FITID>nu-20261010-003
<MEMO>POSTO IPIRANGA
</STMTTRN>
</BANKTRANLIST>
<LEDGERBAL>
<BALAMT>4817.50
<DTASOF>20261031120000[-03:EST]
</LEDGERBAL>
</STMTRS>
</STMTTRNRS>
</BANKMSGSRSV1>
</OFX>
    `;

    it('deve extrair metadados da instituição financeira e da conta', () => {
      const parsed = parseOfx(SAMPLE_NUBANK_OFX);
      expect(parsed.bankId).toBe('260');
      expect(parsed.bankName).toContain('Nubank');
      expect(parsed.accountNumber).toBe('998877-1');
      expect(parsed.accountType).toBe('checking');
      expect(parsed.currency).toBe('BRL');
      expect(parsed.startDate).toBe('2026-10-01');
      expect(parsed.endDate).toBe('2026-10-31');
      expect(parsed.ledgerBalanceCents).toBe(481750);
    });

    it('deve extrair todas as transações com tipos e valores corretos', () => {
      const parsed = parseOfx(SAMPLE_NUBANK_OFX);
      expect(parsed.transactions).toHaveLength(3);

      const ifood = parsed.transactions.find((t) => t.fitid === 'nu-20261005-001');
      expect(ifood).toBeDefined();
      expect(ifood?.type).toBe('EXPENSE');
      expect(ifood?.amountCents).toBe(-3250);
      expect(ifood?.absAmountCents).toBe(3250);
      expect(ifood?.description).toBe('IFOOD *RESTAURANTE');
      expect(ifood?.date).toBe('2026-10-05');

      const salario = parsed.transactions.find((t) => t.fitid === 'nu-20261006-002');
      expect(salario).toBeDefined();
      expect(salario?.type).toBe('INCOME');
      expect(salario?.amountCents).toBe(500000);
      expect(salario?.absAmountCents).toBe(500000);
      expect(salario?.date).toBe('2026-10-06');

      expect(parsed.totalExpenseCents).toBe(18250); // 32.50 + 150.00
      expect(parsed.totalIncomeCents).toBe(500000); // 5000.00
    });
  });

  describe('OFX XML Parser (Tags fechadas e cartões)', () => {
    const SAMPLE_XML_OFX = `
<OFX>
  <BANKMSGSRSV1>
    <STMTTRNRS>
      <STMTRS>
        <BANKACCTFROM>
          <BANKID>077</BANKID>
          <ACCTID>12345-6</ACCTID>
        </BANKACCTFROM>
        <BANKTRANLIST>
          <STMTTRN>
            <TRNTYPE>DEBIT</TRNTYPE>
            <DTPOSTED>20261101</DTPOSTED>
            <TRNAMT>-89.90</TRNAMT>
            <FITID>inter-001</FITID>
            <NAME>DROGASIL 102</NAME>
            <MEMO>Compra com cartão de débito</MEMO>
          </STMTTRN>
        </BANKTRANLIST>
      </STMTRS>
    </STMTTRNRS>
  </BANKMSGSRSV1>
</OFX>
    `;

    it('deve analisar XML com tags fechadas e compor nome + memo', () => {
      const parsed = parseOfx(SAMPLE_XML_OFX);
      expect(parsed.bankId).toBe('077');
      expect(parsed.bankName).toContain('Banco Inter');
      expect(parsed.transactions).toHaveLength(1);
      expect(parsed.transactions[0]!.description).toContain('DROGASIL 102');
      expect(parsed.transactions[0]!.amountCents).toBe(-8990);
      expect(parsed.transactions[0]!.type).toBe('EXPENSE');
    });
  });

  describe('Open Finance Brasil JSON Parser', () => {
    const SAMPLE_OPEN_FINANCE_JSON = JSON.stringify({
      brandName: 'Banco Inter Open Finance',
      accountNumber: '987654',
      currency: 'BRL',
      transactions: [
        {
          transactionId: 'of-tx-001',
          transactionDate: '2026-10-18T10:00:00Z',
          amount: -120.00,
          type: 'DEBIT',
          description: 'SUPERMERCADO PAO DE ACUCAR',
        },
        {
          transactionId: 'of-tx-002',
          transactionDate: '2026-10-19T14:30:00Z',
          amount: 1500.00,
          type: 'CREDIT',
          description: 'PAGAMENTO FREELANCE PROJETO',
        }
      ]
    });

    it('deve analisar JSON padrão Open Finance Brasil com transações e valores em centavos', () => {
      const parsed = parseOpenFinanceJson(SAMPLE_OPEN_FINANCE_JSON);
      expect(parsed.bankName).toBe('Banco Inter Open Finance');
      expect(parsed.accountNumber).toBe('987654');
      expect(parsed.transactions).toHaveLength(2);

      const mercado = parsed.transactions.find((t) => t.fitid === 'of-tx-001');
      expect(mercado?.type).toBe('EXPENSE');
      expect(mercado?.absAmountCents).toBe(12000);
      expect(mercado?.date).toBe('2026-10-18');

      const freela = parsed.transactions.find((t) => t.fitid === 'of-tx-002');
      expect(freela?.type).toBe('INCOME');
      expect(freela?.absAmountCents).toBe(150000);
      expect(freela?.date).toBe('2026-10-19');
    });
  });

  describe('Classificação Automática de Categorias por Palavras-Chave', () => {
    const categories = [
      { id: 'cat-rest', name: 'Restaurantes e Delivery', type: 'EXPENSE' },
      { id: 'cat-mercado', name: 'Supermercado e Feira', type: 'EXPENSE' },
      { id: 'cat-transp', name: 'Transporte & Combustível', type: 'EXPENSE' },
      { id: 'cat-moradia', name: 'Aluguel & Contas da Casa', type: 'EXPENSE' },
      { id: 'cat-saude', name: 'Saúde e Farmácia', type: 'EXPENSE' },
      { id: 'cat-lazer', name: 'Lazer e Streaming', type: 'EXPENSE' },
      { id: 'cat-compras', name: 'Compras e Vestuário', type: 'EXPENSE' },
      { id: 'cat-salario', name: 'Salário & Remuneração', type: 'INCOME' },
      { id: 'cat-renda-extra', name: 'Freelance e Renda Extra', type: 'INCOME' },
    ];

    it('deve categorizar iFood para Restaurantes e Delivery', () => {
      const match = matchCategory('IFOOD *SAO PAULO BR', 'EXPENSE', categories);
      expect(match.categoryId).toBe('cat-rest');
      expect(match.categoryName).toBe('Restaurantes e Delivery');
    });

    it('deve categorizar Uber para Transporte & Combustível', () => {
      const match = matchCategory('UBER *TRIP SAO PAULO', 'EXPENSE', categories);
      expect(match.categoryId).toBe('cat-transp');
    });

    it('deve categorizar Drogasil / Farmácia para Saúde e Farmácia', () => {
      const match = matchCategory('DROGASIL FILIAL 312', 'EXPENSE', categories);
      expect(match.categoryId).toBe('cat-saude');
    });

    it('deve categorizar Netflix / Spotify para Lazer e Streaming', () => {
      const match = matchCategory('NETFLIX.COM MENSL', 'EXPENSE', categories);
      expect(match.categoryId).toBe('cat-lazer');
    });

    it('deve categorizar Salário para Salário & Remuneração', () => {
      const match = matchCategory('TED RECEBIDA - PAGAMENTO SALARIO EMPRESA', 'INCOME', categories);
      expect(match.categoryId).toBe('cat-salario');
    });

    it('deve categorizar Atacadão / Supermercado para Supermercado e Feira', () => {
      const match = matchCategory('COMPRA ATACADAO SP', 'EXPENSE', categories);
      expect(match.categoryId).toBe('cat-mercado');
    });
  });
});

