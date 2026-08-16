#!/usr/bin/env node
// DevSecOps · Escaneo de secretos (Gitleaks)
// Detecta credenciales/secrets hardcodeados en el repositorio (incluido el
// historial de git).
//
// Uso:  node scripts/security-secrets.mjs
//
// Si Gitleaks no está instalado localmente y no se está en CI, el script avisa
// y termina con éxito. En CI (CI=true) la ausencia de la herramienta provoca
// error.

import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const CONFIG = resolve(ROOT, 'gitleaks.toml');

function findGitleaks() {
  const probe = spawnSync('gitleaks', ['version'], { stdio: 'pipe', encoding: 'utf8' });
  if (!probe.error && probe.status === 0) return true;
  return false;
}

function main() {
  if (!existsSync(CONFIG)) {
    console.error(`[SECRETS] No se encontró la configuración: ${CONFIG}`);
    process.exit(1);
  }

  if (!findGitleaks()) {
    const msg =
      '[SECRETS] Gitleaks no está instalado. Descárgalo desde:\n' +
      '          https://github.com/gitleaks/gitleaks/releases\n' +
      '          O ejecuta el flujo DevSecOps en GitHub Actions (recomendado).';
    if (process.env.CI || process.env.DEV_SECOPS_STRICT === '1') {
      console.error(`[SECRETS] ERROR (CI): ${msg}`);
      process.exit(2);
    }
    console.warn(`[SECRETS] AVISO: ${msg}`);
    process.exit(0);
  }

  console.log('[SECRETS] Ejecutando Gitleaks sobre el historial del repositorio…');
  const result = spawnSync(
    'gitleaks',
    ['git', '--no-banner', '--redact', '--config', CONFIG],
    { cwd: ROOT, stdio: 'inherit', encoding: 'utf8' },
  );

  if (result.status === 0) {
    console.log('[SECRETS] OK · no se encontraron secretos.');
  } else {
    console.error(`[SECRETS] Se encontraron secretos (código ${result.status}).`);
  }
  process.exit(result.status ?? 1);
}

main();
