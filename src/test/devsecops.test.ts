import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

// Las pruebas se ejecutan desde la raíz del proyecto.
const ROOT = resolve(import.meta.dirname, '..', '..');

const read = (rel: string): string =>
  readFileSync(resolve(ROOT, rel), 'utf8');

test('DevSecOps: existen reglas SAST de Semgrep personalizadas', () => {
  const rulesDir = resolve(ROOT, '.semgrep', 'rules');
  assert.ok(existsSync(rulesDir), '.semgrep/rules debe existir');
  const files = readdirSync(rulesDir).filter((f) => f.endsWith('.yml') || f.endsWith('.yaml'));
  assert.ok(files.length >= 3, 'Debe haber al menos 3 archivos de reglas');
});

test('DevSecOps: las reglas SAST cubren los riesgos clave de la app', () => {
  const rules = readdirSync(resolve(ROOT, '.semgrep', 'rules'))
    .filter((f) => f.endsWith('.yml'))
    .map((f) => read(`.semgrep/rules/${f}`))
    .join('\n');
  assert.ok(rules.includes('no-eval'), 'regla no-eval');
  assert.ok(rules.includes('no-unsafe-dom-mutation'), 'regla innerHTML');
  assert.ok(rules.includes('react-dangerously-set-inner-html'), 'regla dangerouslySetInnerHTML');
  assert.ok(rules.includes('hardcoded-api-key'), 'regla de secretos hardcodeados');
  assert.ok(rules.includes('private-key-block'), 'regla de llaves privadas');
});

test('DevSecOps: existe configuración de Gitleaks y no se auto-detecta', () => {
  const cfg = read('gitleaks.toml');
  assert.ok(cfg.includes('[extend]'), 'debe extender las reglas por defecto');
  assert.ok(cfg.includes('useDefault = true'), 'debe usar las reglas por defecto');
  assert.ok(cfg.includes('[allowlist]'), 'debe tener allowlist');
  assert.ok(cfg.includes('.semgrep/'), 'debe ignorar las reglas SAST (falsos positivos)');
});

test('DevSecOps: package.json expone los comandos de seguridad', () => {
  const pkg = JSON.parse(read('package.json')) as {
    scripts: Record<string, string>;
    devDependencies?: Record<string, string>;
  };
  assert.equal(pkg.scripts['security:audit'], 'npm audit --audit-level=high');
  assert.ok(pkg.scripts['security:sast'].startsWith('node scripts/security-sast.mjs'));
  assert.ok(pkg.scripts['security:secrets'].startsWith('node scripts/security-secrets.mjs'));
  assert.ok(pkg.scripts['security']);
  assert.ok(pkg.scripts['test']);
  assert.ok(pkg.scripts['typecheck']);
});

test('DevSecOps: GitHub Actions aplica las etapas de seguridad en CI', () => {
  const workflow = read('.github/workflows/devsecops.yml');
  assert.ok(workflow.includes('npm run lint'));
  assert.ok(workflow.includes('npm run typecheck'));
  assert.ok(workflow.includes('npm run test'));
  assert.ok(workflow.includes('npm run build'));
  assert.ok(workflow.includes('semgrep'), 'SAST con Semgrep');
  assert.ok(workflow.includes('gitleaks'), 'escaneo de secretos');
  assert.ok(workflow.includes('npm audit') || workflow.includes('security:audit'), 'auditoría de dependencias');
});

test('DevSecOps: el HTML no incluye scripts inline ni recursos remotos', () => {
  const html = read('index.html');
  assert.ok(!/<script(?![^>]*src=)[^>]*>/.test(html), 'no debe haber scripts inline');
  assert.ok(/<script type="module" src="\/src\/main\.tsx">/.test(html), 'el bundle se carga desde el mismo origen');
});

