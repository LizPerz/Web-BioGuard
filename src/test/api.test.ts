import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  API_BASE_URL,
  ApiError,
  registerWeb,
  loginWeb,
  enviar2FA,
  verificar2FA,
  forgotPassword,
  marcarResetAbierto,
  getResetAbierto,
  resetPassword,
  refreshToken,
  logout,
  getMiPerfil,
  actualizarPerfil,
  cambiarCorreo,
  subirFoto,
  eliminarFoto,
  cambiarPassword,
  eliminarMiCuenta,
  getMiPaciente,
  createPaciente,
  actualizarPaciente,
  actualizarBiometriaPaciente,
  eliminarPaciente,
  getCuidadores,
  crearCuidador,
  actualizarCuidador,
  eliminarCuidador,
  getQrPaciente,
  regenerarQrPaciente,
  getQrCuidador,
  regenerarQrCuidador,
  getPlanes,
  getMiPlan,
  simularPago,
  getHistorialPagos,
  getLecturasRango,
  getEventos,
  getHistorialAlertas,
  getPredicciones,
  getPrediccionActual,
  getUbicacionActual,
  getRutaUbicaciones,
  getNotificaciones,
  getNotificacionesByPaciente,
  marcarNotificacionLeida,
  eliminarNotificacion,
} from '../lib/api.ts';
import { saveSession, clearSession, type SessionUser } from '../lib/auth.ts';
import { API_ORIGIN } from '../lib/security.ts';

// ── Shims de entorno (Node sin jsdom) ──────────────────────

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

const assignedUrls: string[] = [];
const locationShim = {
  pathname: '/dashboard',
  assign: (url: string) => {
    assignedUrls.push(url);
  },
};
(globalThis as Record<string, unknown>).window ??= { location: locationShim };
(globalThis as Record<string, unknown>).location ??= locationShim;

// ── Mock de fetch ──────────────────────────────────────────

interface FetchRecord {
  url: string;
  init: RequestInit;
}

function makeResponse(body: unknown, status = 200): Response {
  const ok = status >= 200 && status < 300;
  return {
    ok,
    status,
    json: async () => body,
  } as unknown as Response;
}

function nonJsonResponse(status = 500): Response {
  return {
    ok: false,
    status,
    json: async () => {
      throw new Error('invalid json');
    },
  } as unknown as Response;
}

let fetchCalls: FetchRecord[] = [];
let responseQueue: Response[] = [];

globalThis.fetch = (async (url: unknown, init?: RequestInit) => {
  fetchCalls.push({ url: String(url), init: init ?? {} });
  const next = responseQueue.shift();
  if (!next) throw new Error('fetch invocado sin respuesta encolada');
  return next;
}) as unknown as typeof fetch;

beforeEach(() => {
  fetchCalls = [];
  responseQueue = [];
  assignedUrls.length = 0;
  locationShim.pathname = '/dashboard';
  clearSession();
});

const USUARIO: SessionUser = {
  id: 'usr-1',
  nombre: 'Ana Test',
  rol: 'Medico',
  plan: 'Gratis',
  correo: 'ana@example.com',
};

// ── API_BASE_URL ───────────────────────────────────────────

test('api: API_BASE_URL apunta al API de producción por defecto', () => {
  assert.equal(API_BASE_URL, API_ORIGIN);
});

// ── ApiError ───────────────────────────────────────────────

test('api: ApiError expone nombre y estado', () => {
  const err = new ApiError('mensaje', 500);
  assert.equal(err.name, 'ApiError');
  assert.equal(err.status, 500);
  assert.equal(err.message, 'mensaje');
  assert.ok(err instanceof Error);
});

test('api: ApiError con estado 0 para fallos de red', () => {
  const err = new ApiError('sin red', 0);
  assert.equal(err.status, 0);
});

// ── Endpoints: ruta y método ───────────────────────────────

interface EndpointCase {
  name: string;
  invoke: () => Promise<unknown>;
  path: string;
  method: string;
  body?: unknown;
}

