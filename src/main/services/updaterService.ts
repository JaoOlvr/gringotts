import { app, shell } from 'electron';

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
  error?: string;
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
    // Prioriza instalador .exe
    const exe = assets.find((a) => a.name.toLowerCase().endsWith('.exe') && !a.name.toLowerCase().includes('portable'));
    if (exe) return exe;
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

  /**
   * Consulta a API do GitHub Releases para verificar se há versões mais recentes
   */
  async checkForUpdates(): Promise<UpdateCheckResult> {
    const currentVersion = app ? app.getVersion() : '1.0.0';
    const platform = (process.platform === 'win32' || process.platform === 'darwin' || process.platform === 'linux')
      ? process.platform
      : 'linux';
    const arch = process.arch || 'x64';

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
        // Se ainda não houver nenhuma release publicada (404), trata graciosamente
        if (response.status === 404) {
          return {
            hasUpdate: false,
            currentVersion,
            latestVersion: currentVersion,
            releaseName: 'Versão de Desenvolvimento',
            releaseNotes: 'Nenhuma versão pública lançada ainda no repositório.',
            releaseUrl: `https://github.com/${this.repoOwner}/${this.repoName}/releases`,
            platform,
            arch,
          };
        }
        throw new Error(`GitHub API respondeu com status ${response.status}`);
      }

      const release = (await response.json()) as GitHubRelease;
      const latestVersion = release.tag_name.replace(/^[vV]/, '');
      const hasUpdate = compareSemver(currentVersion, latestVersion) > 0;

      const bestAsset = pickBestAsset(release.assets, platform, arch);

      return {
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
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        hasUpdate: false,
        currentVersion,
        latestVersion: currentVersion,
        releaseName: '',
        releaseNotes: '',
        releaseUrl: `https://github.com/${this.repoOwner}/${this.repoName}/releases`,
        platform,
        arch,
        error: message,
      };
    }
  }

  /**
   * Abre links externos com validação de segurança
   */
  async openExternalUrl(url: string): Promise<boolean> {
    try {
      const parsed = new URL(url);
      // Garante que só abra URLs HTTP/HTTPS seguras
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