test('DevSecOps: vite.config.ts inyecta CSP en producción y cabeceras en preview', () => {
  const config = read('vite.config.ts');
  assert.ok(config.includes('bioguard-csp-meta'), 'plugin de meta CSP');
  assert.ok(config.includes('bioguard-security-headers'), 'plugin de cabeceras');
  assert.ok(config.includes("apply: 'build'"), 'CSP solo en build de producción');
  assert.ok(config.includes('configurePreviewServer'), 'cabeceras en el preview');
});

test('DevSecOps: la app protege rutas autenticadas', () => {
  const app = read('src/App.tsx');
  assert.ok(app.includes('ProtectedRoute'), 'se usa la barrera de autenticación');
  const protectedRoutes = ['/dashboard', '/health', '/pacientes', '/billing', '/planes', '/settings'];
  for (const route of protectedRoutes) {
    const index = app.indexOf(`path="${route}"`);
    const block = app.slice(index, index + 600);
    assert.ok(block.includes('ProtectedRoute'), `la ruta ${route} debe estar protegida`);
  }
});

test('DevSecOps: el token de reseteo no se expone en la URL', () => {
  const forgot = read('src/pages/ForgotPassword/ForgotPassword.tsx');
  const reset = read('src/pages/ResetPassword/ResetPassword.tsx');
  // El token viaja por estado del router, no como query param en la URL.
  assert.ok(!forgot.includes('reset-password?token='), 'ForgotPassword no navega con token en la URL');
  assert.ok(forgot.includes("navigate('/reset-password', { state:"), 'navega con token por estado');
  // ResetPassword elimina token/requestId de la URL tras leerlos.
  assert.ok(reset.includes('history.replaceState'), 'limpieza de la URL');
  assert.ok(reset.includes("searchParams.delete('token')"), 'borra el token de la URL');
  assert.ok(reset.includes("searchParams.delete('requestId')"), 'borra el requestId de la URL');
});

test('DevSecOps: despliegue DigitalOcean aplica cabeceras de seguridad', () => {
  assert.ok(existsSync(resolve(ROOT, 'Dockerfile')), 'existe Dockerfile');
  assert.ok(existsSync(resolve(ROOT, 'nginx.conf')), 'existe nginx.conf');
  assert.ok(existsSync(resolve(ROOT, 'digitalocean-app.yaml')), 'existe spec de App Platform');
  const nginx = read('nginx.conf');
  assert.ok(nginx.includes('X-Content-Type-Options'), 'nosniff');
  assert.ok(nginx.includes('X-Frame-Options'), 'anti-framing');
  assert.ok(nginx.includes('Strict-Transport-Security'), 'HSTS');
  assert.ok(nginx.includes('Cross-Origin-Opener-Policy'), 'COOP');
  assert.ok(nginx.includes('Permissions-Policy'), 'Permissions-Policy');
  assert.ok(nginx.includes('try_files'), 'fallback de rutas del SPA');
});

test('DevSecOps: el build nunca publica sourcemaps', () => {
  const config = read('vite.config.ts');
  assert.ok(/sourcemap:\s*false/.test(config), 'sourcemap deshabilitado en producción');
});