const ENDPOINTS: EndpointCase[] = [
  {
    name: 'registerWeb',
    invoke: () =>
      registerWeb({
        Nombre: 'Ana',
        ApellidoPaterno: 'López',
        Correo: 'ana@example.com',
        Password: 'Passw0rd!',
        PlanNombre: 'Gratis',
      }),
    path: '/api/Auth/register',
    method: 'POST',
  },
  {
    name: 'loginWeb',
    invoke: () => loginWeb({ Correo: 'ana@example.com', Password: 'Passw0rd!' }),
    path: '/api/Auth/login-web',
    method: 'POST',
  },
  {
    name: 'enviar2FA',
    invoke: () => enviar2FA({ Correo: 'ana@example.com' }),
    path: '/api/Auth/2FA/enviar',
    method: 'POST',
  },
  {
    name: 'verificar2FA',
    invoke: () => verificar2FA({ Correo: 'ana@example.com', Codigo: '123456' }),
    path: '/api/Auth/2FA/verificar',
    method: 'POST',
  },
  {
    name: 'forgotPassword',
    invoke: () => forgotPassword({ Correo: 'ana@example.com' }),
    path: '/api/Auth/forgot-password',
    method: 'POST',
  },
  {
    name: 'marcarResetAbierto',
    invoke: () => marcarResetAbierto({ RequestId: 'req-1' }),
    path: '/api/Auth/reset-password/abrir',
    method: 'POST',
  },
  {
    name: 'getResetAbierto',
    invoke: () => getResetAbierto('req 1'),
    path: '/api/Auth/reset-password/estado?requestId=req%201',
    method: 'GET',
  },
  {
    name: 'resetPassword',
    invoke: () => resetPassword({ Token: 'tok', NuevaPassword: 'Passw0rd!' }),
    path: '/api/Auth/reset-password',
    method: 'POST',
  },
  {
    name: 'refreshToken',
    invoke: () => refreshToken({ RefreshToken: 'rt' }),
    path: '/api/Auth/refresh',
    method: 'POST',
  },
  {
    name: 'logout',
    invoke: () => logout('tok-sesion'),
    path: '/api/Auth/logout',
    method: 'POST',
  },
  {
    name: 'getMiPerfil',
    invoke: () => getMiPerfil(),
    path: '/api/UsuariosWeb/mi-perfil',
    method: 'GET',
  },
  {
    name: 'actualizarPerfil',
    invoke: () => actualizarPerfil({ Nombre: 'Ana', ApellidoPaterno: 'L', ApellidoMaterno: 'M' }),
    path: '/api/UsuariosWeb/mi-perfil',
    method: 'PUT',
  },
  {
    name: 'cambiarCorreo',
    invoke: () => cambiarCorreo({ NuevoCorreo: 'nuevo@example.com' }),
    path: '/api/UsuariosWeb/mi-perfil/correo',
    method: 'PUT',
  },
  {
    name: 'subirFoto',
    invoke: () => subirFoto({ FotoBase64: 'AAAA' }),
    path: '/api/UsuariosWeb/mi-perfil/foto',
    method: 'PUT',
  },
  {
    name: 'eliminarFoto',
    invoke: () => eliminarFoto(),
    path: '/api/UsuariosWeb/mi-perfil/foto',
    method: 'DELETE',
  },
  {
    name: 'cambiarPassword',
    invoke: () => cambiarPassword({ PasswordActual: 'Old1!', NuevaPassword: 'New1!' }),
    path: '/api/Auth/cambiar-password',
    method: 'PUT',
  },
  {
    name: 'eliminarMiCuenta',
    invoke: () => eliminarMiCuenta(),
    path: '/api/UsuariosWeb/mi-cuenta',
    method: 'DELETE',
  },
  {
    name: 'getMiPaciente',
    invoke: () => getMiPaciente(),
    path: '/api/Pacientes/mi-paciente',
    method: 'GET',
  },
  {
    name: 'createPaciente',
    invoke: () => createPaciente({ Nombre: 'Pepe', Edad: 65, EsDiabetico: true }),
    path: '/api/Pacientes',
    method: 'POST',
  },
  {
    name: 'actualizarPaciente',
    invoke: () => actualizarPaciente('p-1', { Nombre: 'Pepe' }),
    path: '/api/Pacientes/p-1',
    method: 'PUT',
  },
  {
    name: 'actualizarBiometriaPaciente',
    invoke: () => actualizarBiometriaPaciente('p-1', { PesoKg: 70, EstaturaCm: 170 }),
    path: '/api/Pacientes/p-1/biometria',
    method: 'PUT',
  },
  {
    name: 'eliminarPaciente',
    invoke: () => eliminarPaciente('p-1'),
    path: '/api/Pacientes/p-1',
    method: 'DELETE',
  },
  {
    name: 'getCuidadores',
    invoke: () => getCuidadores(),
    path: '/api/Cuidadores',
    method: 'GET',
  },
  {
    name: 'crearCuidador',
    invoke: () => crearCuidador({ PacienteId: 'p-1', Nombre: 'Luis', Parentesco: 'Hijo' }),
    path: '/api/Cuidadores',
    method: 'POST',
  },
  {
    name: 'actualizarCuidador',
    invoke: () =>
      actualizarCuidador('c-1', { Nombre: 'Luis', Parentesco: 'Hijo', Telefono: '555', Correo: 'l@e.c' }),
    path: '/api/Cuidadores/c-1',
    method: 'PUT',
  },
  {
    name: 'eliminarCuidador',
    invoke: () => eliminarCuidador('c-1'),
    path: '/api/Cuidadores/c-1',
    method: 'DELETE',
  },
  {
    name: 'getQrPaciente',
    invoke: () => getQrPaciente('p-1'),
    path: '/api/Pacientes/p-1/qr',
    method: 'GET',
  },
  {
    name: 'regenerarQrPaciente',
    invoke: () => regenerarQrPaciente('p-1'),
    path: '/api/Pacientes/p-1/regenerar-qr',
    method: 'POST',
  },
  {
    name: 'getQrCuidador',
    invoke: () => getQrCuidador('c-1'),
    path: '/api/Cuidadores/c-1/qr',
    method: 'GET',
  },
  {
    name: 'regenerarQrCuidador',
    invoke: () => regenerarQrCuidador('c-1'),
    path: '/api/Cuidadores/c-1/regenerar-qr',
    method: 'POST',
  },
  {
    name: 'getPlanes',
    invoke: () => getPlanes(),
    path: '/api/Planes',
    method: 'GET',
  },
  {
    name: 'getMiPlan',
    invoke: () => getMiPlan(),
    path: '/api/UsuariosWeb/mi-plan',
    method: 'GET',
  },
  {
    name: 'simularPago',
    invoke: () => simularPago({ PlanNombre: 'Premium' }),
    path: '/api/Pagos/simular-pago',
    method: 'POST',
  },
  {
    name: 'getHistorialPagos',
    invoke: () => getHistorialPagos(),
    path: '/api/Pagos/historial',
    method: 'GET',
  },
  {
    name: 'getLecturasRango',
    invoke: () => getLecturasRango('p-1', '2026-01-01', '2026-01-31'),
    path: '/api/Sensores/lecturas/p-1/rango?desde=2026-01-01&hasta=2026-01-31',
    method: 'GET',
  },
  {
    name: 'getEventos',
    invoke: () => getEventos('p-1'),
    path: '/api/Sensores/eventos/p-1?limite=500',
    method: 'GET',
  },
  {
    name: 'getHistorialAlertas',
    invoke: () => getHistorialAlertas('p-1'),
    path: '/api/Reportes/historial-alertas/p-1?limite=500',
    method: 'GET',
  },
  {
    name: 'getPredicciones',
    invoke: () => getPredicciones('p-1'),
    path: '/api/Sensores/predicciones/p-1',
    method: 'GET',
  },
  {
    name: 'getPrediccionActual',
    invoke: () => getPrediccionActual('p-1'),
    path: '/api/Sensores/predicciones/p-1/actual',
    method: 'GET',
  },
  {
    name: 'getUbicacionActual',
    invoke: () => getUbicacionActual('p-1'),
    path: '/api/Sensores/tracking/p-1/actual',
    method: 'GET',
  },
  {
    name: 'getRutaUbicaciones',
    invoke: () => getRutaUbicaciones('p-1', '2026-01-01', '2026-01-31'),
    path: '/api/Sensores/tracking/p-1/ruta?desde=2026-01-01&hasta=2026-01-31',
    method: 'GET',
  },
  {
    name: 'getNotificaciones',
    invoke: () => getNotificaciones(),
    path: '/api/Notificaciones',
    method: 'GET',
  },
  {
    name: 'getNotificacionesByPaciente',
    invoke: () => getNotificacionesByPaciente('p-1'),
    path: '/api/Notificaciones/by-paciente/p-1',
    method: 'GET',
  },
  {
    name: 'marcarNotificacionLeida',
    invoke: () => marcarNotificacionLeida('n-1'),
    path: '/api/Notificaciones/n-1/leer',
    method: 'PUT',
  },
  {
    name: 'eliminarNotificacion',
    invoke: () => eliminarNotificacion('n-1'),
    path: '/api/Notificaciones/n-1',
    method: 'DELETE',
  },
];

