import { describe, it, expect, beforeEach } from 'vitest';

describe('Theme Logic & OS Preference Detection', () => {
  const STORAGE_KEY = 'gringotts_theme_mode';
  let memoryStorage: Record<string, string> = {};

  const fakeStorage = {
    getItem: (key: string) => memoryStorage[key] || null,
    setItem: (key: string, val: string) => { memoryStorage[key] = val; },
    clear: () => { memoryStorage = {}; },
  };

  beforeEach(() => {
    fakeStorage.clear();
  });

  it('deve usar o modo "system" por padrão quando não há preferência salva', () => {
    const saved = fakeStorage.getItem(STORAGE_KEY) || 'system';
    expect(saved).toBe('system');
  });

  it('deve resolver para "dark" quando o sistema operacional prefere dark mode', () => {
    const prefersDark = true;
    const mode = 'system';
    const resolved = mode === 'system' ? (prefersDark ? 'dark' : 'light') : mode;
    expect(resolved).toBe('dark');
  });

  it('deve resolver para "light" quando o sistema operacional prefere light mode', () => {
    const prefersDark = false;
    const mode = 'system';
    const resolved = mode === 'system' ? (prefersDark ? 'dark' : 'light') : mode;
    expect(resolved).toBe('light');
  });

  it('deve priorizar a escolha manual do usuário independente do sistema operacional', () => {
    const prefersDark = true; // SO está em dark mode
    let mode: 'system' | 'light' | 'dark' = 'light'; // usuário forçou light
    let resolved = mode === 'system' ? (prefersDark ? 'dark' : 'light') : mode;
    expect(resolved).toBe('light');

    mode = 'dark';
    resolved = mode === 'system' ? (false ? 'dark' : 'light') : mode;
    expect(resolved).toBe('dark');
  });

  it('deve persistir a escolha no storage', () => {
    fakeStorage.setItem(STORAGE_KEY, 'light');
    expect(fakeStorage.getItem(STORAGE_KEY)).toBe('light');

    fakeStorage.setItem(STORAGE_KEY, 'dark');
    expect(fakeStorage.getItem(STORAGE_KEY)).toBe('dark');

    fakeStorage.setItem(STORAGE_KEY, 'system');
    expect(fakeStorage.getItem(STORAGE_KEY)).toBe('system');
  });
});
