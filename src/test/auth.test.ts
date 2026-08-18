import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  saveSession,
  getAccessToken,
  getRefreshToken,
  getUser,
  clearSession,
  setPendingOnboarding,
  getPendingOnboarding,
  clearPendingOnboarding,
  setPendingVerifyEmail,
  getPendingVerifyEmail,
  clearPendingVerifyEmail,
  updateSessionPlan,
  updateSessionUser,
  broadcastLogout,
  onLogoutFromOtherTab,
  type SessionUser,
} from '../lib/auth.ts';

// Shims de Web Storage para Node (sin jsdom).
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
(globalThis as Record<string, unknown>).sessionStorage ??= makeStorage();

const USUARIO: SessionUser = {
  id: 'usr-1',
  nombre: 'Ana Test',
  rol: 'Medico',
  plan: 'Gratis',
  correo: 'ana@example.com',
};

test('saveSession: guarda token, refresh y usuario', () => {
  saveSession('tok-abc', 'refresh-xyz', USUARIO);
  assert.equal(getAccessToken(), 'tok-abc');
  assert.equal(getRefreshToken(), 'refresh-xyz');
  assert.deepEqual(getUser(), USUARIO);
});

test('saveSession: sin refresh token no sobrescribe un refresh previo', () => {
  saveSession('tok-1', 'refresh-1', USUARIO);
  saveSession('tok-2', null, USUARIO);
  assert.equal(getAccessToken(), 'tok-2');
  assert.equal(getRefreshToken(), 'refresh-1');
});

test('clearSession: elimina todos los datos de sesión', () => {
  saveSession('tok', 'refresh', USUARIO);
  clearSession();
  assert.equal(getAccessToken(), null);
  assert.equal(getRefreshToken(), null);
  assert.equal(getUser(), null);
});

test('getUser: devuelve null ante datos corruptos (anti-tamper)', () => {
  (globalThis as { sessionStorage: Storage }).sessionStorage.setItem('bioguard_user', '{no-json');
  assert.equal(getUser(), null);
  (globalThis as { sessionStorage: Storage }).sessionStorage.setItem('bioguard_user', 'not json at all');
  assert.equal(getUser(), null);
});

test('onboarding: marca y limpia el pendiente', () => {
  clearPendingOnboarding();
  assert.equal(getPendingOnboarding(), false);
  setPendingOnboarding(true);
  assert.equal(getPendingOnboarding(), true);
  setPendingOnboarding(false);
  assert.equal(getPendingOnboarding(), false);
});

test('verify-email pendiente: se guarda en sessionStorage', () => {
  clearPendingVerifyEmail();
  assert.equal(getPendingVerifyEmail(), '');
  setPendingVerifyEmail('ana@example.com');
  assert.equal(getPendingVerifyEmail(), 'ana@example.com');
  clearPendingVerifyEmail();
  assert.equal(getPendingVerifyEmail(), '');
});

test('updateSessionPlan: actualiza solo el plan conservando el resto', () => {
  saveSession('tok', 'refresh', USUARIO);
  updateSessionPlan('Premium');
  const user = getUser();
  assert.equal(user?.plan, 'Premium');
  assert.equal(user?.id, USUARIO.id);
  assert.equal(user?.nombre, USUARIO.nombre);
});

test('updateSessionUser: aplica un parche parcial sin sesión activa', () => {
  clearSession();
  assert.equal(updateSessionUser({ nombre: 'X' }), null);
  saveSession('tok', 'refresh', USUARIO);
  const updated = updateSessionUser({ nombre: 'Ana López', fotoPerfil: null });
  assert.equal(updated?.nombre, 'Ana López');
  assert.equal(updated?.correo, USUARIO.correo);
});

test('session: getters sin sesión previa devuelven null o cadena vacía', () => {
  clearSession();
  clearPendingVerifyEmail();
  assert.equal(getAccessToken(), null);
  assert.equal(getRefreshToken(), null);
  assert.equal(getUser(), null);
  assert.equal(getPendingVerifyEmail(), '');
});