for (const c of ENDPOINTS) {
  test(`api: ${c.name} → ${c.method} ${c.path}`, async () => {
    responseQueue.push(makeResponse({ message: 'ok' }));
    await c.invoke();
    assert.equal(fetchCalls.length, 1);
    const call = fetchCalls[0];
    assert.equal(call.url, API_BASE_URL + c.path);
    assert.equal(call.init.method ?? 'GET', c.method);
    if (c.body !== undefined) {
      assert.deepEqual(JSON.parse(String(call.init.body)), c.body);
    }
  });
}

// ── Endpoints: cabeceras ───────────────────────────────────

test('api: envía Content-Type: application/json en todas las peticiones', async () => {
  responseQueue.push(makeResponse({}));
  await getPlanes();
  responseQueue.push(makeResponse({}));
  await createPaciente({ Nombre: 'X' });
  responseQueue.push(makeResponse({}));
  await eliminarPaciente('p-1');
  for (const call of fetchCalls) {
    const headers = call.init.headers as Record<string, string>;
    assert.equal(headers['Content-Type'], 'application/json');
  }
});

test('api: añade Authorization Bearer cuando hay sesión', async () => {
  saveSession('tok-123', 'rt', USUARIO);
  responseQueue.push(makeResponse({}));
  await getPlanes();
  const headers = fetchCalls[0].init.headers as Record<string, string>;
  assert.equal(headers['Authorization'], 'Bearer tok-123');
});

