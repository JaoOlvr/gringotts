import { describe, it, expect, afterEach } from 'vitest';
import {
  generatePairingCode,
  normalizePairingCode,
  encryptPayload,
  decryptPayload,
} from '../src/main/services/p2pSync/p2pCrypto';
import {
  getLocalIpAddresses,
  getPrimaryLocalIp,
} from '../src/main/services/p2pSync/networkUtils';
import { P2pSyncService } from '../src/main/services/p2pSync/p2pSyncService';

describe('Sincronização P2P (Ponta-a-Ponta) Offline', () => {
  describe('Criptografia AES-256-GCM & Código de Pareamento', () => {
    it('deve gerar código de pareamento no formato XXX-XXX (6 dígitos)', () => {
      const code = generatePairingCode();
      expect(code).toMatch(/^\d{3}-\d{3}$/);
    });

    it('deve normalizar códigos removendo espaços e hífens', () => {
      expect(normalizePairingCode('123-456')).toBe('123456');
      expect(normalizePairingCode(' 123 - 456 ')).toBe('123456');
      expect(normalizePairingCode('abc-def')).toBe('ABCDEF');
    });

    it('deve criptografar e descriptografar dados complexos com sucesso', () => {
      const sampleData = {
        deviceId: 'pc-sala-linux',
        exportedAt: 1731500000000,
        accounts: [
          { id: 'acc-1', name: 'Nubank Conta', balance_cents: 154050, currency: 'BRL' },
          { id: 'acc-2', name: 'Itaú Corrente', balance_cents: 35000, currency: 'BRL' },
        ],
        transactions: [
          { id: 'tx-1', amount_cents: -4500, description: 'Supermercado Pão de Açúcar', type: 'EXPENSE' },
          { id: 'tx-2', amount_cents: 500000, description: 'Salário Mensal', type: 'INCOME' },
        ],
        debts: [
          { id: 'debt-1', name: 'Financiamento', remaining_amount_cents: 1200000 },
        ],
      };

      const pairingCode = '742-198';
      const envelope = encryptPayload(sampleData, pairingCode);

      expect(envelope.salt).toBeDefined();
      expect(envelope.iv).toBeDefined();
      expect(envelope.authTag).toBeDefined();
      expect(envelope.ciphertext).toBeDefined();

      const decrypted = decryptPayload<typeof sampleData>(envelope, pairingCode);
      expect(decrypted).toEqual(sampleData);
      expect(decrypted.accounts[0]!.name).toBe('Nubank Conta');
      expect(decrypted.transactions[0]!.amount_cents).toBe(-4500);
    });

    it('deve recusar a descriptografia se o código de pareamento estiver errado', () => {
      const data = { secret: 'dados-confidenciais-gringotts' };
      const envelope = encryptPayload(data, '999-111');

      expect(() => {
        decryptPayload(envelope, '000-222');
      }).toThrow();
    });

    it('deve detectar violação de integridade caso o ciphertext seja adulterado', () => {
      const data = { amount: 10000 };
      const envelope = encryptPayload(data, '123-456');

      // Adultera o ciphertext
      const tamperedBuffer = Buffer.from(envelope.ciphertext, 'base64');
      tamperedBuffer[0] = (tamperedBuffer[0]! ^ 0xff);
      const tamperedEnvelope = {
        ...envelope,
        ciphertext: tamperedBuffer.toString('base64'),
      };

      expect(() => {
        decryptPayload(tamperedEnvelope, '123-456');
      }).toThrow();
    });
  });

  describe('Detecção de Rede Local (networkUtils)', () => {
    it('deve retornar pelo menos uma interface IPv4 válida ou fallback localhost', () => {
      const addrs = getLocalIpAddresses();
      expect(Array.isArray(addrs)).toBe(true);
      expect(addrs.length).toBeGreaterThan(0);
      expect(addrs[0]!.ip).toMatch(/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/);
    });

    it('deve retornar um IP primário válido em formato string', () => {
      const ip = getPrimaryLocalIp();
      expect(typeof ip).toBe('string');
      expect(ip).toMatch(/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/);
    });
  });

  describe('Serviço P2pSyncService (Servidor HTTP Local e Handshake)', () => {
    let service: P2pSyncService | null = null;

    afterEach(async () => {
      if (service) {
        await service.stopServer();
        service = null;
      }
    });

    it('deve iniciar o servidor HTTP local e gerar código de pareamento', async () => {
      service = new P2pSyncService();
      const status = await service.startServer(58231);

      expect(status.isServerRunning).toBe(true);
      expect(status.port).toBe(58231);
      expect(status.pairingCode).toMatch(/^\d{3}-\d{3}$/);
      expect(status.primaryIp).toBeDefined();

      // Teste do endpoint GET /api/sync/info
      const res = await fetch(`http://127.0.0.1:58231/api/sync/info`);
      expect(res.ok).toBe(true);
      const json = (await res.json()) as any;
      expect(json.ok).toBe(true);
      expect(json.status).toBe('READY');
      expect(json.deviceName).toBeDefined();
    });

    it('deve recusar handshake com código incorreto e aceitar com código correto', async () => {
      service = new P2pSyncService();
      const status = await service.startServer(58232);
      const pairingCode = status.pairingCode!;

      // 1. Handshake com código errado
      const wrongRes = await fetch(`http://127.0.0.1:58232/api/sync/handshake`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pairingCode: '000-000', deviceName: 'Dispositivo Teste' }),
      });
      expect(wrongRes.status).toBe(401);
      const wrongJson = (await wrongRes.json()) as any;
      expect(wrongJson.ok).toBe(false);

      // 2. Handshake com código correto
      const correctRes = await fetch(`http://127.0.0.1:58232/api/sync/handshake`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pairingCode, deviceName: 'Dispositivo Teste' }),
      });
      expect(correctRes.status).toBe(200);
      const correctJson = (await correctRes.json()) as any;
      expect(correctJson.ok).toBe(true);
      expect(correctJson.deviceName).toBeDefined();
    });

    it('deve encerrar o servidor e atualizar o status', async () => {
      service = new P2pSyncService();
      await service.startServer(58233);
      expect(service.getStatus().isServerRunning).toBe(true);

      const stoppedStatus = await service.stopServer();
      expect(stoppedStatus.isServerRunning).toBe(false);
      expect(stoppedStatus.port).toBeNull();
      expect(stoppedStatus.pairingCode).toBeNull();
    });
  });
});
