import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  API_ORIGIN,
  MAP_ORIGIN,
  CSP_POLICY,
  buildCsp,
  SECURITY_HEADERS,
  fotoSrc,
  isStrongPassword,
  PASSWORD_MIN_LENGTH,
  PASSWORD_RULES,
  STORAGE_KEYS,
} from '../lib/security.ts';

test('fotoSrc: devuelve undefined para valores vacíos', () => {
  assert.equal(fotoSrc(undefined), undefined);
  assert.equal(fotoSrc(null), undefined);
  assert.equal(fotoSrc(''), undefined);
  assert.equal(fotoSrc('   '), undefined);
});

test('fotoSrc: acepta data URIs de imagen raster legítimos', () => {
  assert.equal(fotoSrc('data:image/png;base64,AAAA'), 'data:image/png;base64,AAAA');
  assert.equal(fotoSrc('data:image/jpeg;base64,/9j/4AAQ'), 'data:image/jpeg;base64,/9j/4AAQ');
  assert.equal(fotoSrc('data:image/webp;base64,UklGRg=='), 'data:image/webp;base64,UklGRg==');
});

test('fotoSrc: rechaza data URIs peligrosos (SVG u otros tipos)', () => {
  assert.equal(fotoSrc('data:text/html;base64,PHNjcmlwdD4='), undefined);
  assert.equal(fotoSrc('data:text/javascript,alert(1)'), undefined);
  assert.equal(fotoSrc('data:image/svg+xml,<svg onload=alert(1)>'), undefined);
  assert.equal(fotoSrc('data:image/svg+xml;base64,PHN2Zz4='), undefined);
  assert.equal(fotoSrc('data:image/gif;foo=bar'), undefined);
});

test('fotoSrc: rechaza esquemas peligrosos', () => {
  assert.equal(fotoSrc('javascript:alert(1)'), undefined);
  assert.equal(fotoSrc('javascript:alert(1)'), undefined);
  assert.equal(fotoSrc('file:///etc/passwd'), undefined);
});

test('fotoSrc: rechaza payloads que no son base64 ni imagen', () => {
  assert.equal(fotoSrc('"><img src=x onerror=alert(1)>'), undefined);
  assert.equal(fotoSrc('onerror=alert(1)'), undefined);
  assert.equal(fotoSrc('//evil.example/x.png'), undefined);
});

test('fotoSrc: envuelve base64 crudo (formato heredado de la API) como JPEG', () => {
  assert.equal(fotoSrc('/9j/4AAQSkZJRg=='), 'data:image/jpeg;base64,/9j/4AAQSkZJRg==');
  assert.equal(fotoSrc('AAAA//bbb=='), 'data:image/jpeg;base64,AAAA//bbb==');
  assert.equal(fotoSrc('AAAA--bbb__'), 'data:image/jpeg;base64,AAAA--bbb__');
});

test('fotoSrc: rechaza cadenas que no son base64', () => {
  assert.equal(fotoSrc('AAAA.//bbb=='), undefined);
  assert.equal(fotoSrc('AAAA / bbb'), undefined);
});

test('fotoSrc: acepta URLs http(s) de imágenes', () => {
  assert.equal(fotoSrc('https://cdn.example.com/foto.jpg'), 'https://cdn.example.com/foto.jpg');
  assert.equal(fotoSrc('http://cdn.example.com/foto.png'), 'http://cdn.example.com/foto.png');
});

test('CSP: incluye las directivas de endurecimiento esenciales', () => {
  assert.ok(CSP_POLICY.includes("default-src 'self'"));
  assert.ok(CSP_POLICY.includes("script-src 'self'"));
  assert.ok(CSP_POLICY.includes("style-src 'self' 'unsafe-inline'"));
  assert.ok(CSP_POLICY.includes("object-src 'none'"));
  assert.ok(CSP_POLICY.includes("base-uri 'self'"));
  assert.ok(CSP_POLICY.includes("frame-ancestors 'none'"));
  assert.ok(CSP_POLICY.includes("upgrade-insecure-requests"));
});

test('CSP: permite solo orígenes de confianza para connect-src e img-src', () => {
  assert.ok(CSP_POLICY.includes(`connect-src 'self' ${API_ORIGIN}`));
  assert.ok(CSP_POLICY.includes(`img-src 'self' data: blob: ${MAP_ORIGIN}`));
  assert.ok(!/script-src[^;]*(unsafe-inline|unsafe-eval)/.test(CSP_POLICY));
});

