import http from 'node:http';
import os from 'node:os';
import { getLocalIpAddresses, getPrimaryLocalIp } from './networkUtils';
import {
  generatePairingCode,
  normalizePairingCode,
  encryptPayload,
  decryptPayload,
  EncryptedSyncEnvelope,
} from './p2pCrypto';
import { syncDataEngine, SyncDataset, SyncMergeResult } from './syncDataEngine';

export interface P2pSyncStatus {
  isServerRunning: boolean;
  port: number | null;
  pairingCode: string | null;
  ipAddresses: string[];
  primaryIp: string | null;
  lastSyncResult: SyncMergeResult | null;
  lastSyncTimestamp: number | null;
  connectedClientsCount: number;
  errorMessage: string | null;
}

export interface SyncResultDetails {
  success: boolean;
  localMergeResult?: SyncMergeResult;
  remoteMergeResult?: SyncMergeResult;
  totalMerged: number;
  peerDeviceName?: string;
  timestamp: number;
  error?: string;
}

export interface ConnectAndSyncParams {
  host: string;
  port: number;
  pairingCode: string;
}

function parseJsonBody<T = any>(req: http.IncomingMessage): Promise<T> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      // Limite de segurança de 50MB para base de dados com muitas transações
      if (body.length > 50 * 1024 * 1024) {
        req.destroy(new Error('Carga útil excede o limite máximo permitido (50MB).'));
      }
    });
    req.on('end', () => {
      try {
        if (!body) {
          resolve({} as T);
          return;
        }
        resolve(JSON.parse(body) as T);
      } catch (err) {
        reject(new Error('JSON inválido na requisição.'));
      }
    });
    req.on('error', reject);
  });
}

export class P2pSyncService {
  private server: http.Server | null = null;
  private currentPort: number | null = null;
  private currentPairingCode: string | null = null;
  private lastSyncResult: SyncMergeResult | null = null;
  private lastSyncTimestamp: number | null = null;
  private connectedClientsCount = 0;
  private errorMessage: string | null = null;

  /**
   * Retorna o status atual do serviço P2P
   */
  getStatus(): P2pSyncStatus {
    const addrs = getLocalIpAddresses();
    return {
      isServerRunning: Boolean(this.server && this.server.listening),
      port: this.currentPort,
      pairingCode: this.currentPairingCode,
      ipAddresses: addrs.map((a) => a.ip),
      primaryIp: getPrimaryLocalIp(),
      lastSyncResult: this.lastSyncResult,
      lastSyncTimestamp: this.lastSyncTimestamp,
      connectedClientsCount: this.connectedClientsCount,
      errorMessage: this.errorMessage,
    };
  }

