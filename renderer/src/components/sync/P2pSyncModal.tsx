import React, { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { QRCodeSVG } from 'qrcode.react';
import {
  RefreshCw,
  Wifi,
  QrCode,
  Copy,
  Check,
  CheckCircle2,
  AlertTriangle,
  X,
  ShieldCheck,
  ArrowRightLeft,
  Laptop,
  Radio,
  Server,
  Download,
  Loader2,
  Lock,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { api } from '../../lib/ipc';
import { useP2pSyncStore } from '../../store/useP2pSyncStore';
import { useAccountStore } from '../../store/useAccountStore';
import { Button } from '../ui/button';
import { Input } from '../ui/input';

export const P2pSyncModal: React.FC = () => {
  const {
    isOpen,
    status,
    isLoading,
    isConnecting,
    lastResult,
    error,
    closeModal,
    fetchStatus,
    startServer,
    stopServer,
    connectAndSync,
    clearError,
    clearLastResult,
  } = useP2pSyncStore();

  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'share' | 'connect'>('share');
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedAddress, setCopiedAddress] = useState(false);

  // Formulário de conexão como cliente
  const [targetHost, setTargetHost] = useState('');
  const [targetPort, setTargetPort] = useState('57492');
  const [targetCode, setTargetCode] = useState('');
  const [quickPaste, setQuickPaste] = useState('');

  // Ao abrir o modal, atualiza status
  useEffect(() => {
    if (isOpen) {
      fetchStatus();
    }
  }, [isOpen, fetchStatus]);

  // Se o usuário colar um link ou JSON rápido, desmembra os campos
  const handleQuickPasteChange = (val: string) => {
    setQuickPaste(val);
    const trimmed = val.trim();

    // 1. Tenta formato gringotts-sync://IP:PORT?code=XYZ
    const urlMatch = trimmed.match(/^gringotts-sync:\/\/([^:]+):(\d+)\?code=(.+)$/i);
    if (urlMatch) {
      setTargetHost(urlMatch[1] || '');
      setTargetPort(urlMatch[2] || '57492');
      setTargetCode(urlMatch[3] || '');
      return;
    }

    // 2. Tenta formato JSON { host, port, code }
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (parsed.host || parsed.ip) setTargetHost(parsed.host || parsed.ip);
        if (parsed.port) setTargetPort(String(parsed.port));
        if (parsed.code || parsed.pairingCode) setTargetCode(parsed.code || parsed.pairingCode);
        return;
      } catch {
        // Ignora erro de JSON
      }
    }

    // 3. Tenta formato IP:PORT#CODE
    const hashMatch = trimmed.match(/^([^:]+):(\d+)#(.+)$/);
    if (hashMatch) {
      setTargetHost(hashMatch[1] || '');
      setTargetPort(hashMatch[2] || '57492');
      setTargetCode(hashMatch[3] || '');
    }
  };

  const handleCopy = (text: string, type: 'code' | 'address') => {
    navigator.clipboard.writeText(text);
    if (type === 'code') {
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } else {
      setCopiedAddress(true);
      setTimeout(() => setCopiedAddress(false), 2000);
    }
  };

  const handleStartSharing = async () => {
    clearError();
    await startServer(57492);
  };

  const handleStopSharing = async () => {
    clearError();
    await stopServer();
  };

  const handlePerformSync = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    clearLastResult();

    const portNum = parseInt(targetPort.trim(), 10);
    if (!targetHost.trim() || !portNum || !targetCode.trim()) {
      useP2pSyncStore.setState({
        error: 'Preencha o IP/Host, a porta e o código de pareamento do outro dispositivo.',
      });
      return;
    }

    try {
      await connectAndSync({
        host: targetHost.trim(),
        port: portNum,
        pairingCode: targetCode.trim(),
      });

      // Recarrega todos os dados do banco local
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['accounts'] }),
        queryClient.invalidateQueries({ queryKey: ['categories'] }),
        queryClient.invalidateQueries({ queryKey: ['transactions'] }),
        queryClient.invalidateQueries({ queryKey: ['budgets'] }),
        queryClient.invalidateQueries({ queryKey: ['goals'] }),
        queryClient.invalidateQueries({ queryKey: ['debts'] }),
        queryClient.invalidateQueries({ queryKey: ['recent-transactions'] }),
      ]);

      const refreshedAccounts = await api.accounts.getAll();
      useAccountStore.getState().setAccounts(refreshedAccounts);
    } catch {
      // Erro já capturado na store
    }
  };

  if (!isOpen) return null;

  const primaryIp = status?.primaryIp || '127.0.0.1';
  const currentPort = status?.port || 57492;
  const pairingCode = status?.pairingCode || '';
  const qrValue = `gringotts-sync://${primaryIp}:${currentPort}?code=${pairingCode}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="w-full max-w-2xl bg-white dark:bg-gray-850 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-750 flex flex-col overflow-hidden transition-all duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-750 flex items-center justify-between shrink-0 bg-gray-50/50 dark:bg-gray-800/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400 flex items-center justify-center shadow-2xs">
              <RefreshCw className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                  Sincronização Ponta-a-Ponta (P2P)
                </h2>
                <span className="text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> 100% Local • Sem Nuvem
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Sincronize computadores e dispositivos diretamente pela rede Wi-Fi com criptografia AES-256-GCM
              </p>
            </div>
          </div>

          <button
            onClick={closeModal}
            className="p-2 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-750 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Alerta de Erro */}
        {error && (
          <div className="mx-6 mt-4 p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 flex items-start gap-2.5 text-rose-700 dark:text-rose-300 text-xs">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="flex-1 font-medium">{error}</div>
            <button onClick={clearError} className="text-rose-400 hover:text-rose-600">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Feedback de Sucesso */}
        {lastResult && (
          <div className="mx-6 mt-4 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 space-y-2">
            <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-200 font-semibold text-sm">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              Sincronização concluída com sucesso!
            </div>
            <p className="text-xs text-emerald-700 dark:text-emerald-300">
              Dados trocados com <span className="font-semibold">{lastResult.peerDeviceName || 'o dispositivo'}</span>.
              Todos os saldos foram recalculados e atualizados.
            </p>
            <div className="grid grid-cols-3 gap-2 pt-1">
              <div className="bg-white/80 dark:bg-gray-800/80 p-2 rounded-lg text-center border border-emerald-100 dark:border-emerald-900/60">
                <span className="text-[10px] text-gray-500 dark:text-gray-400 uppercase font-bold block">Contas</span>
                <span className="text-xs font-bold text-gray-800 dark:text-gray-200">
                  {lastResult.localMergeResult?.accountsMerged || 0} novas/atuais
                </span>
              </div>
              <div className="bg-white/80 dark:bg-gray-800/80 p-2 rounded-lg text-center border border-emerald-100 dark:border-emerald-900/60">
                <span className="text-[10px] text-gray-500 dark:text-gray-400 uppercase font-bold block">Transações</span>
                <span className="text-xs font-bold text-gray-800 dark:text-gray-200">
                  {lastResult.localMergeResult?.transactionsMerged || 0} mescladas
                </span>
              </div>
              <div className="bg-white/80 dark:bg-gray-800/80 p-2 rounded-lg text-center border border-emerald-100 dark:border-emerald-900/60">
                <span className="text-[10px] text-gray-500 dark:text-gray-400 uppercase font-bold block">Dívidas/Metas</span>
                <span className="text-xs font-bold text-gray-800 dark:text-gray-200">
                  {(lastResult.localMergeResult?.debtsMerged || 0) + (lastResult.localMergeResult?.goalsMerged || 0)} atualizadas
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Seletor de Abas */}
        <div className="px-6 pt-4 border-b border-gray-100 dark:border-gray-750 flex gap-4">
          <button
            onClick={() => setActiveTab('share')}
            className={cn(
              "pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors",
              activeTab === 'share'
                ? "border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400"
                : "border-transparent text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
            )}
          >
            <Radio className="w-4 h-4" />
            1. Compartilhar deste Aparelho (Servidor)
          </button>
          <button
            onClick={() => setActiveTab('connect')}
            className={cn(
              "pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors",
              activeTab === 'connect'
                ? "border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400"
                : "border-transparent text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
            )}
          >
            <Download className="w-4 h-4" />
            2. Conectar a outro Aparelho (Cliente)
          </button>
        </div>

        {/* Conteúdo da Aba */}
        <div className="p-6 overflow-y-auto max-h-[70vh]">
          {activeTab === 'share' ? (
            <div className="space-y-5">
              {!status?.isServerRunning ? (
                <div className="bg-gray-50 dark:bg-gray-800/60 rounded-2xl p-6 border border-gray-200/80 dark:border-gray-700/80 text-center space-y-4">
                  <div className="w-14 h-14 mx-auto rounded-2xl bg-blue-100 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                    <Wifi className="w-7 h-7" />
                  </div>
                  <div className="max-w-md mx-auto">
                    <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">
                      Disponibilizar dados para sincronização
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Ao iniciar, este computador abrirá uma conexão temporária e segura na sua rede Wi-Fi local para permitir pareamento com seu outro aparelho.
                    </p>
                  </div>

                  <div className="pt-2">
                    <Button
                      onClick={handleStartSharing}
                      disabled={isLoading}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2.5 rounded-xl shadow-md flex items-center gap-2 mx-auto"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Iniciando servidor local...
                        </>
                      ) : (
                        <>
                          <Radio className="w-4 h-4" />
                          Iniciar Compartilhamento Local
                        </>
                      )}
                    </Button>
                  </div>

                  <div className="flex items-center justify-center gap-1.5 text-[11px] text-gray-400">
                    <Lock className="w-3 h-3 text-emerald-500" />
                    <span>Nenhum dado trafega pela internet ou servidores de terceiros.</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-5">
                  {/* Status Ativo */}
                  <div className="flex items-center justify-between p-3.5 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl">
                    <div className="flex items-center gap-2.5">
                      <span className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                      </span>
                      <div>
                        <p className="text-xs font-bold text-emerald-900 dark:text-emerald-200">
                          Aguardando conexão na rede local
                        </p>
                        <p className="text-[11px] text-emerald-700 dark:text-emerald-400">
                          Abra o Gringotts no outro dispositivo e use o código abaixo
                        </p>
                      </div>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleStopSharing}
                      disabled={isLoading}
                      className="text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/50 border-rose-200 dark:border-rose-800"
                    >
                      {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Parar Servidor'}
                    </Button>
                  </div>

                  {/* QR Code e Informações de Conexão */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center bg-gray-50 dark:bg-gray-800/50 p-5 rounded-2xl border border-gray-100 dark:border-gray-700">
                    
                    {/* QR Code */}
                    <div className="flex flex-col items-center justify-center p-3 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-750 shadow-2xs">
                      <QRCodeSVG
                        value={qrValue}
                        size={160}
                        level="M"
                        includeMargin={true}
                        className="rounded-lg"
                      />
                      <span className="mt-2 text-[10px] text-gray-400 font-medium flex items-center gap-1">
                        <QrCode className="w-3 h-3" /> QR Code de Pareamento Rápido
                      </span>
                    </div>

                    {/* Dados de Conexão */}
                    <div className="space-y-4">
                      {/* Código de Pareamento */}
                      <div>
                        <label className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider block mb-1">
                          Código de Pareamento
                        </label>
                        <div className="flex items-center gap-2">
                          <div className="bg-white dark:bg-gray-900 px-4 py-2.5 rounded-xl border-2 border-blue-500/40 text-blue-600 dark:text-blue-400 font-mono text-2xl font-black tracking-widest text-center flex-1 shadow-2xs">
                            {pairingCode}
                          </div>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleCopy(pairingCode, 'code')}
                            title="Copiar Código"
                            className="shrink-0 h-11 w-11 rounded-xl"
                          >
                            {copiedCode ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                          </Button>
                        </div>
                      </div>

                      {/* Endereço IP e Porta */}
                      <div>
                        <label className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider block mb-1">
                          Endereço na Rede Local (IP:Porta)
                        </label>
                        <div className="flex items-center gap-2">
                          <div className="bg-white dark:bg-gray-900 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 font-mono text-xs text-gray-800 dark:text-gray-200 flex-1 truncate">
                            {primaryIp}:{currentPort}
                          </div>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleCopy(`${primaryIp}:${currentPort}`, 'address')}
                            title="Copiar IP e Porta"
                            className="shrink-0 h-9 w-9 rounded-xl"
                          >
                            {copiedAddress ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                          </Button>
                        </div>
                      </div>

                      <div className="text-[11px] text-gray-400">
                        Ambos os aparelhos devem estar conectados na mesma rede Wi-Fi ou cabo de rede local.
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* ABA 2: CONECTAR A OUTRO DISPOSITIVO */
            <form onSubmit={handlePerformSync} className="space-y-4">
              <div className="bg-blue-50/70 dark:bg-blue-950/30 p-4 rounded-xl border border-blue-100 dark:border-blue-900/60 text-xs text-blue-900 dark:text-blue-200 space-y-1">
                <p className="font-semibold flex items-center gap-1.5">
                  <ArrowRightLeft className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  Sincronização Bidirecional Segura
                </p>
                <p className="text-blue-800/80 dark:text-blue-300">
                  Os dois aparelhos mesclarão suas transações, contas e categorias automaticamente sem apagar nenhum dado existente.
                </p>
              </div>

              {/* Colar Rápido */}
              <div>
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 block mb-1">
                  Colar Código ou Link Rápido (Opcional)
                </label>
                <Input
                  type="text"
                  placeholder="Ex: gringotts-sync://192.168.1.15:57492?code=492-817"
                  value={quickPaste}
                  onChange={(e) => handleQuickPasteChange(e.target.value)}
                  className="font-mono text-xs"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 block mb-1">
                    Endereço IP do Outro Aparelho <span className="text-rose-500">*</span>
                  </label>
                  <Input
                    type="text"
                    placeholder="Ex: 192.168.1.15"
                    value={targetHost}
                    onChange={(e) => setTargetHost(e.target.value)}
                    required
                    className="font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 block mb-1">
                    Porta
                  </label>
                  <Input
                    type="number"
                    placeholder="57492"
                    value={targetPort}
                    onChange={(e) => setTargetPort(e.target.value)}
                    required
                    className="font-mono text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 block mb-1">
                  Código de Pareamento de 6 dígitos <span className="text-rose-500">*</span>
                </label>
                <Input
                  type="text"
                  placeholder="Ex: 492-817"
                  value={targetCode}
                  onChange={(e) => setTargetCode(e.target.value)}
                  required
                  className="font-mono text-base tracking-widest text-center font-bold"
                  maxLength={10}
                />
                <p className="text-[11px] text-gray-400 mt-1">
                  Exibido na tela do outro aparelho que iniciou o compartilhamento.
                </p>
              </div>

              <div className="pt-3">
                <Button
                  type="submit"
                  disabled={isConnecting}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-xl shadow-md flex items-center justify-center gap-2"
                >
                  {isConnecting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Conectando e sincronizando dados com segurança...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4" />
                      Conectar e Sincronizar Agora
                    </>
                  )}
                </Button>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-gray-50/50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-750 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
          <div className="flex items-center gap-1.5">
            <Laptop className="w-3.5 h-3.5 text-gray-400" />
            <span>Dispositivo: {status?.primaryIp || '127.0.0.1'}</span>
          </div>

          <Button variant="ghost" size="sm" onClick={closeModal}>
            Fechar
          </Button>
        </div>
      </div>
    </div>
  );
};