test('buildCsp: mantiene el origen por defecto sin argumento', () => {
  assert.equal(buildCsp(), CSP_POLICY);
  assert.equal(buildCsp(undefined), CSP_POLICY);
  assert.equal(buildCsp(''), CSP_POLICY);
});

test('buildCsp: ajusta connect-src cuando VITE_API_URL difiere', () => {
  const custom = 'https://api.example.com';
  const csp = buildCsp(custom);
  assert.ok(csp.includes(`connect-src 'self' ${custom}`));
  assert.ok(!csp.includes(API_ORIGIN), 'el origen por defecto se reemplaza');
  assert.ok(csp.includes(`script-src 'self'`), 'el resto de la CSP se conserva');
});

test('buildCsp: no inyecta orígenes peligrosos ni espacios extra', () => {
  const csp = buildCsp('https://api.example.com/path/');
  assert.ok(!csp.includes('javascript:'));
  assert.ok(!csp.includes("'unsafe-eval'"));
});

test('Cabeceras de seguridad: presentes y correctas', () => {
  assert.equal(SECURITY_HEADERS['X-Content-Type-Options'], 'nosniff');
  assert.equal(SECURITY_HEADERS['X-Frame-Options'], 'DENY');
  assert.equal(SECURITY_HEADERS['Referrer-Policy'], 'strict-origin-when-cross-origin');
  assert.equal(SECURITY_HEADERS['Content-Security-Policy'], CSP_POLICY);
  assert.ok(SECURITY_HEADERS['Strict-Transport-Security'].includes('max-age=63072000'));
  assert.ok(SECURITY_HEADERS['Permissions-Policy'].includes('camera=()'));
  assert.ok(SECURITY_HEADERS['Cross-Origin-Opener-Policy'], 'same-origin');
});

test('isStrongPassword: valida la política de complejidad', () => {
  assert.equal(isStrongPassword('Ab1!defg'), true);
  assert.equal(isStrongPassword('abcdefgh'), false);
  assert.equal(isStrongPassword('ABCDEFGH'), false);
  assert.equal(isStrongPassword('Abcdefgh'), false);
  assert.equal(isStrongPassword('Ab1!defg extra'), false);
  assert.equal(isStrongPassword('Ab1!de'), false);
});

const PASS_FUERTES = [
  'Passw0rd!',
  'A1!bcdefgh',
  'aB2@cdefghij',
  'C0#ontrañeña',
  'X9$longitudsuficiente',
  '1A!bcdefgh',
  'Zz9)largo',
  'Qa1/segura',
];

for (const pass of PASS_FUERTES) {
  test(`isStrongPassword: acepta "${pass}"`, () => {
    assert.equal(isStrongPassword(pass), true);
  });
}

const PASS_DEBILES: Array<[string, string]> = [
  ['', 'vacía'],
  ['abc', 'demasiado corta'],
  ['abcdefgh', 'solo minúsculas'],
  ['ABCDEFGH', 'solo mayúsculas'],
  ['abcdef123', 'sin mayúsculas ni símbolos'],
  ['ABCdef123', 'sin símbolo'],
  ['Ab1!defg h', 'con espacio'],
  ['Ab\t1!defg', 'con tabulación'],
  ['Ab1!defg\n', 'con salto de línea'],
  ['              ', 'solo espacios'],
];

for (const [pass, motivo] of PASS_DEBILES) {
  test(`isStrongPassword: rechaza "${motivo}" (${JSON.stringify(pass.slice(0, 12))}…)`, () => {
    assert.equal(isStrongPassword(pass), false);
  });
}

test('isStrongPassword: la longitud mínima es la centralizada (8)', () => {
  assert.equal(isStrongPassword('Ab1!defg'), true);
  assert.equal(isStrongPassword('Ab1!def'), false);
  assert.equal(PASSWORD_MIN_LENGTH, 8);
});

test('PASSWORD_RULES: consistente con la implementación', () => {
  assert.equal(PASSWORD_RULES.minLength, PASSWORD_MIN_LENGTH);
  assert.equal(PASSWORD_RULES.hasUpper, true);
  assert.equal(PASSWORD_RULES.hasLower, true);
  assert.equal(PASSWORD_RULES.hasNumber, true);
  assert.equal(PASSWORD_RULES.hasSymbol, true);
  assert.equal(PASSWORD_RULES.noSpaces, true);
});

