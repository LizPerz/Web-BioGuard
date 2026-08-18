import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  generateLectura,
  generateHeartbeat,
  calculateRiesgoIA,
  setSimMode,
  startModeCycle,
  stopModeCycle,
} from '../simulation/biometricSimulator.ts';
import type { LecturaSensores } from '../simulation/types.ts';

const RIESGOS_VALIDOS: LecturaSensores['nivelRiesgo'][] = ['Relajado', 'Estres Moderado', 'Estres Alto'];

function ronda(mode: Parameters<typeof setSimMode>[0], n = 40): LecturaSensores[] {
  setSimMode(mode);
  const lecturas: LecturaSensores[] = [];
  for (let i = 0; i < n; i++) lecturas.push(generateLectura());
  return lecturas;
}

// ── generateLectura: rangos por modo ───────────────────────

test('generateLectura [normal]: valores dentro de la banda esperada', () => {
  const lecturas = ronda('normal');
  for (const l of lecturas) {
    assert.ok(l.bpm >= 66 && l.bpm <= 78, `bpm fuera de banda: ${l.bpm}`);
    assert.ok(l.temperatura >= 36.2 && l.temperatura <= 36.8, `temperatura fuera de banda: ${l.temperatura}`);
    assert.ok(l.estresPct >= 10 && l.estresPct <= 26, `estrés fuera de banda: ${l.estresPct}`);
  }
});

test('generateLectura [normal]: nunca marca Estres Alto', () => {
  const lecturas = ronda('normal');
  for (const l of lecturas) {
    assert.notEqual(l.nivelRiesgo, 'Estres Alto');
  }
});

test('generateLectura [exercise]: valores elevados', () => {
  const lecturas = ronda('exercise');
  for (const l of lecturas) {
    assert.ok(l.bpm >= 114 && l.bpm <= 126, `bpm fuera de banda: ${l.bpm}`);
    assert.ok(l.temperatura >= 36.9 && l.temperatura <= 37.5, `temperatura fuera de banda: ${l.temperatura}`);
    assert.ok(l.estresPct >= 47 && l.estresPct <= 63, `estrés fuera de banda: ${l.estresPct}`);
  }
});

test('generateLectura [exercise]: nunca marca Relajado', () => {
  const lecturas = ronda('exercise');
  for (const l of lecturas) {
    assert.notEqual(l.nivelRiesgo, 'Relajado');
  }
});

test('generateLectura [stress]: estrés alto de forma determinista', () => {
  const lecturas = ronda('stress');
  for (const l of lecturas) {
    assert.ok(l.estresPct >= 62, `estrés debería ser >= 62: ${l.estresPct}`);
    assert.equal(l.nivelRiesgo, 'Estres Alto');
    assert.ok(l.bpm >= 89 && l.bpm <= 101, `bpm fuera de banda: ${l.bpm}`);
  }
});

test('generateLectura [random]: respeta los límites globales', () => {
  const lecturas = ronda('random', 120);
  for (const l of lecturas) {
    assert.ok(l.bpm >= 40 && l.bpm <= 200, `bpm fuera de límites: ${l.bpm}`);
    assert.ok(l.temperatura >= 35.5 && l.temperatura <= 37.8, `temperatura fuera de límites: ${l.temperatura}`);
    assert.ok(l.estresPct >= 1 && l.estresPct <= 100, `estrés fuera de límites: ${l.estresPct}`);
    assert.ok(RIESGOS_VALIDOS.includes(l.nivelRiesgo), `nivel de riesgo inválido: ${l.nivelRiesgo}`);
  }
});

// ── generateLectura: redondeo y timestamps ─────────────────