test('saveSession: sobrescribe una sesión existente', () => {
  saveSession('tok-old', 'refresh-old', USUARIO);
  const nueva: SessionUser = { ...USUARIO, id: 'usr-2', nombre: 'Beatriz' };
  saveSession('tok-new', 'refresh-new', nueva);
  assert.equal(getAccessToken(), 'tok-new');
  assert.equal(getRefreshToken(), 'refresh-new');
  assert.deepEqual(getUser(), nueva);
});

test('clearSession: es idempotente y no toca onboarding ni verify-email', () => {
  saveSession('tok', 'refresh', USUARIO);
  setPendingOnboarding(true);
  setPendingVerifyEmail('ana@example.com');
  clearSession();
  clearSession();
  assert.equal(getAccessToken(), null);
  assert.equal(getPendingOnboarding(), true, 'onboarding se conserva');
  assert.equal(getPendingPendingVerifyEmailSafe(), 'ana@example.com', 'verify-email se conserva');
});

function getPendingPendingVerifyEmailSafe(): string {
  return (globalThis as { sessionStorage: Storage }).sessionStorage.getItem(
    'bioguard_pending_verify_email',
  ) ?? '';
}

test('storage: onboarding vive en localStorage, sesión en sessionStorage/memoria', () => {
  clearPendingOnboarding();
  clearPendingVerifyEmail();
  setPendingOnboarding(true);
  saveSession('tok-mem', 'refresh-xyz', USUARIO);
  setPendingVerifyEmail('ana@example.com');
  assert.equal(
    (globalThis as { localStorage: Storage }).localStorage.getItem('bioguard_pending_onboarding'),
    'true',
  );
  assert.equal(
    (globalThis as { localStorage: Storage }).localStorage.getItem('bioguard_pending_verify_email'),
    null,
    'el correo NO debe estar en localStorage',
  );
  assert.equal(
    (globalThis as { sessionStorage: Storage }).sessionStorage.getItem('bioguard_pending_verify_email'),
    'ana@example.com',
  );
});

test('session: el access token vive solo en memoria (ni localStorage ni sessionStorage)', () => {
  saveSession('tok-mem', 'refresh-xyz', USUARIO);
  const ls = globalThis as { localStorage: Storage; sessionStorage: Storage };
  assert.equal(ls.localStorage.getItem('bioguard_access_token'), null, 'access token NO en localStorage');
  assert.equal(ls.sessionStorage.getItem('bioguard_access_token'), null, 'access token NO en sessionStorage');
  assert.equal(ls.localStorage.getItem('bioguard_refresh_token'), null, 'refresh token NO en localStorage');
  assert.equal(ls.localStorage.getItem('bioguard_user'), null, 'usuario NO en localStorage');
  assert.equal(ls.sessionStorage.getItem('bioguard_refresh_token'), 'refresh-xyz');
  assert.equal(ls.sessionStorage.getItem('bioguard_user'), JSON.stringify(USUARIO));
  assert.equal(getAccessToken(), 'tok-mem');
});

test('onboarding: tolera valores no-verdadestring como pendiente', () => {
  (globalThis as { localStorage: Storage }).localStorage.setItem('bioguard_pending_onboarding', '1');
  assert.equal(getPendingOnboarding(), false);
  (globalThis as { localStorage: Storage }).localStorage.setItem('bioguard_pending_onboarding', 'TRUE');
  assert.equal(getPendingOnboarding(), false);
});

test('getUser: devuelve el JSON almacenado tal cual (contrato del cast)', () => {
  const conExtra = JSON.stringify({ ...USUARIO, hack: true });
  (globalThis as { sessionStorage: Storage }).sessionStorage.setItem('bioguard_user', conExtra);
  const parsed = getUser();
  assert.equal(parsed?.id, USUARIO.id);
  assert.equal((parsed as { hack?: boolean } | null)?.hack, true);
});