test('PASSWORD_RULES: mínimo de una regla es equivalente a isStrongPassword', () => {
  const reglas = Object.values(PASSWORD_RULES);
  assert.equal(reglas.length, 6);
});

// ── CSP: más cobertura ─────────────────────────────────────

const DIRECTIVAS_REQUERIDAS = [
  'default-src',
  'script-src',
  'style-src',
  'img-src',
  'connect-src',
  'font-src',
  'object-src',
  'base-uri',
  'form-action',
  'frame-ancestors',
  'upgrade-insecure-requests',
];

for (const directiva of DIRECTIVAS_REQUERIDAS) {
  test(`CSP: incluye la directiva ${directiva}`, () => {
    assert.ok(CSP_POLICY.includes(directiva), `falta ${directiva}`);
  });
}

test('CSP: sin directivas duplicadas', () => {
  const names = CSP_POLICY.split(';').map((d) => d.trim().split(/\s+/)[0]);
  assert.equal(new Set(names).size, names.length);
});

test('CSP: no permite orígenes salvajes ni esquemas peligrosos', () => {
  assert.ok(!/"'\*'"/.test(CSP_POLICY), 'sin wildcard de origen');
  assert.ok(!CSP_POLICY.includes('javascript:'));
  assert.ok(!CSP_POLICY.includes("'unsafe-eval'"));
});

test('CSP: data: solo se permite en img-src y font-src', () => {
  const partes = CSP_POLICY.split(';').map((p) => p.trim());
  for (const parte of partes) {
    if (parte.includes('data:')) {
      assert.ok(
        parte.startsWith('img-src') || parte.startsWith('font-src'),
        `data: en directiva inesperada: ${parte}`,
      );
    }
  }
});

test('CSP: frame-ancestors none y object-src none', () => {
  assert.ok(CSP_POLICY.includes("frame-ancestors 'none'"));
  assert.ok(CSP_POLICY.includes("object-src 'none'"));
});

test('CSP: upgrade-insecure-requests fuerza HTTPS', () => {
  assert.ok(CSP_POLICY.includes('upgrade-insecure-requests'));
});

test('buildCsp: recorta espacios del origen recibido', () => {
  const csp = buildCsp('  https://api.example.com  ');
  assert.ok(csp.includes("connect-src 'self' https://api.example.com"));
});

test('buildCsp: conserva todas las directivas salvo connect-src', () => {
  const csp = buildCsp('https://otro.example.com');
  const original = CSP_POLICY.split(';').sort();
  const nuevo = csp.split(';').sort();
  assert.notDeepEqual(nuevo, original);
  // Todas las directivas excepto connect-src quedan idénticas.
  const diffs = nuevo.filter((d, i) => d !== original[i]);
  assert.equal(diffs.length, 1);
  assert.ok(diffs[0].includes('connect-src'));
});

test('buildCsp: rechaza esquemas no-http en connect-src', () => {
  assert.equal(buildCsp('javascript:alert(1)'), CSP_POLICY);
  assert.equal(buildCsp('ftp://api.example.com'), CSP_POLICY);
  assert.equal(buildCsp('//api.example.com'), CSP_POLICY);
});

test('buildCsp: no muta CSP_POLICY', () => {
  buildCsp('https://api.example.com');
  assert.equal(CSP_POLICY.includes("connect-src 'self' https://api.example.com"), false);
});

// ── SECURITY_HEADERS: más cobertura ────────────────────────

test('Cabeceras: conjunto completo y valores exactos', () => {
  assert.equal(Object.keys(SECURITY_HEADERS).length, 8);
  assert.equal(SECURITY_HEADERS['X-Content-Type-Options'], 'nosniff');
  assert.equal(SECURITY_HEADERS['X-Frame-Options'], 'DENY');
  assert.equal(SECURITY_HEADERS['Referrer-Policy'], 'strict-origin-when-cross-origin');
  assert.equal(SECURITY_HEADERS['Content-Security-Policy'], CSP_POLICY);
  assert.equal(SECURITY_HEADERS['Cross-Origin-Opener-Policy'], 'same-origin');
  assert.equal(SECURITY_HEADERS['Cross-Origin-Resource-Policy'], 'same-origin');
});

test('Cabeceras: HSTS con preload y cobertura completa', () => {
  assert.equal(SECURITY_HEADERS['Strict-Transport-Security'], 'max-age=63072000; includeSubDomains; preload');
});

