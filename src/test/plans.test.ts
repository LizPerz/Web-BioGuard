import { test } from 'node:test';
import assert from 'node:assert/strict';
import { featuresDe, precioTexto, beneficiosDe, beneficiosCompletos, type FeatureItem } from '../lib/plans.ts';
import type { PlanResponse } from '../lib/api.ts';

const PLAN_GRATIS: PlanResponse = {
  id: 'gratis',
  nombre: 'Gratis',
  precio: 0,
  precioMoneda: 'MXN',
  limitePacientes: 1,
  limiteCuidadores: 2,
  diasHistorial: 7,
  gpsContinuo: false,
  aiConsole: false,
  descripcion: 'Plan gratuito',
};

const PLAN_BASIC: PlanResponse = {
  id: 'basic',
  nombre: 'Básico',
  precio: 199,
  precioMoneda: 'MXN',
  limitePacientes: 3,
  limiteCuidadores: 5,
  diasHistorial: 30,
  gpsContinuo: true,
  aiConsole: false,
  descripcion: 'Plan básico',
};

const PLAN_PREMIUM: PlanResponse = {
  id: 'premium',
  nombre: 'Premium',
  precio: 499,
  precioMoneda: 'USD',
  limitePacientes: 10,
  limiteCuidadores: 15,
  diasHistorial: 365,
  gpsContinuo: true,
  aiConsole: true,
  descripcion: 'Plan premium',
};

const PLANES = [PLAN_GRATIS, PLAN_BASIC, PLAN_PREMIUM] as const;

const ETIQUETAS_ESPERADAS = [
  'Pacientes incluidos',
  'Cuidadores permitidos',
  'Reporte diario',
  'Historial de datos',
  'GPS Continuo',
  'Consola IA',
] as const;

// ── featuresDe ─────────────────────────────────────────────

for (const plan of PLANES) {
  test(`featuresDe [${plan.nombre}]: devuelve 6 características`, () => {
    assert.equal(featuresDe(plan).length, 6);
  });

  test(`featuresDe [${plan.nombre}]: etiquetas en orden estable`, () => {
    const etiquetas = featuresDe(plan).map((f) => f.label);
    assert.deepEqual(etiquetas, [...ETIQUETAS_ESPERADAS]);
  });
}

const VALORES_ESPERADOS: Record<string, string[]> = {
  Gratis: ['1', '2', 'Incluido', '7 días', 'No incluido', 'No incluida'],
  Básico: ['3', '5', 'Incluido', '30 días', 'Incluido', 'No incluida'],
  Premium: ['10', '15', 'Incluido', '365 días', 'Incluido', 'Incluida'],
};

for (const plan of PLANES) {
  test(`featuresDe [${plan.nombre}]: valores derivados correctos`, () => {
    const valores = featuresDe(plan).map((f) => f.value);
    assert.deepEqual(valores, VALORES_ESPERADOS[plan.nombre]);
  });
}

test('featuresDe: los valores reflejan booleans como Incluido/No incluido', () => {
  const gratis = featuresDe(PLAN_GRATIS);
  assert.equal(gratis[4].value, 'No incluido'); // gpsContinuo
  assert.equal(gratis[5].value, 'No incluida'); // aiConsole
  const premium = featuresDe(PLAN_PREMIUM);
  assert.equal(premium[4].value, 'Incluido');
  assert.equal(premium[5].value, 'Incluida');
});

test('featuresDe: reporte diario siempre incluido', () => {
  for (const plan of PLANES) {
    assert.equal(featuresDe(plan)[2].label, 'Reporte diario');
    assert.equal(featuresDe(plan)[2].value, 'Incluido');
  }
});

test('featuresDe: historial refleja los días del plan', () => {
  assert.equal(featuresDe(PLAN_GRATIS)[3].value, '7 días');
  assert.equal(featuresDe(PLAN_PREMIUM)[3].value, '365 días');
});

// ── precioTexto ────────────────────────────────────────────

const PRECIOS: Array<[PlanResponse, string]> = [
  [PLAN_GRATIS, 'Gratis'],
  [PLAN_BASIC, '$199 MXN'],
  [PLAN_PREMIUM, '$499 USD'],
];