test('api: no añade Authorization sin sesión', async () => {
  responseQueue.push(makeResponse({}));
  await getPlanes();
  const headers = fetchCalls[0].init.headers as Record<string, string>;
  assert.equal(headers['Authorization'], undefined);
});

test('api: logout envía el token recibido como parámetro', async () => {
  responseQueue.push(makeResponse({ message: 'ok' }));
  await logout('token-custom');
  const headers = fetchCalls[0].init.headers as Record<string, string>;
  assert.equal(headers['Authorization'], 'Bearer token-custom');
});

test('api: preserva cabeceras personalizadas del caller', async () => {
  responseQueue.push(makeResponse({}));
  await marcarNotificacionLeida('n-1');
  const headers = fetchCalls[0].init.headers as Record<string, string>;
  assert.equal(headers['Content-Type'], 'application/json');
});

// ── request: éxito y errores ───────────────────────────────

test('api: devuelve el cuerpo de una respuesta exitosa', async () => {
  const planes = [{ id: 'gratis', nombre: 'Gratis' }];
  responseQueue.push(makeResponse(planes));
  const resultado = await getPlanes();
  assert.deepEqual(resultado, planes);
});

test('api: lanza ApiError con el mensaje del body en errores', async () => {
  responseQueue.push(makeResponse({ message: 'Credenciales inválidas' }, 400));
  await assert.rejects(() => loginWeb({ Correo: 'a@b.c', Password: 'x' }), (err: unknown) => {
    assert.ok(err instanceof ApiError);
    assert.equal(err.status, 400);
    assert.equal(err.message, 'Credenciales inválidas');
    return true;
  });
});

test('api: usa title como fallback de mensaje', async () => {
  responseQueue.push(makeResponse({ title: 'Error de validación' }, 422));
  await assert.rejects(() => createPaciente({ Nombre: 'X' }), (err: unknown) => {
    assert.ok(err instanceof ApiError);
    assert.equal(err.message, 'Error de validación');
    return true;
  });
});

