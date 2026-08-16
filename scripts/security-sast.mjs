#!/usr/bin/env node
// DevSecOps · SAST (Semgrep)
// Ejecuta el escaneo estático de seguridad con Semgrep usando las reglas
// personalizadas de .semgrep/rules.
//
// Uso:  node scripts/security-sast.mjs
//
// Si Semgrep no está instalado localmente y no se está en CI, el script avisa
// y termina con éxito para no bloquear a desarrolladores. En CI (variable
// CI=true) la ausencia de la herramienta provoca error.

import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const RULES_DIR = resolve(ROOT, '.semgrep');
const RULES_CONFIG = resolve(RULES_DIR, 'rules');

function findSemgrep() {
  const candidates = [
    'semgrep',
    { cmd: 'py', args: ['-m', 'semgrep'] },
    { cmd: 'python', args: ['-m', 'semgrep'] },
    { cmd: 'python3', args: ['-m', 'semgrep'] },
  ];

  for (const c of candidates) {
    const cmd = typeof c === 'string' ? { cmd: c, args: [] } : c;
    const probe = spawnSync(cmd.cmd, [...cmd.args, '--version'], {
      stdio: 'pipe',
      encoding: 'utf8',
    });
    if (!probe.error && probe.status === 0) return cmd;
  }
  return null;
}

function main() {
  if (!existsSync(RULES_CONFIG)) {
    console.error(`[SAST] No se encontró la configuración de reglas: ${RULES_CONFIG}`);
    process.exit(1);
  }

  const semgrep = findSemgrep();
  if (!semgrep) {
    const msg =
      '[SAST] Semgrep no está instalado. Instálalo con:  pip install semgrep\n' +
      '       (https://semgrep.dev/docs/getting-started/)\n' +
      '       O ejecuta el flujo DevSecOps en GitHub Actions (recomendado).';
    if (process.env.CI || process.env.DEV_SECOPS_STRICT === '1') {
      console.error(`[SAST] ERROR (CI): ${msg}`);
      process.exit(2);
    }
    console.warn(`[SAST] AVISO: ${msg}`);
    process.exit(0);
  }

  console.log('[SAST] Ejecutando Semgrep con reglas personalizadas…');
  const result = spawnSync(
    semgrep.cmd,
    [
      ...semgrep.args,
      'scan',
      '--config',
      RULES_CONFIG,
      '--metrics=off',
      '--error',
      '--max-memory=3000',
      ROOT,
    ],
    { stdio: 'inherit', encoding: 'utf8' },
  );

  if (result.status === 0) {
    console.log('[SAST] OK · no se encontraron vulnerabilidades.');
  } else {
    console.error(`[SAST] Se encontraron hallazgos (código ${result.status}).`);
  }
  process.exit(result.status ?? 1);
}

main();