test('generateLectura: redondea todos los valores a 1 decimal', () => {
  const lecturas = ronda('random', 60);
  for (const l of lecturas) {
    assert.ok(Number.isInteger(Math.round(l.bpm * 10)), `bpm sin redondeo: ${l.bpm}`);
    assert.ok(Number.isInteger(Math.round(l.temperatura * 10)), `temperatura sin redondeo: ${l.temperatura}`);
    assert.ok(Number.isInteger(Math.round(l.estresPct * 10)), `estrés sin redondeo: ${l.estresPct}`);
  }
});

test('generateLectura: timestamp es una fecha válida reciente', () => {
  const l = generateLectura();
  assert.ok(Number.isInteger(l.timestamp));
  assert.ok(l.timestamp <= Date.now(), 'el timestamp no puede ser futuro');
  assert.ok(l.timestamp > Date.now() - 60_000, 'el timestamp debería ser reciente');
});

test('generateLectura: los timestamps no decrecen entre lecturas', () => {
  setSimMode('normal');
  let prev = 0;
  for (let i = 0; i < 20; i++) {
    const l = generateLectura();
    assert.ok(l.timestamp >= prev, 'los timestamps deberían ser no-decrecientes');
    prev = l.timestamp;
  }
});

test('generateLectura: estructura completa de la lectura', () => {
  setSimMode('normal');
  const l = generateLectura();
  assert.equal(typeof l.bpm, 'number');
  assert.equal(typeof l.temperatura, 'number');
  assert.equal(typeof l.estresPct, 'number');
  assert.equal(typeof l.timestamp, 'number');
  assert.ok(RIESGOS_VALIDOS.includes(l.nivelRiesgo));
});

test('setSimMode: acepta todos los modos sin errores', () => {
  for (const mode of ['normal', 'exercise', 'stress', 'random'] as const) {
    assert.doesNotThrow(() => setSimMode(mode));
    assert.doesNotThrow(() => generateLectura());
  }
});

// ── calculateRiesgoIA ──────────────────────────────────────

const LECTURA_BASE: LecturaSensores = {
  bpm: 72,
  temperatura: 36.5,
  estresPct: 25,
  nivelRiesgo: 'Relajado',
  timestamp: 0,
};

test('calculateRiesgoIA: valor determinista para la lectura base', () => {
  assert.equal(calculateRiesgoIA(LECTURA_BASE), 12.6);
});

test('calculateRiesgoIA: devuelve siempre un porcentaje en [0,100]', () => {
  const extremos: LecturaSensores[] = [
    { ...LECTURA_BASE, bpm: 40, temperatura: 35.5, estresPct: 1 },
    { ...LECTURA_BASE, bpm: 200, temperatura: 37.8, estresPct: 100 },
    { ...LECTURA_BASE, bpm: 200, temperatura: 35.5, estresPct: 1 },
    { ...LECTURA_BASE, bpm: 40, temperatura: 37.8, estresPct: 100 },
    { ...LECTURA_BASE, bpm: 0, temperatura: 40, estresPct: 0 },
  ];
  for (const l of extremos) {
    const r = calculateRiesgoIA(l);
    assert.ok(r >= 0 && r <= 100, `riesgo fuera de rango: ${r}`);
  }
});

test('calculateRiesgoIA: redondea a 1 decimal', () => {
  for (const l of [LECTURA_BASE, { ...LECTURA_BASE, bpm: 151, estresPct: 77 }]) {
    assert.ok(Number.isInteger(Math.round(calculateRiesgoIA(l) * 10)), `riesgo sin redondeo: ${calculateRiesgoIA(l)}`);
  }
});

test('calculateRiesgoIA: es monotónico creciente con el pulso', () => {
  let prev = -1;
  for (const bpm of [40, 60, 72, 90, 120, 160, 200]) {
    const r = calculateRiesgoIA({ ...LECTURA_BASE, bpm });
    assert.ok(r > prev, `riesgo debería crecer con bpm (${bpm} -> ${r})`);
    prev = r;
  }
});