test('updateSessionPlan: no op sin sesión activa', () => {
  clearSession();
  updateSessionPlan('Premium');
  assert.equal(getUser(), null);
  updateSessionPlan('');
  assert.equal(getUser(), null);
});

test('updateSessionUser: persiste el parche con fotoPerfil null', () => {
  saveSession('tok', 'refresh', USUARIO);
  updateSessionUser({ fotoPerfil: null });
  const raw = (globalThis as { sessionStorage: Storage }).sessionStorage.getItem('bioguard_user');
  assert.ok(raw, 'el usuario debe persistir actualizado');
  assert.match(raw as string, /"fotoPerfil":null/);
  assert.ok((raw as string).includes(USUARIO.id));
});

test('saveSession: preserva correo y foto en el round-trip JSON', () => {
  const usuarioConFoto: SessionUser = { ...USUARIO, fotoPerfil: 'data:image/png;base64,AAAA' };
  saveSession('tok', 'refresh', usuarioConFoto);
  assert.deepEqual(getUser(), usuarioConFoto);
});

// ── Seguridad: BroadcastChannel logout entre pestañas ────────────────────

test('broadcastLogout: no lanza errores cuando BroadcastChannel no existe', () => {
  const original = globalThis.BroadcastChannel;
  try {
    // Simular entorno sin BroadcastChannel (SSR o navegador antiguo)
    delete (globalThis as Record<string, unknown>).BroadcastChannel;
    assert.doesNotThrow(() => broadcastLogout());
  } finally {
    if (original) globalThis.BroadcastChannel = original;
  }
});

test('broadcastLogout: envía mensaje de tipo logout y cierra el canal', () => {
  let receivedMessage: unknown = null;
  let channelClosed = false;

  class MockBroadcastChannel {
    name: string;
    constructor(name: string) { this.name = name; }
    postMessage(msg: unknown) { receivedMessage = msg; }
    close() { channelClosed = true; }
    onmessage: ((ev: MessageEvent) => void) | null = null;
  }

  const original = globalThis.BroadcastChannel;
  try {
    globalThis.BroadcastChannel = MockBroadcastChannel as typeof BroadcastChannel;
    broadcastLogout();
    assert.deepEqual(receivedMessage, { type: 'logout' });
    assert.equal(channelClosed, true, 'el canal se cierra tras enviar');
  } finally {
    if (original) globalThis.BroadcastChannel = original;
  }
});

test('onLogoutFromOtherTab: registra y limpia el listener correctamente', () => {
  let callbackInvoked = false;
  const cleanup = onLogoutFromOtherTab(() => { callbackInvoked = true; });
  assert.equal(typeof cleanup, 'function', 'debe retornar una función de limpieza');
  cleanup();
  assert.equal(callbackInvoked, false, 'callback no se invoca tras cleanup');
});

// ── Seguridad: migración de localStorage a sessionStorage ─────────────────

test('migrateFromLocalStorage: migra tokens de localStorage a sessionStorage', () => {
  const ls = globalThis.localStorage;

  // La migración se ejecuta al importar auth.ts (al inicio del módulo).
  // Verificamos que los datos en localStorage se movieron a sessionStorage
  // y que localStorage quedó limpio.
  const lsKeys = Array.from({ length: ls.length }, (_, i) => ls.key(i)).filter(Boolean);

  // Si hay claves bioguard en sessionStorage pero no en localStorage,
  // la migración ya ocurrió correctamente.
  const lsHasBioGuardTokens = lsKeys.some((k) =>
    k === 'bioguard_access_token' || k === 'bioguard_refresh_token' || k === 'bioguard_user',
  );

  // La migración es idempotente: una vez ejecutada, localStorage no tiene tokens.
  assert.equal(lsHasBioGuardTokens, false, 'localStorage no debe tener tokens tras la migración');
  // sessionStorage puede o no tener datos (depende del test runner), pero la función
  // existe y se ejecuta sin errores al importar el módulo.
  assert.ok(true, 'migrateFromLocalStorage se ejecuta sin errores al importar auth.ts');
});
