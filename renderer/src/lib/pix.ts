/**
 * Utilitário para geração do payload oficial do Pix (Padrão BR Code / EMVCo do Banco Central do Brasil)
 */

function crc16(payload: string): string {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ 0x1021) & 0xffff;
      } else {
        crc = (crc << 1) & 0xffff;
      }
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

function formatField(id: string, value: string): string {
  const len = value.length.toString().padStart(2, '0');
  return `${id}${len}${value}`;
}

export interface PixPayloadOptions {
  key: string;
  name?: string;
  city?: string;
  amount?: number;
  txId?: string;
}

export const PIX_KEY_DEFAULT = '98f9686d-f217-4db7-b684-d7385a51133e';

export function generatePixPayload({
  key = PIX_KEY_DEFAULT,
  name = 'Joao Oliveira',
  city = 'BRASIL',
  amount,
  txId = '***',
}: PixPayloadOptions): string {
  // 00: GUI do Pix
  // 01: Chave Pix
  const accountInfo = formatField('00', 'br.gov.bcb.pix') + formatField('01', key);

  // 05: Reference Label / TxID
  const additionalData = formatField('05', txId);

  let raw =
    formatField('00', '01') + // Payload Format Indicator
    formatField('26', accountInfo) + // Merchant Account Information
    formatField('52', '0000') + // Merchant Category Code
    formatField('53', '986'); // Transaction Currency (986 = BRL)

  if (amount !== undefined && amount > 0) {
    raw += formatField('54', amount.toFixed(2));
  }

  raw +=
    formatField('58', 'BR') + // Country Code
    formatField('59', name.substring(0, 25).normalize('NFD').replace(/[\u0300-\u036f]/g, '')) + // Merchant Name
    formatField('60', city.substring(0, 15).normalize('NFD').replace(/[\u0300-\u036f]/g, '')) + // Merchant City
    formatField('62', additionalData) + // Additional Data Template
    '6304'; // CRC16 Header

  const checksum = crc16(raw);
  return raw + checksum;
}
