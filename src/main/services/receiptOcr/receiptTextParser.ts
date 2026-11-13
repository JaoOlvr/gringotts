import type { ParsedReceipt, ReceiptDocumentType } from './types';

/**
 * Converte string monetária brasileira (ex: "1.250,50", "45,90", "120.00") para centavos inteiros
 */
export function parseBrlAmountToCents(amountStr: string): number {
  if (!amountStr) return 0;
  const clean = amountStr
    .trim()
    .replace(/[^\d,\.]/g, '')
    .replace(/\.(?=\d{3}(?:[,\.]\d{2})?$)/g, '') // remove separador de milhar ponto
    .replace(',', '.');

  const parsed = parseFloat(clean);
  return isNaN(parsed) ? 0 : Math.round(parsed * 100);
}

/**
 * Normaliza data encontrada para o formato ISO "YYYY-MM-DD"
 */
export function parseReceiptDate(dateStr: string): string | undefined {
  if (!dateStr) return undefined;
  // Match DD/MM/YYYY ou DD.MM.YYYY ou DD-MM-YYYY
  const matchFull = dateStr.match(/(\d{2})[\/\.-](\d{2})[\/\.-](\d{4})/);
  if (matchFull) {
    const [, day, month, year] = matchFull;
    const d = parseInt(day!, 10);
    const m = parseInt(month!, 10);
    const y = parseInt(year!, 10);
    if (d >= 1 && d <= 31 && m >= 1 && m <= 12 && y >= 2000 && y <= 2100) {
      return `${year}-${month}-${day}`;
    }
  }

  // Match DD/MM/YY
  const matchShort = dateStr.match(/(\d{2})[\/\.-](\d{2})[\/\.-](\d{2})/);
  if (matchShort) {
    const [, day, month, shortYear] = matchShort;
    const d = parseInt(day!, 10);
    const m = parseInt(month!, 10);
    const fullYear = `20${shortYear}`;
    if (d >= 1 && d <= 31 && m >= 1 && m <= 12) {
      return `${fullYear}-${month}-${day}`;
    }
  }

  return undefined;
}

/**
 * Analisa e extrai informações estruturadas a partir do texto obtido via OCR
 */
