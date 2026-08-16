#!/usr/bin/env node
// Pre-commit · Escaneo rápido de secretos (solo archivos staged).
// Ejecuta `gitleaks protect --staged`. Si gitleaks no está instalado
// localmente, avisa y termina con éxito (CI cubre el escaneo completo del
// historial con `npm run security:secrets`).
//
// Uso:  node scripts/pre-commit-secrets.mjs

import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const CONFIG = resolve(ROOT, 'gitleaks.toml');

function main() {
  if (!existsSync(CONFIG)) {
    console.error('[pre-commit] No se encontró la configuración: gitleaks.toml');
    process.exit(1);
  }

  const probe = spawnSync('gitleaks', ['version'], { stdio: 'pipe', encoding: 'utf8' });
  if (probe.error || probe.status !== 0) {
    console.warn(
      '[pre-commit] gitleaks no está instalado; se omite el escaneo de secretos (CI lo cubre).\n' +
        '          Descarga: https://github.com/gitleaks/gitleaks/releases',
    );
    process.exit(0);
  }

  console.log('[pre-commit] Escaneando secretos en archivos staged…');
  const result = spawnSync(
    'gitleaks',
    ['protect', '--staged', '--redact', '--config', CONFIG],
    { cwd: ROOT, stdio: 'inherit', encoding: 'utf8' },
  );

  if (result.status === 0) {
    console.log('[pre-commit] Secretos: OK.');
  } else {
    console.error(`[pre-commit] Secretos: se encontraron hallazgos (código ${result.status}).`);
  }
  process.exit(result.status ?? 1);
}

main();
