import { app, shell, BrowserWindow } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';

export interface GitHubAsset {
  name: string;
  browser_download_url: string;
  size: number;
}

export interface GitHubRelease {
  tag_name: string;
  name: string;
  body: string;
  html_url: string;
  published_at: string;
  assets?: GitHubAsset[];
}

export interface UpdateCheckResult {
  hasUpdate: boolean;
  currentVersion: string;
  latestVersion: string;
  releaseName: string;
  releaseNotes: string;
  releaseUrl: string;
  downloadUrl?: string;
  assetName?: string;
  assetSize?: number;
  publishedAt?: string;
  platform: 'linux' | 'win32' | 'darwin';
  arch: string;
  isAppImage?: boolean;
  error?: string;
}

export interface DownloadProgress {
  percent: number;
  transferred: number;
  total: number;
  bytesPerSecond: number;
}

export function formatBytes(bytes: number): string {
  if (bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

/**
 * Compara duas versões em formato semver (ex: "1.0.0" e "1.1.0" ou "v1.0.0").
 * Retorna:
 *   1 se remote > current (atualização disponível)
 *   0 se remote == current (versão idêntica)
 *  -1 se remote < current (versão local mais recente ou dev)
 */
export function compareSemver(current: string, remote: string): number {
  const clean = (v: string) => v.trim().replace(/^[vV]/, '');
  const cParts = clean(current).split('.').map((p) => parseInt(p, 10) || 0);
  const rParts = clean(remote).split('.').map((p) => parseInt(p, 10) || 0);

  const maxLength = Math.max(cParts.length, rParts.length, 3);
  for (let i = 0; i < maxLength; i++) {
    const c = cParts[i] ?? 0;
    const r = rParts[i] ?? 0;
    if (r > c) return 1;
    if (r < c) return -1;
  }
  return 0;
}

/**
 * Seleciona o melhor arquivo de instalação para a plataforma do usuário
 */
export function pickBestAsset(
  assets: GitHubAsset[] | undefined,
  platform: string,
  arch: string = 'x64'
): GitHubAsset | undefined {
  if (!assets || assets.length === 0) return undefined;

  const lowerArch = arch.toLowerCase();
  const isArm = lowerArch.includes('arm');

  if (platform === 'win32') {
    // 1. Prioriza o instalador NSIS (.exe que contenha 'setup' ou 'installer')
    const setupExe = assets.find((a) => {
      const name = a.name.toLowerCase();
      return name.endsWith('.exe') && (name.includes('setup') || name.includes('installer') || name.includes('install'));
    });
    if (setupExe) return setupExe;

    // 2. Qualquer executável que não seja versão portable
    const exe = assets.find((a) => {
      const name = a.name.toLowerCase();
      return name.endsWith('.exe') && !name.includes('portable');
    });
    if (exe) return exe;

    // 3. Fallback para qualquer outro .exe
    return assets.find((a) => a.name.toLowerCase().endsWith('.exe'));
  }

  if (platform === 'darwin') {
    // macOS: prioriza .dmg compatível com a arquitetura
    if (isArm) {
      const armDmg = assets.find((a) => a.name.toLowerCase().endsWith('.dmg') && a.name.toLowerCase().includes('arm64'));
      if (armDmg) return armDmg;
    }
    const dmg = assets.find((a) => a.name.toLowerCase().endsWith('.dmg'));
    if (dmg) return dmg;
    return assets.find((a) => a.name.toLowerCase().endsWith('.zip'));
  }

  if (platform === 'linux') {
    // Linux: prioriza .AppImage (universal), depois .deb
    const appImage = assets.find((a) => a.name.toLowerCase().endsWith('.appimage'));
    if (appImage) return appImage;
    return assets.find((a) => a.name.toLowerCase().endsWith('.deb'));
  }

  return assets[0];
}

export class UpdaterService {
  private readonly repoOwner = 'JaoOlvr';
  private readonly repoName = 'gringotts';
  private lastCheckResult: UpdateCheckResult | null = null;
  private downloadAbortController: AbortController | null = null;
  private downloadedFilePath: string | null = null;
  private downloadedVersion: string | null = null;

  private broadcast(channel: string, ...args: unknown[]) {
    try {
      const windows = BrowserWindow.getAllWindows();
      for (const win of windows) {
        if (!win.isDestroyed()) {
          win.webContents.send(channel, ...args);
        }
      }
    } catch {
      // Ignora erro se executando fora do ambiente gráfico
    }
  }

  /**
   * Consulta a API do GitHub Releases para verificar se há versões mais recentes
   */
  async checkForUpdates(): Promise<UpdateCheckResult> {
    const currentVersion = app ? app.getVersion() : '1.4.0';
    const platform = (process.platform === 'win32' || process.platform === 'darwin' || process.platform === 'linux')
      ? process.platform
      : 'linux';
    const arch = process.arch || 'x64';
    const isAppImage = !!process.env.APPIMAGE;

    try {
      const response = await fetch(
        `https://api.github.com/repos/${this.repoOwner}/${this.repoName}/releases/latest`,
        {
          headers: {
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'Gringotts-App-Updater',
          },
          signal: AbortSignal.timeout(6000),
        }
      );

      if (!response.ok) {
        if (response.status === 404) {
          const result: UpdateCheckResult = {
            hasUpdate: false,
            currentVersion,
            latestVersion: currentVersion,
            releaseName: 'Versão de Desenvolvimento',
            releaseNotes: 'Nenhuma versão pública lançada ainda no repositório.',
            releaseUrl: `https://github.com/${this.repoOwner}/${this.repoName}/releases`,
            platform,
            arch,
            isAppImage,
          };
          this.lastCheckResult = result;
          return result;
        }
        throw new Error(`GitHub API respondeu com status ${response.status}`);
      }

      const release = (await response.json()) as GitHubRelease;
      const latestVersion = release.tag_name.replace(/^[vV]/, '');
      const hasUpdate = compareSemver(currentVersion, latestVersion) > 0;

      const bestAsset = pickBestAsset(release.assets, platform, arch);

      const result: UpdateCheckResult = {
        hasUpdate,
        currentVersion,
        latestVersion,
        releaseName: release.name || `Versão ${release.tag_name}`,
        releaseNotes: release.body || '',
        releaseUrl: release.html_url,
        downloadUrl: bestAsset ? bestAsset.browser_download_url : release.html_url,
        assetName: bestAsset ? bestAsset.name : undefined,
        assetSize: bestAsset ? bestAsset.size : undefined,
        publishedAt: release.published_at,
        platform,
        arch,
        isAppImage,
      };

      this.lastCheckResult = result;
      return result;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      const result: UpdateCheckResult = {
        hasUpdate: false,
        currentVersion,
        latestVersion: currentVersion,
        releaseName: '',
        releaseNotes: '',
        releaseUrl: `https://github.com/${this.repoOwner}/${this.repoName}/releases`,
        platform,
        arch,
        isAppImage,
        error: message,
      };
      this.lastCheckResult = result;
      return result;
    }
  }

  /**
   * Inicia o download da atualização em segundo plano com acompanhamento de progresso
   */
  async startDownload(customUrl?: string): Promise<{ success: boolean; filePath?: string; error?: string }> {
    const targetUrl = customUrl || this.lastCheckResult?.downloadUrl;
    if (!targetUrl) {
      return { success: false, error: 'Nenhuma URL de download disponível para esta versão.' };
    }

    const assetName = this.lastCheckResult?.assetName || (targetUrl.split('/').pop() || 'update.bin');
    const tempDir = app ? app.getPath('temp') : '/tmp';
    const destinationPath = path.join(tempDir, `gringotts-update-${Date.now()}-${assetName}`);

    this.downloadAbortController = new AbortController();
    const signal = this.downloadAbortController.signal;

    try {
      this.broadcast('updater:download-progress', {
        percent: 0,
        transferred: 0,
        total: this.lastCheckResult?.assetSize || 0,
        bytesPerSecond: 0,
      });

      const response = await fetch(targetUrl, {
        signal,
        redirect: 'follow',
        headers: {
          'User-Agent': 'Gringotts-App-Updater',
        },
      });

      if (!response.ok) {
        throw new Error(`Falha no download (HTTP ${response.status} - ${response.statusText})`);
      }

      const totalHeader = response.headers.get('content-length');
      const total = totalHeader ? parseInt(totalHeader, 10) : (this.lastCheckResult?.assetSize || 0);

      if (!response.body) {
        throw new Error('Corpo de download vazio retornado pelo servidor.');
      }

      let transferred = 0;
      let lastReportTime = Date.now();
      let bytesSinceLastReport = 0;

      const nodeStream = Readable.fromWeb(response.body as any);

      nodeStream.on('data', (chunk: Buffer) => {
        transferred += chunk.length;
        bytesSinceLastReport += chunk.length;

        const now = Date.now();
        const delta = now - lastReportTime;
        if (delta >= 250) {
          const bytesPerSecond = Math.round((bytesSinceLastReport / delta) * 1000);
          const percent = total > 0 ? Math.min(100, Math.round((transferred / total) * 100)) : 0;
          this.broadcast('updater:download-progress', {
            percent,
            transferred,
            total,
            bytesPerSecond,
          });
          lastReportTime = now;
          bytesSinceLastReport = 0;
        }
      });

      const fileWriteStream = fs.createWriteStream(destinationPath);
      await pipeline(nodeStream, fileWriteStream);

      this.downloadedFilePath = destinationPath;
      this.downloadedVersion = this.lastCheckResult?.latestVersion || null;

      this.broadcast('updater:download-progress', {
        percent: 100,
        transferred: total > 0 ? total : transferred,
        total: total > 0 ? total : transferred,
        bytesPerSecond: 0,
      });

      this.broadcast('updater:download-complete', {
        filePath: destinationPath,
        version: this.downloadedVersion,
      });

      return { success: true, filePath: destinationPath };
    } catch (err: unknown) {
      if (signal.aborted) {
        try { if (fs.existsSync(destinationPath)) fs.unlinkSync(destinationPath); } catch {}
        return { success: false, error: 'Download cancelado pelo usuário.' };
      }

      const msg = err instanceof Error ? err.message : String(err);
      this.broadcast('updater:download-error', { error: msg });
      try { if (fs.existsSync(destinationPath)) fs.unlinkSync(destinationPath); } catch {}
      return { success: false, error: msg };
    } finally {
      this.downloadAbortController = null;
    }
  }

  /**
   * Cancela o download em andamento
   */
  cancelDownload(): boolean {
    if (this.downloadAbortController) {
      this.downloadAbortController.abort();
      this.downloadAbortController = null;
      return true;
    }
    return false;
  }

  /**
   * Instala a atualização baixada e reinicia o aplicativo
   */
  async installUpdate(): Promise<{ success: boolean; error?: string }> {
    if (!this.downloadedFilePath || !fs.existsSync(this.downloadedFilePath)) {
      return { success: false, error: 'Arquivo de atualização não encontrado no disco local.' };
    }

    const platform = process.platform;

    try {
      if (platform === 'linux') {
        const appImagePath = process.env.APPIMAGE;
        if (appImagePath && fs.existsSync(appImagePath)) {
          // Garante que o novo AppImage seja executável
          fs.chmodSync(this.downloadedFilePath, 0o755);

          // Atualiza o arquivo AppImage no mesmo local (in-place)
          try {
            fs.copyFileSync(this.downloadedFilePath, appImagePath);
            fs.chmodSync(appImagePath, 0o755);
          } catch {
            fs.unlinkSync(appImagePath);
            fs.copyFileSync(this.downloadedFilePath, appImagePath);
            fs.chmodSync(appImagePath, 0o755);
          }

          // Remove arquivo temporário baixado
          try { fs.unlinkSync(this.downloadedFilePath); } catch {}

          // Reinicia a aplicação a partir do AppImage atualizado
          if (app) {
            app.relaunch({ execPath: appImagePath });
            app.exit(0);
          }
          return { success: true };
        } else {
          // Se não estiver rodando como AppImage (ex: .deb ou modo dev)
          await shell.showItemInFolder(this.downloadedFilePath);
          return { success: true };
        }
      }

      if (platform === 'win32') {
        // Dispara o instalador NSIS desanexado do processo pai
        const child = spawn(this.downloadedFilePath, [], {
          detached: true,
          stdio: 'ignore',
        });
        child.unref();

        if (app) {
          app.exit(0);
        }
        return { success: true };
      }

      if (platform === 'darwin') {
        await shell.openPath(this.downloadedFilePath);
        if (app) {
          app.exit(0);
        }
        return { success: true };
      }

      return { success: false, error: `Plataforma ${platform} não suportada para instalação direta.` };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, error: msg };
    }
  }

  /**
   * Obtém informações sobre atualizações já baixadas
   */
  getDownloadStatus() {
    return {
      hasDownloaded: !!this.downloadedFilePath && fs.existsSync(this.downloadedFilePath),
      filePath: this.downloadedFilePath,
      version: this.downloadedVersion,
    };
  }

  /**
   * Abre links externos com validação de segurança
   */
  async openExternalUrl(url: string): Promise<boolean> {
    try {
      const parsed = new URL(url);
      if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
        await shell.openExternal(url);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }
}

export const updaterService = new UpdaterService();