for (const [plan, esperado] of PRECIOS) {
  test(`precioTexto [${plan.nombre}]: "${esperado}"`, () => {
    assert.equal(precioTexto(plan), esperado);
  });
}

test('precioTexto: precio <= 0 se muestra como Gratis', () => {
  const negativo: PlanResponse = { ...PLAN_GRATIS, precio: -1 };
  assert.equal(precioTexto(negativo), 'Gratis');
  assert.equal(precioTexto({ ...PLAN_GRATIS, precio: 0 }), 'Gratis');
});

test('precioTexto: usa la moneda del plan', () => {
  const enEuros: PlanResponse = { ...PLAN_BASIC, precioMoneda: 'EUR' };
  assert.equal(precioTexto(enEuros), '$199 EUR');
});

// ── beneficiosDe ───────────────────────────────────────────

const BENEFICIOS_ESPERADOS: Record<string, string[]> = {
  Gratis: [
    '1 paciente',
    '2 cuidadores',
    'Reporte diario',
    'Historial 7 días',
    'Sin GPS continuo',
    'Sin Consola IA',
  ],
  Básico: [
    '3 pacientes',
    '5 cuidadores',
    'Reporte diario',
    'Historial 30 días',
    'GPS continuo',
    'Sin Consola IA',
  ],
  Premium: [
    '10 pacientes',
    '15 cuidadores',
    'Reporte diario',
    'Historial 365 días',
    'GPS continuo',
    'Consola IA',
  ],
};

for (const plan of PLANES) {
  test(`beneficiosDe [${plan.nombre}]: lista completa`, () => {
    assert.deepEqual(beneficiosDe(plan), BENEFICIOS_ESPERADOS[plan.nombre]);
  });
}

test('beneficiosDe: pluraliza paciente correctamente', () => {
  const uno: PlanResponse = { ...PLAN_BASIC, limitePacientes: 1 };
  assert.equal(beneficiosDe(uno)[0], '1 paciente');
  const muchos: PlanResponse = { ...PLAN_BASIC, limitePacientes: 2 };
  assert.equal(beneficiosDe(muchos)[0], '2 pacientes');
});

test('beneficiosDe: pluraliza cuidador correctamente', () => {
  const uno: PlanResponse = { ...PLAN_BASIC, limiteCuidadores: 1 };
  assert.equal(beneficiosDe(uno)[1], '1 cuidador');
  const muchos: PlanResponse = { ...PLAN_BASIC, limiteCuidadores: 2 };
  assert.equal(beneficiosDe(muchos)[1], '2 cuidadores');
});

test('beneficiosDe: refleja GPS e IA como características o ausencias', () => {
  assert.ok(beneficiosDe(PLAN_GRATIS).includes('Sin GPS continuo'));
  assert.ok(beneficiosDe(PLAN_PREMIUM).includes('GPS continuo'));
  assert.ok(beneficiosDe(PLAN_GRATIS).includes('Sin Consola IA'));
  assert.ok(beneficiosDe(PLAN_PREMIUM).includes('Consola IA'));
});

test('beneficiosDe: siempre incluye el reporte diario', () => {
  for (const plan of PLANES) {
    assert.ok(beneficiosDe(plan).includes('Reporte diario'));
  }
});

// ── beneficiosCompletos ────────────────────────────────────

for (const plan of PLANES) {
  test(`beneficiosCompletos [${plan.nombre}]: formato "Etiqueta: Valor"`, () => {
    const completos = beneficiosCompletos(plan);
    assert.equal(completos.length, 6);
    const features: FeatureItem[] = featuresDe(plan);
    completos.forEach((item, i) => {
      assert.equal(item, `${features[i].label}: ${features[i].value}`);
    });
  });
}

test('beneficiosCompletos: es consistente con featuresDe', () => {
  assert.deepEqual(
    beneficiosCompletos(PLAN_GRATIS),
    featuresDe(PLAN_GRATIS).map((f) => `${f.label}: ${f.value}`),
  );
});

test('beneficiosCompletos: no muta ni comparte referencias entre llamadas', () => {
  const a = beneficiosCompletos(PLAN_PREMIUM);
  const b = beneficiosCompletos(PLAN_PREMIUM);
  assert.notEqual(a, b);
  assert.deepEqual(a, b);
});