  /**
   * Inicia o servidor HTTP local para pareamento e recebimento de dados
   */
  async startServer(preferredPort = 57492): Promise<P2pSyncStatus> {
    if (this.server && this.server.listening) {
      return this.getStatus();
    }

    this.currentPairingCode = generatePairingCode();
    this.errorMessage = null;

    const server = http.createServer(async (req, res) => {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

      if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
      }

      const url = req.url || '';

      try {
        // 1. Verificação de status básico
        if (req.method === 'GET' && url === '/api/sync/info') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            ok: true,
            status: 'READY',
            deviceName: os.hostname(),
          }));
          return;
        }

        // 2. Handshake de pareamento
        if (req.method === 'POST' && url === '/api/sync/handshake') {
          const body = await parseJsonBody<{ pairingCode?: string; deviceName?: string }>(req);
          const incomingCode = normalizePairingCode(body.pairingCode || '');
          const myCode = normalizePairingCode(this.currentPairingCode || '');

          if (!incomingCode || incomingCode !== myCode) {
            res.writeHead(401, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              ok: false,
              error: 'Código de pareamento incorreto ou não fornecido.',
            }));
            return;
          }

          this.connectedClientsCount++;
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            ok: true,
            deviceName: os.hostname(),
            deviceId: `${os.hostname()}-${os.platform()}`,
          }));
          return;
        }

        // 3. Troca de dados bidirecional criptografada
        if (req.method === 'POST' && url === '/api/sync/exchange') {
          const body = await parseJsonBody<{
            pairingCode?: string;
            envelope?: EncryptedSyncEnvelope;
          }>(req);

          const incomingCode = normalizePairingCode(body.pairingCode || '');
          const myCode = normalizePairingCode(this.currentPairingCode || '');

          if (!incomingCode || incomingCode !== myCode) {
            res.writeHead(401, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              ok: false,
              error: 'Código de pareamento incorreto.',
            }));
            return;
          }

          if (!body.envelope) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              ok: false,
              error: 'Envelope criptografado ausente.',
            }));
            return;
          }

          // Descriptografa os dados remotos
          let remoteDataset: SyncDataset;
          try {
            remoteDataset = decryptPayload<SyncDataset>(body.envelope, this.currentPairingCode!);
          } catch (cryptoErr: any) {
            res.writeHead(401, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              ok: false,
              error: 'Falha ao autenticar e descriptografar dados recebidos (código inválido ou dados corrompidos).',
            }));
            return;
          }

          // Mescla dados remotos no banco local
          const mergeResult = await syncDataEngine.mergeSyncDataset(remoteDataset);
          this.lastSyncResult = mergeResult;
          this.lastSyncTimestamp = Date.now();

          // Exporta o dataset local e criptografa para enviar de volta ao cliente
          const localDataset = await syncDataEngine.exportSyncDataset();
          const responseEnvelope = encryptPayload(localDataset, this.currentPairingCode!);

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            ok: true,
            envelope: responseEnvelope,
            mergeResult,
            deviceName: os.hostname(),
          }));
          return;
        }

        // Rota não encontrada
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: 'Endpoint não encontrado' }));
      } catch (err: any) {
        console.error('[P2pSyncService] Erro ao processar requisição HTTP:', err);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          ok: false,
          error: err.message || 'Erro interno no servidor de sincronização P2P.',
        }));
      }
    });

    // Iniciar escuta com fallback em portas subsequentes caso ocupada
    let port = preferredPort;
    const maxTries = 10;
    for (let i = 0; i < maxTries; i++) {
      try {
        await new Promise<void>((resolve, reject) => {
          server.once('error', reject);
          server.listen(port, '0.0.0.0', () => {
            server.removeListener('error', reject);
            resolve();
          });
        });
        this.server = server;
        this.currentPort = port;
        break;
      } catch (err: any) {
        if (err.code === 'EADDRINUSE') {
          port++;
        } else {
          this.errorMessage = err.message;
          throw err;
        }
      }
    }

    if (!this.server || !this.server.listening) {
      throw new Error(`Não foi possível iniciar o servidor nas portas ${preferredPort} a ${port}`);
    }

    return this.getStatus();
  }

  /**
   * Encerra o servidor de sincronização
   */
  async stopServer(): Promise<P2pSyncStatus> {
    if (this.server) {
      await new Promise<void>((resolve) => {
        this.server!.close(() => {
          resolve();
        });
      });
      this.server = null;
    }
    this.currentPort = null;
    this.currentPairingCode = null;
    this.connectedClientsCount = 0;
    return this.getStatus();
  }

  /**
   * Conecta a um outro dispositivo servidor na rede local e executa a sincronização mútua
   */
  async connectAndSync(params: ConnectAndSyncParams): Promise<SyncResultDetails> {
    const { host, port, pairingCode } = params;
    const normalizedCode = normalizePairingCode(pairingCode);

    if (!host || !port || !normalizedCode) {
      throw new Error('IP do servidor, porta e código de pareamento são obrigatórios.');
    }

    const baseUrl = `http://${host}:${port}`;

    // 1. Handshake inicial
    let handshakeRes: Response;
    try {
      handshakeRes = await fetch(`${baseUrl}/api/sync/handshake`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pairingCode: normalizedCode,
          deviceName: os.hostname(),
        }),
      });
    } catch (networkErr: any) {
      throw new Error(
        `Não foi possível conectar ao dispositivo em ${host}:${port}. Verifique se ambos estão no mesmo Wi-Fi/rede local e se o Gringotts está aguardando pareamento no outro aparelho.`
      );
    }

    if (!handshakeRes.ok) {
      const errJson = (await handshakeRes.json().catch(() => ({}))) as any;
      throw new Error(
        errJson.error || `Pareamento recusado pelo dispositivo remoto (status ${handshakeRes.status}).`
      );
    }

    const handshakeData = (await handshakeRes.json()) as { deviceName?: string };

    // 2. Exportar dados locais e criptografar com AES-256-GCM
    const localDataset = await syncDataEngine.exportSyncDataset();
    const localEnvelope = encryptPayload(localDataset, normalizedCode);

    // 3. Enviar dados locais e receber dados remotos criptografados
    let exchangeRes: Response;
    try {
      exchangeRes = await fetch(`${baseUrl}/api/sync/exchange`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pairingCode: normalizedCode,
          envelope: localEnvelope,
        }),
      });
    } catch (exchangeErr: any) {
      throw new Error(`Falha de comunicação durante a troca de dados: ${exchangeErr.message}`);
    }

    if (!exchangeRes.ok) {
      const errJson = (await exchangeRes.json().catch(() => ({}))) as any;
      throw new Error(errJson.error || `Erro durante a sincronização de dados (${exchangeRes.status}).`);
    }

    const exchangeData = (await exchangeRes.json()) as {
      ok: boolean;
      envelope?: EncryptedSyncEnvelope;
      mergeResult?: SyncMergeResult;
      deviceName?: string;
    };

    if (!exchangeData.envelope) {
      throw new Error('O dispositivo remoto não retornou os dados criptografados para sincronização.');
    }

    // 4. Descriptografar e mesclar os dados recebidos do dispositivo remoto
    const remoteDataset = decryptPayload<SyncDataset>(exchangeData.envelope, normalizedCode);
    const clientMergeResult = await syncDataEngine.mergeSyncDataset(remoteDataset);

    this.lastSyncResult = clientMergeResult;
    this.lastSyncTimestamp = Date.now();

    const remoteMergeResult = exchangeData.mergeResult;
    const totalMerged = clientMergeResult.totalMerged + (remoteMergeResult?.totalMerged || 0);

    return {
      success: true,
      localMergeResult: clientMergeResult,
      remoteMergeResult,
      totalMerged,
      peerDeviceName: exchangeData.deviceName || handshakeData.deviceName || host,
      timestamp: Date.now(),
    };
  }
}

export const p2pSyncService = new P2pSyncService();
