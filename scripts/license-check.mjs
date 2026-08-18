#!/usr/bin/env node
// DevSecOps · Verificación de licencias de dependencias.
// Escanea node_modules/**/package.json y falla si encuentra:
//   - copyleft fuerte (GPL / AGPL / SSPL), o
//   - dependencias sin licencia declarada o con licencia desconocida.
//
// Uso:  node scripts/license-check.mjs

import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { resolve, join } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const NODE_MODULES = join(ROOT, 'node_modules');

// Licencias consideradas aceptables para este proyecto (permisivas o copyleft
// débil). Cualquier otra licencia (o ausencia) se reporta como hallazgo.
const PERMITIDAS = [
  'MIT',
  'ISC',
  '0BSD',
  'UNLICENSE',
  'CC0-1.0',
  'APACHE-2.0',
  'BSD-2-CLAUSE',
  'BSD-3-CLAUSE',
  'MPL-2.0',
  'HIPPOCRATIC-2.1',
];

// Copyleft fuerte: incompatible con una app propietaria.
const CODELET_FUERTE = /\b(?:GPL|AGPL|SSPL)\b/;

function leerPackageJson(path) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return null;
  }
}

function normalizarLicencias(pkg) {
  const raw = pkg.license ?? pkg.licenses;
  if (Array.isArray(raw)) {
    return raw.map((l) => (typeof l === 'string' ? l : (l?.type ?? ''))).filter(Boolean).join(' OR ');
  }
  if (raw && typeof raw === 'object') return raw.type ?? '';
  return raw ?? '';
}

function esPermitida(lic) {
  const l = lic.toUpperCase();
  return PERMITIDAS.some((ok) => l.includes(ok));
}

function clasificar(lic) {
  const l = lic.toUpperCase();
  if (CODELET_FUERTE.test(l)) return 'prohibida';
  if (l === '' || /SEE LICENSE/.test(l) || l.includes('UNLICENSED') || l.includes('UNKNOWN')) {
    return 'prohibida';
  }
  if (esPermitida(l)) return 'ok';
  return 'revisar';
}

const pendientes = [NODE_MODULES];
const vistos = new Set();
const hallazgos = [];
const reportadas = new Set();
let total = 0;

while (pendientes.length) {
  const dir = pendientes.pop();
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    continue;
  }
  for (const entry of entries) {
    if (entry === '.bin' || entry === '.cache' || entry.startsWith('.')) continue;
    const abs = join(dir, entry);
    let st;
    try {
      st = statSync(abs);
    } catch {
      continue;
    }
    if (st.isDirectory()) {
      const pj = join(abs, 'package.json');
      if (existsSync(pj)) {
        const pkg = leerPackageJson(pj);
        if (pkg?.name) {
          const id = `${pkg.name}@${pkg.version ?? ''}`;
          if (vistos.has(id)) continue;
          vistos.add(id);
          total++;
          const lic = normalizarLicencias(pkg);
          const clase = clasificar(lic);
          if (clase === 'prohibida') {
            hallazgos.push({ id, clase, lic: lic || '(sin licencia)' });
          } else if (clase === 'revisar' && !reportadas.has(lic)) {
            reportadas.add(lic);
            hallazgos.push({ id, clase, lic: lic || '(sin licencia)' });
          }
        }
      }
      const sub = join(abs, 'node_modules');
      if (entry.startsWith('@') || existsSync(sub)) {
        if (existsSync(sub)) pendientes.push(sub);
        else pendientes.push(abs);
      }
    }
  }
}

console.log(`[LICENCIAS] Revisadas ${total} dependencias.`);

if (hallazgos.length === 0) {
  console.log('[LICENCIAS] OK · todas las licencias son compatibles.');
  process.exit(0);
}

for (const h of hallazgos) {
  console.error(`[LICENCIAS] ${h.clase.toUpperCase()}: ${h.id} -> ${h.lic}`);
}
console.error('[LICENCIAS] Revisa las licencias anteriores antes de continuar.');
process.exit(1);