test('calculateRiesgoIA: es monotónico creciente con el estrés', () => {
  let prev = -1;
  for (const estres of [1, 20, 40, 60, 80, 100]) {
    const r = calculateRiesgoIA({ ...LECTURA_BASE, estresPct: estres });
    assert.ok(r > prev, `riesgo debería crecer con estrés (${estres} -> ${r})`);
    prev = r;
  }
});

test('calculateRiesgoIA: crece con la desviación de temperatura (alta y baja)', () => {
  const rBase = calculateRiesgoIA(LECTURA_BASE);
  const rAlta = calculateRiesgoIA({ ...LECTURA_BASE, temperatura: 37.8 });
  const rBaja = calculateRiesgoIA({ ...LECTURA_BASE, temperatura: 35.5 });
  assert.ok(rAlta > rBase, 'temperatura alta debería aumentar el riesgo');
  assert.ok(rBaja > rBase, 'temperatura baja debería aumentar el riesgo');
});

test('calculateRiesgoIA: lecturas de riesgo bajo puntúan menos que las altas', () => {
  const baja: LecturaSensores = { ...LECTURA_BASE, bpm: 40, temperatura: 36.5, estresPct: 1 };
  const alta: LecturaSensores = { ...LECTURA_BASE, bpm: 190, temperatura: 37.7, estresPct: 95 };
  assert.ok(calculateRiesgoIA(baja) < calculateRiesgoIA(alta));
});

test('calculateRiesgoIA: entradas idénticas producen salidas idénticas', () => {
  assert.equal(calculateRiesgoIA(LECTURA_BASE), calculateRiesgoIA({ ...LECTURA_BASE }));
});

// ── generateHeartbeat ──────────────────────────────────────

test('generateHeartbeat: estructura y rango de batería', () => {
  const hb = generateHeartbeat();
  assert.ok(hb.bateria >= 5 && hb.bateria <= 100, `batería fuera de rango: ${hb.bateria}`);
  assert.deepEqual(hb.sensoresActivos, ['HEART_RATE_BPM', 'TEMPERATURE']);
  assert.ok(Number.isInteger(hb.timestamp) && hb.timestamp <= Date.now());
});

test('generateHeartbeat: la batería nunca aumenta entre latidos', () => {
  stopModeCycle();
  let prev = 101;
  for (let i = 0; i < 40; i++) {
    generateLectura();
    const hb = generateHeartbeat();
    assert.ok(hb.bateria <= prev, `batería aumentó: ${hb.bateria} > ${prev}`);
    prev = hb.bateria;
  }
});

test('generateHeartbeat: la batería drena con el tiempo simulado', () => {
  stopModeCycle();
  const inicial = generateHeartbeat().bateria;
  for (let i = 0; i < 50; i++) generateLectura();
  const posterior = generateHeartbeat().bateria;
  assert.ok(posterior <= inicial, 'la batería debería drenar');
});

// ── ciclo de modos ─────────────────────────────────────────

test('startModeCycle: no crea intervalos duplicados', () => {
  stopModeCycle();
  const originalSet = globalThis.setInterval;
  const originalClear = globalThis.clearInterval;
  let creaciones = 0;
  globalThis.setInterval = ((fn: () => void, ms?: number) => {
    creaciones++;
    return originalSet(fn, ms ?? 0);
  }) as typeof globalThis.setInterval;
  try {
    startModeCycle();
    startModeCycle();
    assert.equal(creaciones, 1, 'solo debe crearse un intervalo');
  } finally {
    globalThis.setInterval = originalSet;
    stopModeCycle();
    globalThis.clearInterval = originalClear;
  }
});

test('stopModeCycle: es seguro llamarlo sin haber iniciado el ciclo', () => {
  assert.doesNotThrow(() => stopModeCycle());
});

test('stopModeCycle: vuelve al modo normal', () => {
  setSimMode('exercise');
  stopModeCycle();
  const l = generateLectura();
  assert.ok(l.bpm >= 66 && l.bpm <= 78, 'tras stopModeCycle el modo vuelve a normal');
});
