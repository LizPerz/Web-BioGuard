import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getStoredTheme, applyTheme, toggleTheme, initTheme, type Theme } from '../lib/theme.ts';
import { STORAGE_KEYS } from '../lib/security.ts';

// Shims de Web Storage y document para Node (sin jsdom).
function makeStorage(): Storage {
  const store = new Map<string, string>();
  return {
    get length() {
      return store.size;
    },
    clear: () => store.clear(),
    getItem: (key: string) => store.get(key) ?? null,
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    removeItem: (key: string) => void store.delete(key),
    setItem: (key: string, value: string) => void store.set(key, String(value)),
  } as Storage;
}

(globalThis as Record<string, unknown>).localStorage ??= makeStorage();
const rootEl: { dataset: Record<string, string> } = { dataset: {} };
(globalThis as Record<string, unknown>).document ??= { documentElement: rootEl };

const storage = (globalThis as { localStorage: Storage }).localStorage;
const THEME_KEY = 'bioguard_theme';

// ── getStoredTheme ─────────────────────────────────────────

test('getStoredTheme: sin clave almacenada usa dark por defecto', () => {
  storage.removeItem(THEME_KEY);
  assert.equal(getStoredTheme(), 'dark');
});

test('getStoredTheme: reconoce "light" y "dark" exactos', () => {
  storage.setItem(THEME_KEY, 'light');
  assert.equal(getStoredTheme(), 'light');
  storage.setItem(THEME_KEY, 'dark');
  assert.equal(getStoredTheme(), 'dark');
});

const THEMES_INVALIDOS: Array<[string, Theme]> = [
  ['Light', 'dark'],
  ['LIGHT', 'dark'],
  [' light', 'dark'],
  ['light ', 'dark'],
  ['', 'dark'],
  ['foo', 'dark'],
  ['1', 'dark'],
  ['0', 'dark'],
  ['bioguard_theme', 'dark'],
];

for (const [valor, esperado] of THEMES_INVALIDOS) {
  test(`getStoredTheme: el valor "${valor}" cae a dark`, () => {
    storage.setItem(THEME_KEY, valor);
    assert.equal(getStoredTheme(), esperado);
  });
}

test('getStoredTheme: tolera localStorage que lanza', () => {
  const original = storage.getItem.bind(storage);
  storage.getItem = () => {
    throw new Error('Storage bloqueado');
  };
  try {
    assert.equal(getStoredTheme(), 'dark');
  } finally {
    storage.getItem = original;
  }
});

// ── applyTheme ─────────────────────────────────────────────

for (const tema of ['light', 'dark'] as Theme[]) {
  test(`applyTheme: aplica "${tema}" al dataset del documento`, () => {
    applyTheme(tema);
    assert.equal(rootEl.dataset.theme, tema);
  });

  test(`applyTheme: persiste "${tema}" en localStorage`, () => {
    applyTheme(tema);
    assert.equal(storage.getItem(THEME_KEY), tema);
  });
}

test('applyTheme: sobrescribe el tema previamente guardado', () => {
  applyTheme('light');
  applyTheme('dark');
  assert.equal(storage.getItem(THEME_KEY), 'dark');
  assert.equal(rootEl.dataset.theme, 'dark');
});

test('applyTheme: no toca el resto de atributos del dataset', () => {
  rootEl.dataset['otra'] = 'valor';
  applyTheme('light');
  assert.equal(rootEl.dataset['otra'], 'valor');
  assert.equal(rootEl.dataset.theme, 'light');
});

test('applyTheme: tolera localStorage.setItem que lanza (quota/sandbox)', () => {
  const original = storage.setItem.bind(storage);
  storage.setItem = () => {
    throw new Error('QuotaExceededError');
  };
  try {
    assert.doesNotThrow(() => applyTheme('light'));
    // El atributo del documento se aplica aunque falle la persistencia.
    assert.equal(rootEl.dataset.theme, 'light');
  } finally {
    storage.setItem = original;
  }
});

// ── toggleTheme ────────────────────────────────────────────

test('toggleTheme: light -> dark', () => {
  const result = toggleTheme('light');
  assert.equal(result, 'dark');
  assert.equal(rootEl.dataset.theme, 'dark');
  assert.equal(storage.getItem(THEME_KEY), 'dark');
});

test('toggleTheme: dark -> light', () => {
  const result = toggleTheme('dark');
  assert.equal(result, 'light');
  assert.equal(rootEl.dataset.theme, 'light');
  assert.equal(storage.getItem(THEME_KEY), 'light');
});

test('toggleTheme: cualquier valor que no sea "light" pasa a light', () => {
  const result = toggleTheme('foo' as Theme);
  assert.equal(result, 'light');
});

test('toggleTheme: el ciclo light/dark es invertible', () => {
  assert.equal(toggleTheme(toggleTheme('light')), 'light');
});

test('toggleTheme: aplica el resultado al documento inmediatamente', () => {
  applyTheme('dark');
  toggleTheme('dark');
  assert.equal(rootEl.dataset.theme, 'light');
});

// ── initTheme ──────────────────────────────────────────────

test('initTheme: aplica el tema guardado ("light")', () => {
  storage.setItem(THEME_KEY, 'light');
  initTheme();
  assert.equal(rootEl.dataset.theme, 'light');
});

test('initTheme: aplica el tema guardado ("dark")', () => {
  storage.setItem(THEME_KEY, 'dark');
  initTheme();
  assert.equal(rootEl.dataset.theme, 'dark');
});

test('initTheme: sin tema guardado inicializa en dark', () => {
  storage.removeItem(THEME_KEY);
  initTheme();
  assert.equal(rootEl.dataset.theme, 'dark');
});

test('initTheme: respeta el valor exacto de "light" sin normalizar', () => {
  storage.setItem(THEME_KEY, 'light');
  initTheme();
  assert.equal(rootEl.dataset.theme, 'light');
});

// ── Coherencia con STORAGE_KEYS ────────────────────────────

test('theme: la clave de almacenamiento está centralizada y coincide', () => {
  assert.equal(STORAGE_KEYS.theme, THEME_KEY);
});