export function parseReceiptText(rawText: string): ParsedReceipt {
  if (!rawText || !rawText.trim()) {
    return {
      rawText: '',
      documentType: 'GENERIC_RECEIPT',
      confidence: 0,
    };
  }

  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const upperText = rawText.toUpperCase();

  // 1. Identificar Tipo de Documento
  let documentType: ReceiptDocumentType = 'GENERIC_RECEIPT';
  if (upperText.includes('PIX') || upperText.includes('TRANSFERENCIA PIX') || upperText.includes('PAGAMENTO PIX')) {
    documentType = 'PIX_RECEIPT';
  } else if (
    upperText.includes('NFC-E') ||
    upperText.includes('DANFE') ||
    upperText.includes('SAT') ||
    upperText.includes('CUPOM FISCAL') ||
    upperText.includes('DOCUMENTO AUXILIAR') ||
    upperText.includes('EXTRATO NO.') ||
    upperText.includes('CHAVE DE ACESSO')
  ) {
    documentType = 'NFCE_SAT';
  } else if (
    upperText.includes('VIA CLIENTE') ||
    upperText.includes('CIELO') ||
    upperText.includes('REDE') ||
    upperText.includes('STONE') ||
    upperText.includes('PAGSEGURO') ||
    upperText.includes('GETNET') ||
    upperText.includes('CARTAO DE DEBITO') ||
    upperText.includes('CARTAO DE CREDITO')
  ) {
    documentType = 'CARD_SLIP';
  }

  // 2. Extrair CNPJ
  let cnpj: string | undefined;
  const cnpjMatch = rawText.match(/\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}/) || rawText.match(/CNPJ[:\s]*(\d{14})/i);
  if (cnpjMatch) {
    cnpj = cnpjMatch[0].replace(/CNPJ[:\s]*/i, '').trim();
  }

  // 3. Extrair Valor Total (Amount)
  let amountCents: number | undefined;

  // Regex prioritárias para valores com palavras-chave de total / valor
  const totalAmountRegexes = [
    // TOTAL A PAGAR R$ 123,45 ou TOTAL R$ 123,45
    /(?:TOTAL\s*(?:A\s*PAGAR|LIQUIDO|LÍQUIDO)?|VALOR\s*(?:TOTAL|PAGO|RECEBIDO|LIQUIDO|LÍQUIDO|DA\s*TRANSFERENCIA|DA\s*TRANSFERÊNCIA|DO\s*PIX)?)\s*[:=]?\s*R?\$?\s*([0-9]{1,3}(?:\.[0-9]{3})*,[0-9]{2})/i,
    /(?:TOTAL|VALOR)\s*[:=]?\s*R?\$?\s*([0-9]+,[0-9]{2})/i,
    /(?:VALOR\s*A\s*PAGAR|VLR\s*TOTAL)\s*[:=]?\s*R?\$?\s*([0-9\.\,]+)/i,
    /R\$\s*([0-9]{1,3}(?:\.[0-9]{3})*,[0-9]{2})/,
  ];

  for (const regex of totalAmountRegexes) {
    const match = rawText.match(regex);
    if (match && match[1]) {
      const cents = parseBrlAmountToCents(match[1]);
      if (cents > 0) {
        amountCents = cents;
        break;
      }
    }
  }

  // Fallback: se não achou com palavra-chave, busca o último valor com R$ ou padrão monetário do texto
  if (!amountCents) {
    const allPricesMatches = Array.from(rawText.matchAll(/R?\$?\s*([0-9]{1,3}(?:\.[0-9]{3})*,[0-9]{2})/g));
    if (allPricesMatches.length > 0) {
      // Pega o maior valor encontrado ou o último (normalmente o total fica no fim do cupom)
      const candidates = allPricesMatches
        .map((m) => parseBrlAmountToCents(m[1]!))
        .filter((c) => c > 0);
      if (candidates.length > 0) {
        amountCents = Math.max(...candidates);
      }
    }
  }

  // 4. Extrair Data
  let date: string | undefined;
  let rawDate: string | undefined;

  // Prioriza datas próximas a palavras-chave de emissão / data
  const datePatterns = [
    /(?:DATA|EMISS[AÃ]O|EMITIDO|REALIZADO\s*EM|DATA\/HORA|DATA\s*DO\s*PAGAMENTO)\s*[:=]?\s*(\d{2}[\/\.-]\d{2}[\/\.-]\d{2,4})/i,
    /(\d{2}[\/\.-]\d{2}[\/\.-]\d{4})/,
    /(\d{2}[\/\.-]\d{2}[\/\.-]\d{2})/,
  ];

  for (const pattern of datePatterns) {
    const m = rawText.match(pattern);
    if (m && m[1]) {
      const parsed = parseReceiptDate(m[1]);
      if (parsed) {
        date = parsed;
        rawDate = m[1];
        break;
      }
    }
  }

  // 5. Extrair Estabelecimento / Beneficiário (Merchant Name)
  let merchantName: string | undefined;

  if (documentType === 'PIX_RECEIPT') {
    // No Pix: busca por "Destinatário:", "Para:", "Nome do Favorecido:", etc.
    const pixNameRegex = /(?:DESTINAT[AÁ]RIO|FAVORECIDO|PAGO\s*A|BENEFICI[AÁ]RIO|RECEBEDOR|PARA)\s*[:=]?\s*([^\r\n]{3,50})/i;
    const match = rawText.match(pixNameRegex);
    if (match && match[1]) {
      merchantName = match[1].replace(/CPF\/CNPJ.*$/i, '').trim();
    }
  }

  // Para cupons fiscais ou fallback:
  if (!merchantName) {
    // Ignora linhas de cabeçalho padrão
    const ignoreHeaderWords = [
      'NFC-E', 'DANFE', 'DOCUMENTO AUXILIAR', 'CUPOM FISCAL', 'EXTRATO',
      'CHAVE DE ACESSO', 'CONSULTE PELA CHAVE', 'CNPJ', 'VIA CLIENTE', 'COMPROVANTE',
      'AUTENTICACAO', 'SISTEMA', 'EMISSAO', 'SAT', 'PROTOCOLO',
      'CIELO', 'REDE', 'REDECARD', 'STONE', 'PAGSEGURO', 'PAGBANK', 'GETNET',
      'SAFRA', 'SIPAG', 'BIN', 'VERIFONE', 'INGENICO'
    ];

    for (const line of lines.slice(0, 6)) {
      const lineUpper = line.toUpperCase();
      const hasIgnoredWord = ignoreHeaderWords.some((w) => lineUpper.includes(w));
      const hasLetters = /[A-Za-zÀ-ÖØ-öø-ÿ]/.test(line);
      const isNotCnpj = !/^\d{2}\.\d{3}/.test(line);

      if (!hasIgnoredWord && hasLetters && isNotCnpj && line.length >= 3 && line.length <= 60) {
        merchantName = line.trim();
        break;
      }
    }
  }

  // Limpeza de sufixos de razão social comuns
  if (merchantName) {
    merchantName = merchantName
      .replace(/^[\s\-\*\.\:\_]+/, '')
      .replace(/[\s\-\*\.\:\_]+$/, '')
      .trim();
  }

  // Calcula confiança do OCR
  let confidence = 40;
  if (amountCents && amountCents > 0) confidence += 30;
  if (date) confidence += 15;
  if (merchantName) confidence += 15;

  return {
    rawText,
    merchantName,
    amountCents,
    date,
    rawDate,
    cnpj,
    documentType,
    confidence: Math.min(100, confidence),
  };
}
