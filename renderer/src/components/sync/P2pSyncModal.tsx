import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { QRCodeSVG } from 'qrcode.react';
import jsQR from 'jsqr';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
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
  Download,
  Loader2,
  Lock,
  Camera as CameraIcon,
  Clipboard,
  StopCircle,
  Smartphone,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { api } from '../../lib/ipc';
import { useP2pSyncStore } from '../../store/useP2pSyncStore';
import { useAccountStore } from '../../store/useAccountStore';
import { Button } from '../ui/button';
import { Input } from '../ui/input';

const isElectron = typeof window !== 'undefined' && Boolean(window.api);

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
    pendingDeepLink,
    setPendingDeepLink,
  } = useP2pSyncStore();

  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'share' | 'connect'>(isElectron ? 'share' : 'connect');
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedAddress, setCopiedAddress] = useState(false);

  // Formulário de conexão como cliente
  const [targetHost, setTargetHost] = useState('');
  const [targetPort, setTargetPort] = useState('57492');
  const [targetCode, setTargetCode] = useState('');
  const [quickPaste, setQuickPaste] = useState('');

  // Seleção de IP do servidor no desktop
  const [selectedIp, setSelectedIp] = useState<string>('');

  // Câmera / Leitor de QR Code
  const [isScanning, setIsScanning] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  // Ao abrir o modal, atualiza status e define aba apropriada
  useEffect(() => {
    if (isOpen) {
      fetchStatus();
      if (!isElectron) {
        setActiveTab('connect');
      }
    } else {
      stopScanner();
    }
  }, [isOpen, fetchStatus]);

  // Atualiza IP selecionado quando o status for carregado
  useEffect(() => {
    if (status?.primaryIp && !selectedIp) {
      setSelectedIp(status.primaryIp);
    }
  }, [status?.primaryIp, selectedIp]);

  // Se o aplicativo foi aberto via Deep Link (gringotts-sync://)
  useEffect(() => {
    if (pendingDeepLink) {
      setTargetHost(pendingDeepLink.host);
      setTargetPort(String(pendingDeepLink.port));
      setTargetCode(pendingDeepLink.pairingCode);
      setActiveTab('connect');
      setPendingDeepLink(null);
    }
  }, [pendingDeepLink, setPendingDeepLink]);

  // Se o usuário colar um link ou JSON rápido, desmembra os campos
  const handleQuickPasteChange = useCallback((val: string) => {
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
      return;
    }

    // 4. Se for apenas um código de 6 dígitos tipo 123-456
    if (/^\d{3}-?\d{3}$/.test(trimmed)) {
      setTargetCode(trimmed);
    }
  }, []);

  const stopScanner = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    setIsScanning(false);
  }, []);

  const scanFrame = useCallback(() => {
    if (!videoRef.current || videoRef.current.readyState !== videoRef.current.HAVE_ENOUGH_DATA) {
      animationFrameRef.current = requestAnimationFrame(scanFrame);
      return;
    }

    let canvas = canvasRef.current;
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvasRef.current = canvas;
    }

    const video = videoRef.current;
    if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
    }

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (ctx && canvas.width > 0 && canvas.height > 0) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: 'dontInvert',
      });

      if (code && code.data) {
        stopScanner();
        handleQuickPasteChange(code.data);
        if (navigator.vibrate) {
          try {
            navigator.vibrate([100, 50, 100]);
          } catch {
            // vibração opcional
          }
        }
        return;
      }
    }

    animationFrameRef.current = requestAnimationFrame(scanFrame);
  }, [stopScanner, handleQuickPasteChange]);

  const startScanner = async () => {
    setCameraError(null);
    clearError();
    setIsScanning(true);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Câmera não suportada pelo navegador.');
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      mediaStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        await videoRef.current.play();
        animationFrameRef.current = requestAnimationFrame(scanFrame);
      }
    } catch (err: any) {
      console.warn('Erro ao abrir câmera via getUserMedia:', err);
      // Fallback via Capacitor Camera
      setIsScanning(false);
      tryScanViaCapacitorCamera();
    }
  };

  const tryScanViaCapacitorCamera = async () => {
    try {
      const photo = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.Base64,
        source: CameraSource.Camera,
      });

      if (photo && photo.base64String) {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0);
            const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const code = jsQR(imgData.data, imgData.width, imgData.height);
            if (code && code.data) {
              handleQuickPasteChange(code.data);
            } else {
              setCameraError('Nenhum QR Code legível detectado na foto. Tente aproximar da tela.');
            }
          }
        };
        img.src = `data:image/${photo.format || 'jpeg'};base64,${photo.base64String}`;
      }
    } catch (photoErr: any) {
      setCameraError('Permissão de câmera não concedida ou leitura cancelada.');
    }
  };

  const handlePasteFromClipboard = async () => {
    clearError();
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        handleQuickPasteChange(text);
      } else {
        useP2pSyncStore.setState({ error: 'A área de transferência está vazia.' });
      }
    } catch {
      useP2pSyncStore.setState({ error: 'Não foi possível ler da área de transferência.' });
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
        error: 'Preencha o IP do computador, a porta e o código de pareamento.',
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
      // Erro já tratado na store
    }
  };

  if (!isOpen) return null;

  const effectiveIp = selectedIp || status?.primaryIp || '127.0.0.1';
  const currentPort = status?.port || 57492;
  const pairingCode = status?.pairingCode || '';
  const qrValue = `gringotts-sync://${effectiveIp}:${currentPort}?code=${pairingCode}`;

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
                <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-gray-100">
                  Sincronização P2P
                </h2>
                <span className="text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> 100% Local
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Sincronize celular e computador diretamente pela mesma rede Wi-Fi com criptografia AES-256-GCM
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
        {(error || cameraError) && (
          <div className="mx-6 mt-4 p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 flex items-start gap-2.5 text-rose-700 dark:text-rose-300 text-xs">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="flex-1 font-medium">{error || cameraError}</div>
            <button onClick={() => { clearError(); setCameraError(null); }} className="text-rose-400 hover:text-rose-600">
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
              Saldos recalculados e atualizados.
            </p>
            <div className="grid grid-cols-3 gap-2 pt-1">
              <div className="bg-white/80 dark:bg-gray-800/80 p-2 rounded-lg text-center border border-emerald-100 dark:border-emerald-900/60">
                <span className="text-[10px] text-gray-500 dark:text-gray-400 uppercase font-bold block">Contas</span>
                <span className="text-xs font-bold text-gray-800 dark:text-gray-200">
                  {lastResult.localMergeResult?.accountsMerged || 0} mescladas
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
          {isElectron && (
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
              1. Compartilhar deste Computador
            </button>
          )}
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
            {isElectron ? '2. Conectar a outro Dispositivo' : 'Sincronizar com o Computador'}
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
                      Ao iniciar, este computador abrirá uma conexão temporária e segura na sua rede Wi-Fi local para permitir pareamento com o seu celular.
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
                    <span>Nenhum dado trafega pela internet ou servidores externos.</span>
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
                          Aguardando conexão do celular na rede Wi-Fi
                        </p>
                        <p className="text-[11px] text-emerald-700 dark:text-emerald-400">
                          No celular, abra o Gringotts e escaneie o QR Code abaixo
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
                        size={170}
                        level="M"
                        includeMargin={true}
                        className="rounded-lg"
                      />
                      <span className="mt-2 text-[10px] text-gray-500 font-medium flex items-center gap-1">
                        <QrCode className="w-3.5 h-3.5 text-blue-500" /> Aponte a câmera do celular
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
                            {effectiveIp}:{currentPort}
                          </div>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleCopy(`${effectiveIp}:${currentPort}`, 'address')}
                            title="Copiar IP e Porta"
                            className="shrink-0 h-9 w-9 rounded-xl"
                          >
                            {copiedAddress ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                          </Button>
                        </div>

                        {/* Alternar IP se houver mais de uma interface */}
                        {status?.ipAddresses && status.ipAddresses.length > 1 && (
                          <div className="mt-2 space-y-1">
                            <span className="text-[10px] text-gray-400 block">Outros IPs detectados:</span>
                            <div className="flex flex-wrap gap-1.5">
                              {status.ipAddresses.map((ip) => (
                                <button
                                  key={ip}
                                  type="button"
                                  onClick={() => setSelectedIp(ip)}
                                  className={cn(
                                    "text-[10px] px-2 py-0.5 rounded-md font-mono border transition-colors",
                                    effectiveIp === ip
                                      ? "bg-blue-600 text-white border-blue-600 font-bold"
                                      : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-blue-400"
                                  )}
                                >
                                  {ip} {effectiveIp === ip && '✓'}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="text-[11px] text-gray-400">
                        O celular e o computador devem estar conectados no mesmo Wi-Fi.
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* ABA 2: CONECTAR A OUTRO DISPOSITIVO (CLIENTE) */
            <form onSubmit={handlePerformSync} className="space-y-4">
              <div className="bg-blue-50/70 dark:bg-blue-950/30 p-4 rounded-xl border border-blue-100 dark:border-blue-900/60 text-xs text-blue-900 dark:text-blue-200 space-y-1">
                <p className="font-semibold flex items-center gap-1.5">
                  <ArrowRightLeft className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  Sincronização com o Computador
                </p>
                <p className="text-blue-800/80 dark:text-blue-300">
                  Os dados do seu computador serão mesclados com segurança com o celular, mantendo todas as transações de ambos.
                </p>
              </div>

              {/* Botões Rápidos: Câmera QR e Colar */}
              {isScanning ? (
                <div className="relative rounded-2xl overflow-hidden bg-black aspect-video flex items-center justify-center border-2 border-emerald-500 shadow-xl">
                  <video
                    ref={videoRef}
                    className="w-full h-full object-cover"
                    playsInline
                    muted
                    autoPlay
                  />
                  <canvas ref={canvasRef} className="hidden" />
                  
                  {/* Overlay do Viewfinder */}
                  <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-4">
                    <div className="w-44 h-44 sm:w-52 sm:h-52 border-2 border-emerald-400 rounded-xl relative shadow-[0_0_20px_rgba(52,211,153,0.5)]">
                      <div className="absolute -top-1 -left-1 w-5 h-5 border-t-4 border-l-4 border-emerald-400" />
                      <div className="absolute -top-1 -right-1 w-5 h-5 border-t-4 border-r-4 border-emerald-400" />
                      <div className="absolute -bottom-1 -left-1 w-5 h-5 border-b-4 border-l-4 border-emerald-400" />
                      <div className="absolute -bottom-1 -right-1 w-5 h-5 border-b-4 border-r-4 border-emerald-400" />
                    </div>
                    <span className="mt-3 text-[11px] text-white/90 bg-black/60 px-3 py-1 rounded-full backdrop-blur-xs">
                      Aponte para o QR Code na tela do computador
                    </span>
                  </div>

                  <div className="absolute bottom-3 left-0 right-0 flex justify-center">
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={stopScanner}
                      className="rounded-full shadow-lg text-xs flex items-center gap-1.5"
                    >
                      <StopCircle className="w-4 h-4" /> Cancelar Leitura
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <Button
                    type="button"
                    onClick={startScanner}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 rounded-xl shadow-xs flex items-center justify-center gap-2 text-xs"
                  >
                    <CameraIcon className="w-4 h-4" />
                    Escanear QR Code com Câmera
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={handlePasteFromClipboard}
                    className="py-3 rounded-xl border-gray-300 dark:border-gray-700 text-xs flex items-center justify-center gap-2 font-medium"
                  >
                    <Clipboard className="w-4 h-4 text-blue-500" />
                    Colar Código da Área de Transferência
                  </Button>
                </div>
              )}

              {/* Colar Rápido Manual */}
              <div>
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 block mb-1">
                  Código ou Link de Conexão Rápida
                </label>
                <Input
                  type="text"
                  placeholder="Ex: gringotts-sync://192.168.1.8:57492?code=492-817"
                  value={quickPaste}
                  onChange={(e) => handleQuickPasteChange(e.target.value)}
                  className="font-mono text-xs"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 block mb-1">
                    Endereço IP do Computador <span className="text-rose-500">*</span>
                  </label>
                  <Input
                    type="text"
                    placeholder="Ex: 192.168.1.8"
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
                  Exibido na tela do computador ao iniciar o compartilhamento.
                </p>
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  disabled={isConnecting}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl shadow-md flex items-center justify-center gap-2"
                >
                  {isConnecting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Conectando e sincronizando dados...
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
            {isElectron ? <Laptop className="w-3.5 h-3.5 text-gray-400" /> : <Smartphone className="w-3.5 h-3.5 text-gray-400" />}
            <span>Dispositivo: {effectiveIp}</span>
          </div>

          <Button variant="ghost" size="sm" onClick={closeModal}>
            Fechar
          </Button>
        </div>
      </div>
    </div>
  );
};
