import React, { useState } from 'react';
import { 
  Rocket, 
  ExternalLink, 
  Download, 
  X, 
  Sparkles, 
  Calendar, 
  CheckCircle2, 
  Monitor, 
  Apple, 
  Terminal,
  RefreshCw,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { useUpdaterStore } from '../../store/useUpdaterStore';

function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

function formatSpeed(bytesPerSec: number): string {
  if (!bytesPerSec || bytesPerSec <= 0) return 'calculando...';
  return `${formatBytes(bytesPerSec)}/s`;
}

export const UpdateModal: React.FC = () => {
  const isOpen = useUpdaterStore((s) => s.isModalOpen);
  const closeModal = useUpdaterStore((s) => s.closeModal);
  const updateInfo = useUpdaterStore((s) => s.updateInfo);
  const openDownload = useUpdaterStore((s) => s.openDownload);
  const openReleasePage = useUpdaterStore((s) => s.openReleasePage);
  const ignoreCurrentVersion = useUpdaterStore((s) => s.ignoreCurrentVersion);

  const downloadStatus = useUpdaterStore((s) => s.downloadStatus);
  const downloadProgress = useUpdaterStore((s) => s.downloadProgress);
  const downloadError = useUpdaterStore((s) => s.downloadError);
  const startDownload = useUpdaterStore((s) => s.startDownload);
  const cancelDownload = useUpdaterStore((s) => s.cancelDownload);
  const installUpdate = useUpdaterStore((s) => s.installUpdate);

  const [dontShowAgain, setDontShowAgain] = useState(false);

  if (!isOpen || !updateInfo) return null;

  const handleClose = () => {
    if (dontShowAgain) {
      ignoreCurrentVersion();
    } else {
      closeModal();
    }
  };

  // Formata a data se disponível
  const formattedDate = updateInfo.publishedAt
    ? new Date(updateInfo.publishedAt).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      })
    : null;

  // Formata o tamanho do arquivo em MB se disponível
  const formattedSize = updateInfo.assetSize
    ? formatBytes(updateInfo.assetSize)
    : null;

  // Obtém informações da plataforma
  const getPlatformLabel = () => {
    switch (updateInfo.platform) {
      case 'win32':
        return { name: 'Windows (.exe)', icon: Monitor, autoDesc: 'Atualização silenciosa e reinício automático' };
      case 'darwin':
        return { name: 'macOS (.dmg)', icon: Apple, autoDesc: 'Download do instalador DMG direto' };
      case 'linux':
        return { 
          name: 'Linux (.AppImage / .deb)', 
          icon: Terminal, 
          autoDesc: updateInfo.isAppImage 
            ? 'Atualização in-place do AppImage (substitui no mesmo arquivo sem precisar deletar)' 
            : 'Download direto e atualização automática'
        };
      default:
        return { name: 'Download Universal', icon: Download, autoDesc: 'Download direto' };
    }
  };

  const platformInfo = getPlatformLabel();
  const PlatformIcon = platformInfo.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-xl bg-gradient-to-b from-gray-900 via-gray-900 to-black border border-amber-500/30 rounded-3xl shadow-2xl shadow-amber-500/10 overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glow de fundo */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-28 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />

        {/* Botão Fechar */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 z-10 p-2 text-gray-400 hover:text-white rounded-full hover:bg-gray-800/80 transition-colors cursor-pointer"
          title="Fechar"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="p-6 pb-4 border-b border-gray-800/80 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-600 to-yellow-400 flex items-center justify-center shadow-lg shadow-amber-500/25 shrink-0">
            <Rocket className="w-6 h-6 text-gray-950 stroke-[2.5]" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                Nova Versão Disponível
              </span>
              {formattedDate && (
                <span className="text-xs text-gray-400 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  {formattedDate}
                </span>
              )}
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight mt-1 flex items-center gap-2">
              {updateInfo.releaseName || `Gringotts v${updateInfo.latestVersion}`}
            </h2>
          </div>
        </div>

        {/* Comparativo de Versões */}
        <div className="px-6 py-3 bg-gray-950/60 border-b border-gray-800/60 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-gray-400">
            <span>Sua versão:</span>
            <span className="px-2 py-0.5 rounded-md bg-gray-800 text-gray-300 font-mono font-medium">
              v{updateInfo.currentVersion}
            </span>
          </div>
          <span className="text-amber-400 font-bold">➔</span>
          <div className="flex items-center gap-2">
            <span className="text-amber-300 font-medium">Nova versão:</span>
            <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 font-mono font-bold border border-amber-500/30">
              v{updateInfo.latestVersion}
            </span>
          </div>
        </div>

        {/* Conteúdo / Release Notes */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1 text-sm text-gray-300">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              O que há de novo nesta atualização:
            </div>

            {updateInfo.releaseNotes ? (
              <div className="bg-gray-950/70 border border-gray-800/80 rounded-2xl p-4 text-xs font-sans text-gray-300 whitespace-pre-wrap leading-relaxed max-h-52 overflow-y-auto">
                {updateInfo.releaseNotes}
              </div>
            ) : (
              <div className="bg-gray-950/50 border border-gray-800/60 rounded-2xl p-4 text-xs text-gray-400 flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                <span>Esta versão traz melhorias de desempenho, correções de bugs e atualizações visuais.</span>
              </div>
            )}
          </div>

          {/* Detalhes do Instalador Detectado */}
          {updateInfo.assetName && (
            <div className="flex items-center justify-between px-4 py-2.5 bg-gray-800/40 border border-gray-800/60 rounded-xl text-xs text-gray-400">
              <span className="flex items-center gap-2 truncate">
                <PlatformIcon className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="truncate">{updateInfo.assetName}</span>
              </span>
              {formattedSize && <span className="font-mono text-gray-400 shrink-0 ml-2">{formattedSize}</span>}
            </div>
          )}

          {/* Dica da Plataforma */}
          <div className="p-3 bg-amber-500/5 border border-amber-500/15 rounded-xl text-[11px] text-amber-300/80 flex items-center gap-2">
            <span className="text-amber-400 font-bold shrink-0">⚡</span>
            <span>{platformInfo.autoDesc}</span>
          </div>

          {/* Painel de Download em Progresso */}
          {downloadStatus === 'downloading' && (
            <div className="p-4 bg-gray-950/80 border border-amber-500/30 rounded-2xl space-y-2.5 animate-in fade-in duration-200">
              <div className="flex items-center justify-between text-xs font-medium">
                <span className="text-gray-300 flex items-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 text-amber-400 animate-spin" />
                  Baixando atualização...
                </span>
                <span className="text-amber-400 font-mono font-bold">
                  {downloadProgress?.percent ?? 0}%
                </span>
              </div>

              {/* Barra de Progresso */}
              <div className="w-full h-2.5 bg-gray-800 rounded-full overflow-hidden p-0.5 border border-gray-700/50">
                <div 
                  className="h-full bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-300 rounded-full transition-all duration-200 ease-out shadow-sm shadow-amber-500/50"
                  style={{ width: `${Math.max(3, downloadProgress?.percent ?? 0)}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[11px] text-gray-400">
                <span>
                  {formatBytes(downloadProgress?.transferred || 0)} de {formatBytes(downloadProgress?.total || 0)}
                </span>
                <span>{formatSpeed(downloadProgress?.bytesPerSecond || 0)}</span>
              </div>
            </div>
          )}

          {/* Painel de Download Concluído */}
          {downloadStatus === 'downloaded' && (
            <div className="p-4 bg-emerald-950/30 border border-emerald-500/30 rounded-2xl flex items-center gap-3 animate-in fade-in duration-200">
              <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
              <div className="text-xs">
                <p className="font-bold text-emerald-300">Atualização pronta para instalação!</p>
                <p className="text-gray-400 text-[11px] mt-0.5">
                  Clique em Reiniciar e Atualizar para aplicar as novidades imediatamente.
                </p>
              </div>
            </div>
          )}

          {/* Painel de Erro */}
          {downloadStatus === 'error' && (
            <div className="p-4 bg-rose-950/30 border border-rose-500/30 rounded-2xl flex items-start gap-3 animate-in fade-in duration-200 text-xs">
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-bold text-rose-300">Erro na atualização</p>
                <p className="text-gray-400 text-[11px] mt-0.5">{downloadError || 'Ocorreu uma falha inesperada.'}</p>
              </div>
            </div>
          )}
        </div>

        {/* Rodapé e Ações */}
        <div className="p-6 pt-4 border-t border-gray-800/80 bg-gray-950/70 space-y-3">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            {/* Estado 1: Idle (Ainda não baixou) */}
            {downloadStatus === 'idle' && (
              <button
                onClick={startDownload}
                className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-400 text-gray-950 font-bold text-sm shadow-lg shadow-amber-500/20 hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer"
              >
                <Download className="w-4 h-4 stroke-[2.5]" />
                Atualizar Automaticamente
              </button>
            )}

            {/* Estado 2: Baixando */}
            {downloadStatus === 'downloading' && (
              <button
                onClick={cancelDownload}
                className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-gray-800 hover:bg-gray-700 text-gray-200 text-sm font-semibold border border-gray-700 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4 text-gray-400" />
                Cancelar Download
              </button>
            )}

            {/* Estado 3: Download Concluído */}
            {downloadStatus === 'downloaded' && (
              <button
                onClick={installUpdate}
                className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-400 text-gray-950 font-bold text-sm shadow-lg shadow-emerald-500/20 hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer"
              >
                <RefreshCw className="w-4 h-4 stroke-[2.5]" />
                Reiniciar e Atualizar Agora
              </button>
            )}

            {/* Estado 4: Instalando */}
            {downloadStatus === 'installing' && (
              <button
                disabled
                className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-emerald-600/50 text-white font-bold text-sm cursor-not-allowed"
              >
                <Loader2 className="w-4 h-4 animate-spin" />
                Reiniciando aplicativo...
              </button>
            )}

            {/* Estado 5: Erro */}
            {downloadStatus === 'error' && (
              <button
                onClick={startDownload}
                className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-gray-950 font-bold text-sm shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                Tentar Novamente
              </button>
            )}

            {/* Botão de Download Manual no Navegador (como alternativa) */}
            <button
              onClick={() => {
                openDownload();
                handleClose();
              }}
              className="px-4 py-3 rounded-2xl bg-gray-800/80 hover:bg-gray-800 text-gray-300 text-xs font-medium border border-gray-700/60 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              title="Baixar arquivo manualmente via navegador"
            >
              <ExternalLink className="w-3.5 h-3.5 text-gray-400" />
              <span>Manual</span>
            </button>

            {/* Botão para Ver no GitHub */}
            <button
              onClick={openReleasePage}
              className="px-4 py-3 rounded-2xl bg-gray-800/80 hover:bg-gray-800 text-gray-300 text-xs font-medium border border-gray-700/60 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              title="Abrir notas no GitHub"
            >
              <span>GitHub</span>
            </button>
          </div>

          {/* Opções de Silenciar e Fechar */}
          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center gap-2 text-xs text-gray-400 hover:text-gray-300 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={dontShowAgain}
                onChange={(e) => setDontShowAgain(e.target.checked)}
                className="w-3.5 h-3.5 rounded border-gray-700 bg-gray-900 text-amber-500 focus:ring-amber-500/30"
              />
              <span>Não me lembrar sobre a v{updateInfo.latestVersion}</span>
            </label>

            <button
              onClick={handleClose}
              className="text-xs text-gray-400 hover:text-white transition-colors cursor-pointer"
            >
              Lembrar mais tarde
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