test('api: mensaje genérico con estado cuando no hay body útil', async () => {
  responseQueue.push(makeResponse({}, 500));
  await assert.rejects(() => getPlanes(), (err: unknown) => {
    assert.ok(err instanceof ApiError);
    assert.equal(err.message, 'Error del servidor (500)');
    return true;
  });
});

test('api: mensaje genérico con body no-JSON', async () => {
  responseQueue.push(nonJsonResponse(502));
  await assert.rejects(() => getPlanes(), (err: unknown) => {
    assert.ok(err instanceof ApiError);
    assert.equal(err.status, 502);
    assert.equal(err.message, 'Error del servidor (502)');
    return true;
  });
});

test('api: error de red produce ApiError con estado 0', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () => {
    throw new TypeError('fetch failed');
  }) as unknown as typeof fetch;
  try {
    await assert.rejects(() => getPlanes(), (err: unknown) => {
      assert.ok(err instanceof ApiError);
      assert.equal(err.status, 0);
      assert.match(err.message, /No se pudo conectar/);
      return true;
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('api: 401 sin token en ruta privada lanza el error del body', async () => {
  responseQueue.push(makeResponse({ message: 'No autorizado' }, 401));
  await assert.rejects(() => getPlanes(), (err: unknown) => {
    assert.ok(err instanceof ApiError);
    assert.equal(err.status, 401);
    assert.equal(assignedUrls.length, 0, 'sin token no se fuerza cierre de sesión');
    return true;
  });
});

test('api: getMiPaciente devuelve null ante 404', async () => {
  responseQueue.push(makeResponse({}, 404));
  const resultado = await getMiPaciente();
  assert.equal(resultado, null);
});

test('api: getMiPaciente re-lanza errores distintos de 404', async () => {
  responseQueue.push(makeResponse({ message: 'Servidor caído' }, 500));
  await assert.rejects(() => getMiPaciente(), (err: unknown) => {
    assert.ok(err instanceof ApiError);
    assert.equal(err.status, 500);
    return true;
  });
});

// ── request: renovación de token (401) ─────────────────────

test('api: con token vencido renueva y reintenta la petición', async () => {
  saveSession('tok-vencido', 'refresh-valido', USUARIO);
  responseQueue.push(makeResponse({ message: 'expired' }, 401));
  responseQueue.push(makeResponse({ accessToken: 'tok-nuevo', refreshToken: 'rt-nuevo' }));
  responseQueue.push(makeResponse({ message: 'ok' }));

  const resultado = await getPlanes();

  assert.deepEqual(resultado, { message: 'ok' });
  assert.equal(fetchCalls.length, 3);

  const [original, renovacion, reintento] = fetchCalls;
  assert.equal(original.url, API_BASE_URL + '/api/Planes');
  assert.equal((original.init.headers as Record<string, string>)['Authorization'], 'Bearer tok-vencido');

  assert.equal(renovacion.url, API_BASE_URL + '/api/Auth/refresh');
  assert.equal(renovacion.init.method, 'POST');
  assert.deepEqual(JSON.parse(String(renovacion.init.body)), { RefreshToken: 'refresh-valido' });

  assert.equal((reintento.init.headers as Record<string, string>)['Authorization'], 'Bearer tok-nuevo');
});

test('api: si la renovación falla cierra la sesión y redirige al login', async () => {
  saveSession('tok', 'rt', USUARIO);
  responseQueue.push(makeResponse({ message: 'expired' }, 401));
  responseQueue.push(makeResponse({ message: 'refresh inválido' }, 401));

  await assert.rejects(() => getPlanes(), (err: unknown) => {
    assert.ok(err instanceof ApiError);
    assert.equal(err.status, 401);
    assert.equal(err.message, 'Tu sesión expiró. Inicia sesión de nuevo.');
    return true;
  });

  assert.deepEqual(assignedUrls, ['/login?expirada=1']);
  assert.equal(assignedUrls.length, 1);
  assert.equal(fetchCalls.length, 2, 'no se reintenta la petición sin token nuevo');
});

test('api: renovación sin accessToken en el body se trata como fallo', async () => {
  saveSession('tok', 'rt', USUARIO);
  responseQueue.push(makeResponse({ message: 'expired' }, 401));
  responseQueue.push(makeResponse({ foo: 'bar' }));

  await assert.rejects(() => getPlanes(), (err: unknown) => {
    assert.ok(err instanceof ApiError);
    assert.equal(err.status, 401);
    return true;
  });
  assert.deepEqual(assignedUrls, ['/login?expirada=1']);
});

test('api: sin refresh token almacenado no se intenta renovar', async () => {
  saveSession('tok', null, USUARIO);
  responseQueue.push(makeResponse({ message: 'expired' }, 401));

  await assert.rejects(() => getPlanes(), (err: unknown) => ApiError && err instanceof ApiError);
  assert.equal(fetchCalls.length, 1, 'no debe llamarse al endpoint de refresh');
  assert.deepEqual(assignedUrls, ['/login?expirada=1']);
});

test('api: en rutas públicas un 401 no fuerza el cierre de sesión', async () => {
  saveSession('tok', 'rt', USUARIO);
  locationShim.pathname = '/login';
  responseQueue.push(makeResponse({ message: 'Credenciales inválidas' }, 401));
  responseQueue.push(makeResponse({ message: 'refresh inválido' }, 401));

  await assert.rejects(() => loginWeb({ Correo: 'a@b.c', Password: 'x' }), (err: unknown) => {
    assert.ok(err instanceof ApiError);
    assert.equal(err.message, 'Credenciales inválidas');
    return true;
  });
  assert.equal(assignedUrls.length, 0, 'no debe redirigir al login');
});

test('api: ruta pública con renovación exitosa reintenta sin cerrar sesión', async () => {
  saveSession('tok', 'rt', USUARIO);
  responseQueue.push(makeResponse({ message: 'expired' }, 401));
  responseQueue.push(makeResponse({ accessToken: 'nuevo' }));
  responseQueue.push(makeResponse({ message: 'ok' }));

  const resultado = await loginWeb({ Correo: 'a@b.c', Password: 'x' });
  assert.deepEqual(resultado, { message: 'ok' });
  assert.equal(assignedUrls.length, 0);
  assert.equal(fetchCalls.length, 3);
});

test('api: no redirige al login si ya estamos en él', async () => {
  locationShim.pathname = '/login';
  saveSession('tok', 'rt', USUARIO);
  responseQueue.push(makeResponse({ message: 'expired' }, 401));
  responseQueue.push(makeResponse({ message: 'nope' }, 401));

  await assert.rejects(() => getPlanes());
  assert.equal(assignedUrls.length, 0, 'estando en /login no se asigna de nuevo la ruta');
});

test('api: comparte la renovación entre peticiones simultáneas', async () => {
  saveSession('tok', 'rt', USUARIO);

  let resolveRefresh!: (r: Response) => void;
  const refreshPending = new Promise<Response>((r) => {
    resolveRefresh = r;
  });
  let refreshCalls = 0;

  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (url: unknown, init?: RequestInit) => {
    const target = String(url);
    fetchCalls.push({ url: target, init: init ?? {} });
    if (target.includes('/api/Auth/refresh')) {
      refreshCalls++;
      return refreshPending;
    }
    const yaReintentadas = fetchCalls.filter((c) => !c.url.includes('/api/Auth/refresh')).length;
    if (yaReintentadas === 1) return makeResponse({ message: 'expired' }, 401);
    return makeResponse({ message: 'ok' });
  }) as unknown as typeof fetch;

  try {
    const p1 = getPlanes();
    const p2 = getPlanes();
    await new Promise((r) => setImmediate(r));
    assert.equal(refreshCalls, 1, 'solo debe ejecutarse una renovación');

    resolveRefresh(makeResponse({ accessToken: 'tok-nuevo' }));
    const [r1, r2] = await Promise.all([p1, p2]);
    assert.deepEqual(r1, { message: 'ok' });
    assert.deepEqual(r2, { message: 'ok' });
  } finally {
    globalThis.fetch = originalFetch;
  }
});
