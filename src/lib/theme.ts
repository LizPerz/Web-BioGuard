export type Theme = 'light' | 'dark';

const THEME_STORAGE_KEY = 'bioguard_theme';

export function getStoredTheme(): Theme {
  try {
    return localStorage.getItem(THEME_STORAGE_KEY) === 'light' ? 'light' : 'dark';
  } catch {
    return 'dark';
  }
}

export function applyTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // almacenamiento no disponible; el tema aplicado sigue siendo válido en memoria
  }
}

export function toggleTheme(current: Theme): Theme {
  const next: Theme = current === 'light' ? 'dark' : 'light';
  applyTheme(next);
  return next;
}

export function initTheme(): void {
  document.documentElement.dataset.theme = getStoredTheme();
}