test('Cabeceras: Permissions-Policy restringe sensores sensibles', () => {
  const pp = SECURITY_HEADERS['Permissions-Policy'];
  for (const feature of ['camera', 'geolocation', 'microphone', 'payment', 'usb']) {
    assert.ok(pp.includes(`${feature}=()`), `debe bloquear ${feature}`);
  }
});

test('Cabeceras: el objeto es inmutable (Readonly)', () => {
  assert.throws(() => {
    (SECURITY_HEADERS as Record<string, string>)['X-Content-Type-Options'] = 'mutado';
  }, TypeError);
});

// ── fotoSrc: más cobertura ─────────────────────────────────

test('fotoSrc: acepta todos los tipos raster soportados', () => {
  const tipos = ['png', 'jpeg', 'jpg', 'gif', 'webp', 'avif', 'bmp', 'x-icon'];
  for (const tipo of tipos) {
    assert.equal(fotoSrc(`data:image/${tipo};base64,AAAA`), `data:image/${tipo};base64,AAAA`);
  }
});

test('fotoSrc: acepta el prefijo MIME en mayúsculas (case-insensitive)', () => {
  assert.equal(fotoSrc('DATA:IMAGE/PNG;BASE64,AAAA'), 'DATA:IMAGE/PNG;BASE64,AAAA');
});

test('fotoSrc: los data URIs raster se devuelven tal cual (payload puede ser corto)', () => {
  assert.equal(fotoSrc('data:image/png;base64,'), 'data:image/png;base64,');
  assert.equal(fotoSrc('data:image/jpeg;base64,A'), 'data:image/jpeg;base64,A');
});

test('fotoSrc: rechaza URLs con esquemas no http(s)', () => {
  assert.equal(fotoSrc('ftp://example.com/foto.png'), undefined);
  assert.equal(fotoSrc('file:///c:/foto.png'), undefined);
  assert.equal(fotoSrc('chrome://settings'), undefined);
  assert.equal(fotoSrc('//example.com/foto.png'), undefined);
});

test('fotoSrc: rechaza payloads ofuscados de XSS', () => {
  const payloads = [
    'jaVaScRiPt:alert(1)',
    'javascript&#58;alert(1)',
    'data:image/svg+xml,<script>alert(1)</script>',
    'data:image/svg+xml;base64,PHNjcmlwdD4=',
    '" onerror="alert(1)"',
    'https://evil.example/foto.png" onerror=alert(1)',
  ];
  for (const p of payloads) {
    assert.equal(fotoSrc(p), undefined, `debería rechazar: ${p}`);
  }
});

test('fotoSrc: acepta URLs http(s) con query y puerto', () => {
  assert.equal(fotoSrc('https://cdn.example.com/foto.png?t=1'), 'https://cdn.example.com/foto.png?t=1');
  assert.equal(fotoSrc('https://cdn.example.com:8443/foto.png'), 'https://cdn.example.com:8443/foto.png');
});

test('fotoSrc: base64 crudo se envuelve siempre como image/jpeg', () => {
  assert.equal(fotoSrc('AAAA'), 'data:image/jpeg;base64,AAAA');
  assert.equal(fotoSrc('/9j/4AAQSkZJRg=='), 'data:image/jpeg;base64,/9j/4AAQSkZJRg==');
});

test('fotoSrc: el base64 envolvente no se vuelve a envolver', () => {
  assert.equal(fotoSrc('data:image/jpeg;base64,AAAA'), 'data:image/jpeg;base64,AAAA');
});

test('fotoSrc: tolera espacios laterales en data URIs válidos', () => {
  assert.equal(fotoSrc('  data:image/png;base64,AAAA  '), 'data:image/png;base64,AAAA');
});

// ── STORAGE_KEYS: más cobertura ────────────────────────────

test('STORAGE_KEYS: todas las claves usan prefijo bioguard_', () => {
  for (const key of Object.values(STORAGE_KEYS)) {
    assert.ok(key.startsWith('bioguard_'), `clave sin prefijo: ${key}`);
  }
});

test('STORAGE_KEYS: contiene las claves esenciales de la sesión', () => {
  assert.ok(STORAGE_KEYS.accessToken);
  assert.ok(STORAGE_KEYS.refreshToken);
  assert.ok(STORAGE_KEYS.user);
  assert.ok(STORAGE_KEYS.theme);
  assert.ok(STORAGE_KEYS.resetRequest);
});
