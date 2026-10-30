import { describe, it, expect } from 'vitest';
import { generatePixPayload, PIX_KEY_DEFAULT } from '../renderer/src/lib/pix';

describe('Pix Payload Generator', () => {
  it('deve gerar payload Pix válido para a chave padrão', () => {
    const payload = generatePixPayload({
      key: PIX_KEY_DEFAULT,
      name: 'Joao Oliveira',
      city: 'BRASIL',
    });

    expect(payload).toContain('br.gov.bcb.pix');
    expect(payload).toContain(PIX_KEY_DEFAULT);
    expect(payload).toContain('5802BR');
    expect(payload.startsWith('000201')).toBe(true);
    // Deve terminar com o indicador 6304 + 4 caracteres hexadecimais do checksum CRC16
    expect(payload).toMatch(/6304[0-9A-F]{4}$/);
  });

  it('deve incluir valor quando fornecido', () => {
    const payload = generatePixPayload({
      key: PIX_KEY_DEFAULT,
      amount: 15.5,
    });

    expect(payload).toContain('540515.50');
    expect(payload).toMatch(/6304[0-9A-F]{4}$/);
  });

  it('deve normalizar acentos no nome e cidade para compatibilidade EMVCo', () => {
    const payload = generatePixPayload({
      key: PIX_KEY_DEFAULT,
      name: 'João Oliveira',
      city: 'São Paulo',
    });

    expect(payload).toContain('Joao Oliveira');
    expect(payload).toContain('Sao Paulo');
    expect(payload).not.toContain('ã');
  });
});