test('DevSecOps: el SPA no usa APIs peligrosas', () => {
  let html = '';
  const walk = (dir: string): void => {
    for (const entry of readdirSync(resolve(ROOT, dir), { withFileTypes: true })) {
      if (entry.name === 'node_modules' || entry.name === 'test' || entry.name.startsWith('.')) continue;
      if (entry.isDirectory()) walk(`${dir}/${entry.name}`);
      else if (/\.(tsx?|jsx?)$/.test(entry.name)) html += read(`${dir}/${entry.name}`) + '\n';
    }
  };
  walk('src');
  assert.ok(!/dangerouslySetInnerHTML/.test(html), 'no dangerouslySetInnerHTML');
  assert.ok(!/\beval\s*\(/.test(html), 'no eval');
  assert.ok(!/new\s+Function\s*\(/.test(html), 'no new Function');
  assert.ok(!/\.innerHTML\s*=/.test(html), 'no asignación de innerHTML');
  assert.ok(!/target="_blank"/.test(html), 'no enlaces target=_blank sin rel');
});

test('DevSecOps: contenedor no-root escucha en el puerto 8080', () => {
  const dockerfile = read('Dockerfile');
  assert.ok(dockerfile.includes('node:24-alpine'), 'etapa de build con Node');
  assert.ok(dockerfile.includes('nginxinc/nginx-unprivileged'), 'nginx no-root');
  assert.ok(dockerfile.includes('EXPOSE 8080'), 'puerto de escucha');
  assert.ok(dockerfile.includes('HEALTHCHECK'), 'healthcheck del contenedor');
  assert.ok(dockerfile.includes('http://127.0.0.1:8080/'), 'healthcheck contra 8080');
  assert.ok(read('nginx.conf').includes('listen 8080;'), 'nginx escucha en 8080');
  assert.ok(read('digitalocean-app.yaml').includes('http_port: 8080'), 'DO mapea el puerto 8080');
});

test('DevSecOps: hooks de pre-commit (Lefthook) ejecutan Gitleaks y Oxlint', () => {
  const lefthook = read('lefthook.yml');
  assert.ok(lefthook.includes('pre-commit'), 'hook de pre-commit');
  assert.ok(lefthook.includes('scripts/pre-commit-secrets.mjs'), 'gitleaks sobre staged');
  assert.ok(lefthook.includes('npx oxlint {staged_files}'), 'oxlint sobre staged');
  const preCommit = read('scripts/pre-commit-secrets.mjs');
  assert.ok(preCommit.includes('gitleaks'), 'el script invoca gitleaks');
  assert.ok(preCommit.includes('--redact'), 'enmascara secretos en la salida');
});

test('DevSecOps: normalización LF y configuración npm estricta', () => {
  const attributes = read('.gitattributes');
  assert.ok(attributes.includes('* text=auto eol=lf'), 'LF en texto');
  assert.ok(attributes.includes('*.sh text eol=lf'), 'LF en scripts shell');
  assert.ok(attributes.includes('*.png binary'), 'binarios no normalizados');
  const npmrc = read('.npmrc');
  assert.ok(npmrc.includes('audit=true'), 'auditoría de seguridad');
  assert.ok(npmrc.includes('engine-strict=true'), 'engines estricto');
  assert.ok(npmrc.includes('save=false'), 'no sobrescribir package.json');
});

test('DevSecOps: .dockerignore excluye fuentes, secretos y herramientas', () => {
  const dockerignore = read('.dockerignore');
  for (const pattern of ['node_modules', 'dist', '.git', '.env', 'Dockerfile', 'src/test', '.github', 'gitleaks.toml', '.npmrc']) {
    const lines = dockerignore.split('\n').map((l) => l.trim());
    assert.ok(lines.includes(pattern), `.dockerignore debe excluir ${pattern}`);
  }
});

test('DevSecOps: scripts y dependencias de calidad presentes en package.json', () => {
  const pkg = JSON.parse(read('package.json')) as {
    scripts: Record<string, string>;
    devDependencies: Record<string, string>;
    engines: { node: string };
  };
  assert.ok(pkg.scripts.prepare.includes('lefthook install'), 'hook instalado al instalar');
  assert.equal(pkg.scripts['security:licenses'], 'node scripts/license-check.mjs');
  assert.ok(pkg.scripts.security.includes('security:licenses'), 'cadena de seguridad con licencias');
  assert.ok(pkg.devDependencies.lefthook, 'lefthook como dependencia de desarrollo');
  assert.ok(pkg.devDependencies.oxlint, 'oxlint como dependencia de desarrollo');
  assert.match(pkg.engines.node, /\d/);
});

test('DevSecOps: política de licencias rechaza copyleft', () => {
  const script = read('scripts/license-check.mjs');
  assert.ok(script.includes('GPL') && script.includes('AGPL'), 'detecta licencias copyleft');
  assert.ok(script.includes('SSPL'), 'detecta SSPL');
  assert.ok(script.includes('MIT'), 'permite MIT');
});

test('DevSecOps: CI incluye Trivy, Checkov, SBOM y licencias', () => {
  const workflow = read('.github/workflows/devsecops.yml');
  assert.ok(workflow.includes('aquasecurity/trivy-action'), 'escaneo de contenedor');
  assert.ok(workflow.includes('bridgecrewio/checkov-action'), 'escaneo IaC');
  assert.ok(workflow.includes('npm sbom'), 'generación de SBOM');
  assert.ok(workflow.includes('security:licenses'), 'revisión de licencias en CI');
  assert.ok(workflow.includes('p/owasp-top-ten'), 'registros oficiales de Semgrep');
  assert.ok(workflow.includes('gitleaks/gitleaks-action@v3'), 'gitleaks nativo en CI');
});

test('DevSecOps: plantillas de contribución y CODEOWNERS', () => {
  assert.ok(existsSync(resolve(ROOT, '.github', 'CODEOWNERS')), 'CODEOWNERS');
  const pr = read('.github/pull_request_template.md');
  assert.ok(pr.includes('Checklist de seguridad'), 'checklist de seguridad en PR');
  const bug = read('.github/ISSUE_TEMPLATE/bug_report.md');
  const feature = read('.github/ISSUE_TEMPLATE/feature_request.md');
  assert.ok(bug.trim().length > 0 && feature.trim().length > 0, 'plantillas de issues');
  const dependabot = read('.github/dependabot.yml');
  assert.ok(dependabot.includes('npm'), 'dependabot npm');
  assert.ok(existsSync(resolve(ROOT, '.github', 'workflows', 'codeql.yml')), 'codeql workflow');
});

test('DevSecOps: SECURITY.md documenta los controles implementados', () => {
  const security = read('SECURITY.md').toLowerCase();
  assert.ok(security.includes('trivy'), 'documenta escaneo de contenedor');
  assert.ok(security.includes('checkov'), 'documenta escaneo IaC');
  assert.ok(security.includes('sbom'), 'documenta SBOM');
  assert.ok(security.includes('no root'), 'documenta contenedor no-root');
  assert.ok(security.includes('lefthook'), 'documenta hooks locales');
  assert.ok(security.includes('licenses') || security.includes('licencias'), 'documenta licencias');
});

// ── DAST: OWASP ZAP ──────────────────────────────────────────────────────

test('DevSecOps: CI incluye DAST con OWASP ZAP', () => {
  const workflow = read('.github/workflows/devsecops.yml');
  assert.ok(workflow.includes('zaproxy/action-baseline'), 'acción de ZAP Baseline');
  assert.ok(workflow.includes('zap-rules'), 'archivo de reglas ZAP');
  assert.ok(workflow.includes('bioguard-front:dast'), 'build de imagen para DAST');
});

test('DevSecOps: existe configuración de reglas ZAP', () => {
  assert.ok(existsSync(resolve(ROOT, '.github', 'zap-rules.tsv')), 'zap-rules.tsv existe');
  const rules = read('.github/zap-rules.tsv');
  assert.ok(rules.includes('10020'), 'regla de CSRF tokens (desabilitada para SPA)');
  assert.ok(rules.includes('Server Leaks Version'), 'regla de X-Powered-By');
});

// ── Dockerfile: hardening ────────────────────────────────────────────────

test('DevSecOps: Dockerfile usa --ignore-scripts en npm ci', () => {
  const dockerfile = read('Dockerfile');
  assert.ok(dockerfile.includes('npm ci --ignore-scripts'), 'npm ci con --ignore-scripts para bloquear postinstall scripts');
});

// ── Contenedor: healthcheck y no-root ────────────────────────────────────

test('DevSecOps: contenedor declara healthcheck con curl o wget', () => {
  const dockerfile = read('Dockerfile');
  assert.ok(dockerfile.includes('HEALTHCHECK'), 'declara HEALTHCHECK');
  assert.ok(dockerfile.includes('--interval='), 'tiene interval configurado');
  assert.ok(dockerfile.includes('--timeout='), 'tiene timeout configurado');
});
