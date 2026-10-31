import { describe, it, expect } from 'vitest';
import { compareSemver, pickBestAsset, GitHubAsset } from '../src/main/services/updaterService';

describe('Updater Service - Testes Unitários', () => {
  describe('compareSemver', () => {
    it('deve identificar que uma versão remota maior requer atualização', () => {
      expect(compareSemver('1.0.0', '1.0.1')).toBeGreaterThan(0);
      expect(compareSemver('1.0.0', '1.1.0')).toBeGreaterThan(0);
      expect(compareSemver('1.0.0', '2.0.0')).toBeGreaterThan(0);
      expect(compareSemver('v1.0.0', 'v1.0.1')).toBeGreaterThan(0);
      expect(compareSemver('1.9.9', '1.10.0')).toBeGreaterThan(0);
    });

    it('deve identificar versões idênticas', () => {
      expect(compareSemver('1.0.0', '1.0.0')).toBe(0);
      expect(compareSemver('v1.0.0', '1.0.0')).toBe(0);
      expect(compareSemver('1.0.0', 'v1.0.0')).toBe(0);
    });

    it('deve identificar quando a versão local é maior que a remota (modo dev)', () => {
      expect(compareSemver('1.1.0', '1.0.0')).toBeLessThan(0);
      expect(compareSemver('2.0.0', '1.9.9')).toBeLessThan(0);
      expect(compareSemver('v1.0.5', 'v1.0.4')).toBeLessThan(0);
    });
  });

  describe('pickBestAsset', () => {
    const mockAssets: GitHubAsset[] = [
      { name: 'Gringotts-1.1.0-setup.exe', browser_download_url: 'https://gh/win.exe', size: 85000000 },
      { name: 'Gringotts-1.1.0-portable.exe', browser_download_url: 'https://gh/portable.exe', size: 80000000 },
      { name: 'Gringotts-1.1.0.AppImage', browser_download_url: 'https://gh/linux.AppImage', size: 90000000 },
      { name: 'gringotts_1.1.0_amd64.deb', browser_download_url: 'https://gh/linux.deb', size: 75000000 },
      { name: 'Gringotts-1.1.0.dmg', browser_download_url: 'https://gh/mac.dmg', size: 95000000 },
      { name: 'Gringotts-1.1.0-mac.zip', browser_download_url: 'https://gh/mac.zip', size: 92000000 },
    ];

    it('deve selecionar o instalador .exe para Windows (win32)', () => {
      const best = pickBestAsset(mockAssets, 'win32');
      expect(best?.name).toBe('Gringotts-1.1.0-setup.exe');
      expect(best?.browser_download_url).toBe('https://gh/win.exe');
    });

    it('deve selecionar o arquivo .dmg para macOS (darwin)', () => {
      const best = pickBestAsset(mockAssets, 'darwin');
      expect(best?.name).toBe('Gringotts-1.1.0.dmg');
      expect(best?.browser_download_url).toBe('https://gh/mac.dmg');
    });

    it('deve selecionar o pacote .AppImage para Linux (linux)', () => {
      const best = pickBestAsset(mockAssets, 'linux');
      expect(best?.name).toBe('Gringotts-1.1.0.AppImage');
      expect(best?.browser_download_url).toBe('https://gh/linux.AppImage');
    });

    it('deve retornar undefined se a lista de assets estiver vazia', () => {
      expect(pickBestAsset([], 'linux')).toBeUndefined();
      expect(pickBestAsset(undefined, 'win32')).toBeUndefined();
    });
  });
});
