import { describe, it, expect } from 'vitest';
import { hashSecret, verifySecret } from '../src/main/services/cryptoService';

describe('Segurança de Contas / Carteiras (PIN e Senha)', () => {
  it('deve gerar hash e salt válidos para um PIN numérico', () => {
    const pin = '1234';
    const { hash, salt } = hashSecret(pin);

    expect(hash).toBeDefined();
    expect(salt).toBeDefined();
    expect(hash.length).toBeGreaterThan(20);
    expect(salt.length).toBeGreaterThan(10);
  });

  it('deve validar com sucesso o PIN correto', () => {
    const pin = '9876';
    const { hash, salt } = hashSecret(pin);

    const isValid = verifySecret('9876', hash, salt);
    expect(isValid).toBe(true);
  });

  it('deve rejeitar PIN incorreto', () => {
    const pin = '1122';
    const { hash, salt } = hashSecret(pin);

    const isValid = verifySecret('1123', hash, salt);
    expect(isValid).toBe(false);
  });

  it('deve gerar hash e salt válidos para uma Senha Padrão alfanumérica complexa', () => {
    const password = 'MinhaSenhaForte@2026!';
    const { hash, salt } = hashSecret(password);

    expect(verifySecret('MinhaSenhaForte@2026!', hash, salt)).toBe(true);
    expect(verifySecret('senhaerrada', hash, salt)).toBe(false);
  });

  it('dois hashes para o mesmo segredo devem ser diferentes devido ao salt aleatório', () => {
    const secret = 'segredo123';
    const result1 = hashSecret(secret);
    const result2 = hashSecret(secret);

    expect(result1.salt).not.toBe(result2.salt);
    expect(result1.hash).not.toBe(result2.hash);

    expect(verifySecret(secret, result1.hash, result1.salt)).toBe(true);
    expect(verifySecret(secret, result2.hash, result2.salt)).toBe(true);
  });

  describe('Regra de Confirmação para Exclusão de Contas Trancadas', () => {
    it('deve autorizar exclusão quando o PIN estiver correto', () => {
      const pin = '4321';
      const { hash, salt } = hashSecret(pin);

      const canDelete = verifySecret('4321', hash, salt);
      expect(canDelete).toBe(true);
    });

    it('deve impedir exclusão quando o PIN estiver incorreto', () => {
      const pin = '4321';
      const { hash, salt } = hashSecret(pin);

      const canDelete = verifySecret('0000', hash, salt);
      expect(canDelete).toBe(false);
    });

    it('deve autorizar exclusão quando a senha padrão estiver correta', () => {
      const pass = 'MinhaContaSegura#1';
      const { hash, salt } = hashSecret(pass);

      const canDelete = verifySecret('MinhaContaSegura#1', hash, salt);
      expect(canDelete).toBe(true);
    });

    it('deve impedir exclusão quando a senha padrão estiver incorreta', () => {
      const pass = 'MinhaContaSegura#1';
      const { hash, salt } = hashSecret(pass);

      const canDelete = verifySecret('senhaErrada', hash, salt);
      expect(canDelete).toBe(false);
    });
  });
});
