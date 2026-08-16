import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..', '..');

const read = (rel: string): string => readFileSync(resolve(ROOT, rel), 'utf8');
const has = (rel: string): boolean => existsSync(resolve(ROOT, rel));

// ── package.json ───────────────────────────────────────────

const PKG = JSON.parse(read('package.json')) as {
  name: string;
  version: string;
  private: boolean;
  engines: Record<string, string>;
  scripts: Record<string, string>;
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
};

test('config: package.json metadatos básicos', () => {
  assert.equal(PKG.name, 'bio-guard-front');
  assert.equal(PKG.private, true);
  assert.equal(typeof PKG.version, 'string');
});

test('config: engines restringe Node a versiones con type-stripping', () => {
  assert.match(PKG.engines.node, /^\^20\.19\.0 \|\| >=22\.12\.0$/);
});

test('config: todos los scripts de calidad existen', () => {
  for (const s of ['dev', 'build', 'preview', 'lint', 'typecheck', 'test', 'test:watch', 'prepare']) {
    assert.ok(PKG.scripts[s], `falta script ${s}`);
  }
});

test('config: scripts de seguridad expuestos', () => {
  for (const s of ['security:audit', 'security:sast', 'security:secrets', 'security:licenses', 'security', 'security:all']) {
    assert.ok(PKG.scripts[s], `falta script ${s}`);
  }
});

test('config: el agregado security encadena audit+SAST+secretos+licencias', () => {
  const chain = PKG.scripts.security;
  assert.ok(chain.includes('security:audit'));
  assert.ok(chain.includes('security:sast'));
  assert.ok(chain.includes('security:secrets'));
  assert.ok(chain.includes('security:licenses'));
});

test('config: security:all cubre lint, typecheck, tests y security', () => {
  const chain = PKG.scripts['security:all'];
  assert.ok(chain.includes('lint'));
  assert.ok(chain.includes('typecheck'));
  assert.ok(chain.includes('test'));
  assert.ok(chain.includes('security'));
});

test('config: prepare instala los ganchos de lefthook', () => {
  assert.match(PKG.scripts.prepare, /lefthook install/);
});

test('config: dependencias de runtime presentes', () => {
  for (const d of ['react', 'react-dom', 'react-router-dom', 'leaflet', 'react-leaflet', 'lucide-react', 'qrcode.react']) {
    assert.ok(PKG.dependencies[d], `falta dependencia ${d}`);
  }
});

test('config: devDependencies de calidad y seguridad presentes', () => {
  for (const d of ['vite', 'typescript', 'oxlint', 'lefthook', '@vitejs/plugin-react', '@types/react']) {
    assert.ok(PKG.devDependencies[d], `falta devDependency ${d}`);
  }
});

// ── TypeScript ─────────────────────────────────────────────

test('config: tsconfig raíz enlaza las apps', () => {
  const ts = JSON.parse(read('tsconfig.json')) as { references: Array<{ path: string }> };
  assert.ok(ts.references.some((r) => r.path.includes('app')));
  assert.ok(ts.references.some((r) => r.path.includes('node')));
});

test('config: tsconfig.app.json con endurecimiento de TS', () => {
  const app = read('tsconfig.app.json');
  assert.ok(app.includes('"moduleResolution": "bundler"'));
  assert.ok(app.includes('"allowImportingTsExtensions": true'));
  assert.ok(app.includes('"verbatimModuleSyntax": true'));
  assert.ok(app.includes('"noEmit": true'));
  assert.ok(app.includes('"jsx": "react-jsx"'));
  assert.ok(app.includes('"noUnusedLocals": true'));
  assert.ok(app.includes('"noUnusedParameters": true'));
  assert.ok(app.includes('"erasableSyntaxOnly": true'));
  assert.ok(app.includes('"include": ["src"]'));
});

test('config: tsconfig.node.json existe para vite.config', () => {
  assert.ok(has('tsconfig.node.json'));
});

// ── .gitignore / .dockerignore / .npmrc / .gitattributes ───

const GITIGNORE = read('.gitignore');
const DOCKERIGNORE = read('.dockerignore');
const NPMRC = read('.npmrc');
const GITATTRIBUTES = read('.gitattributes');

test('config: .gitignore excluye artefactos y secretos', () => {
  for (const p of ['node_modules', 'dist', '.env', '*.log', '*.err', '.vscode/*']) {
    assert.ok(GITIGNORE.split('\n').some((l) => l.trim() === p), `falta patrón ${p}`);
  }
});

test('config: .gitignore mantiene .env.example versionado', () => {
  assert.ok(GITIGNORE.includes('!.env.example'));
});

test('config: .gitignore nunca fuerza la clave de tema ni claves de sesión', () => {
  assert.ok(!GITIGNORE.includes('bioguard_'));
});

test('config: .dockerignore excluye dev/CI del contexto de build', () => {
  for (const p of ['node_modules', '.git', 'dist', '.env', 'scripts', 'src/test', '.github', 'Dockerfile']) {
    assert.ok(DOCKERIGNORE.split('\n').some((l) => l.trim() === p), `falta patrón ${p} en .dockerignore`);
  }
});

test('config: .npmrc activa auditoría y engine-strict', () => {
  assert.match(NPMRC, /audit\s*=\s*true/);
  assert.match(NPMRC, /engine-strict\s*=\s*true/);
  assert.match(NPMRC, /fund\s*=\s*false/);
});

test('config: .gitattributes normaliza a LF', () => {
  assert.match(GITATTRIBUTES, /\*\s+text=auto\s+eol=lf/);
  assert.match(GITATTRIBUTES, /\.sh\s+text\s+eol=lf/);
  assert.match(GITATTRIBUTES, /\.png\s+binary/);
});

// ── index.html ─────────────────────────────────────────────

const INDEX_HTML = read('index.html');

test('config: index.html en español con favicon propio', () => {
  assert.match(INDEX_HTML, /<html lang="es">/);
  assert.match(INDEX_HTML, /charset="UTF-8"/);
  assert.match(INDEX_HTML, /\/favicon\.svg/);
});

test('config: index.html carga el bundle desde el mismo origen', () => {
  assert.match(INDEX_HTML, /<script type="module" src="\/src\/main\.tsx"><\/script>/);
});

test('config: index.html tiene meta de descripción y viewport', () => {
  assert.match(INDEX_HTML, /name="viewport"/);
  assert.match(INDEX_HTML, /name="description"/);
  assert.match(INDEX_HTML, /BioGuard/);
});

// ── Dockerfile ─────────────────────────────────────────────

const DOCKERFILE = read('Dockerfile');

test('config: Dockerfile es multi-stage (build Node + servidor)', () => {
  assert.match(DOCKERFILE, /FROM node:24-alpine AS build/);
  assert.match(DOCKERFILE, /npm ci/);
  assert.match(DOCKERFILE, /npm run build/);
});

test('config: Dockerfile sirve con nginx no-root', () => {
  assert.match(DOCKERFILE, /nginxinc\/nginx-unprivileged:1\.27-alpine/);
  assert.ok(!/USER\s+root/.test(DOCKERFILE), 'no debe declararse USER root');
});

test('config: Dockerfile expone 8080 y define HEALTHCHECK', () => {
  assert.match(DOCKERFILE, /EXPOSE 8080/);
  assert.match(DOCKERFILE, /HEALTHCHECK/);
  assert.match(DOCKERFILE, /127\.0\.0\.1:8080/);
});

test('config: Dockerfile copia nginx.conf y el build de dist', () => {
  assert.match(DOCKERFILE, /COPY nginx\.conf \/etc\/nginx\/conf\.d\/default\.conf/);
  assert.match(DOCKERFILE, /COPY --from=build \/app\/dist \/usr\/share\/nginx\/html/);
});

// ── nginx.conf ─────────────────────────────────────────────

const NGINX = read('nginx.conf');

test('config: nginx escucha en 8080 (puerto no privilegiado)', () => {
  assert.match(NGINX, /listen 8080;/);
  assert.ok(!/listen\s+80;/.test(NGINX), 'no debe escuchar en 80 (requiere root)');
});

test('config: nginx habilita gzip para assets', () => {
  assert.match(NGINX, /gzip on;/);
  assert.match(NGINX, /gzip_types/);
  assert.match(NGINX, /gzip_vary on;/);
});

test('config: nginx cachea assets con hash e imágenes', () => {
  assert.match(NGINX, /location \/assets\//);
  assert.match(NGINX, /expires 1y;/);
  assert.match(NGINX, /location ~\* \\\.\(png\|svg\|ico\|webp\|avif\)\$/);
  assert.match(NGINX, /expires 7d;/);
});

test('config: nginx hace fallback de rutas del SPA', () => {
  assert.match(NGINX, /try_files \$uri \$uri\/ \/index\.html;/);
});

test('config: nginx no duplica add_header dentro de sub-locations', () => {
  const assetsBlock = NGINX.slice(NGINX.indexOf('location /assets/'), NGINX.indexOf('location /assets/') + 200);
  assert.ok(!assetsBlock.includes('add_header'), 'add_header solo en el bloque server (herencia)');
});

test('config: las cabeceras de seguridad viven en el bloque server', () => {
  const serverBlock = NGINX.slice(NGINX.indexOf('server {'), NGINX.indexOf('location /assets/'));
  for (const h of ['X-Content-Type-Options', 'X-Frame-Options', 'Strict-Transport-Security', 'Permissions-Policy']) {
    assert.ok(serverBlock.includes(h), `falta cabecera ${h} en el bloque server`);
  }
});

// ── digitalocean-app.yaml ──────────────────────────────────

const DO_SPEC = read('digitalocean-app.yaml');

test('config: App Spec define el web service bioguard-front', () => {
  assert.match(DO_SPEC, /name: bioguard-front/);
  assert.match(DO_SPEC, /dockerfile_path: Dockerfile/);
  assert.match(DO_SPEC, /- name: web/);
});

test('config: App Spec escucha en el puerto 8080 (nginx no-root)', () => {
  assert.match(DO_SPEC, /http_port: 8080/);
});

test('config: App Spec tiene health check HTTP', () => {
  assert.match(DO_SPEC, /health_check:/);
  assert.match(DO_SPEC, /http_path: \//);
});

test('config: App Spec restringe CORS al prefijo de BioGuard', () => {
  assert.match(DO_SPEC, /allow_origins:/);
  assert.match(DO_SPEC, /prefix: https:\/\/bioguard-/);
});

test('config: App Spec documenta VITE_API_URL como build arg', () => {
  assert.match(DO_SPEC, /VITE_API_URL/);
  assert.match(DO_SPEC, /BUILD_TIME/);
});

// ── GitHub: workflows y plantillas ─────────────────────────

test('config: CI incluye Trivy, Checkov y SBOM', () => {
  const ci = read('.github/workflows/devsecops.yml');
  assert.ok(ci.includes('trivy-action'), 'Trivy');
  assert.ok(ci.includes('checkov-action'), 'Checkov');
  assert.ok(ci.includes('npm sbom'), 'SBOM');
  assert.ok(ci.includes('security:licenses'), 'verificación de licencias');
});

test('config: CI usa registros oficiales de Semgrep', () => {
  const ci = read('.github/workflows/devsecops.yml');
  assert.ok(ci.includes('p/javascript'));
  assert.ok(ci.includes('p/react'));
  assert.ok(ci.includes('p/owasp-top-ten'));
});

test('config: CI publica SARIF en Code Scanning', () => {
  const ci = read('.github/workflows/devsecops.yml');
  const n = ci.split('codeql-action/upload-sarif').length - 1;
  assert.ok(n >= 4, `se esperan al menos 4 uploads SARIF, hay ${n}`);
});

test('config: CodeQL usa queries ampliadas', () => {
  const codeql = read('.github/workflows/codeql.yml');
  assert.ok(codeql.includes('codeql-action/init'));
  assert.ok(codeql.includes('security-extended'));
  assert.ok(codeql.includes('security-and-quality'));
});

test('config: Dependabot cubre npm y GitHub Actions', () => {
  const dependabot = read('.github/dependabot.yml');
  assert.ok(dependabot.includes('package-ecosystem: npm'));
  assert.ok(dependabot.includes('package-ecosystem: github-actions'));
  assert.ok(dependabot.includes('interval: weekly'));
});

test('config: existen las plantillas de PR e issues', () => {
  assert.ok(has('.github/pull_request_template.md'));
  assert.ok(has('.github/ISSUE_TEMPLATE/bug_report.md'));
  assert.ok(has('.github/ISSUE_TEMPLATE/feature_request.md'));
});

test('config: la plantilla de PR incluye checklist de seguridad', () => {
  const pr = read('.github/pull_request_template.md');
  assert.ok(pr.includes('gitleaks'));
  assert.ok(pr.includes('dangerouslySetInnerHTML'));
  assert.ok(pr.includes('npm run lint'));
  assert.ok(pr.includes('npm run build'));
});

test('config: existe CODEOWNERS con propietarios de seguridad', () => {
  const codeowners = read('.github/CODEOWNERS');
  assert.ok(codeowners.includes('SECURITY.md'));
  assert.ok(codeowners.includes('devsecops.yml'));
  assert.ok(codeowners.includes('Dockerfile'));
});

// ── Semgrep / Gitleaks / oxlint ────────────────────────────

test('config: reglas SAST en cuatro archivos específicos', () => {
  const rules = readdirSync(resolve(ROOT, '.semgrep', 'rules')).sort();
  assert.deepEqual(
    rules,
    ['javascript-security.yml', 'node-security.yml', 'react-security.yml', 'secrets.yml'].sort(),
  );
});

test('config: .semgrepignore excluye artefactos y entorno', () => {
  const ignore = read('.semgrepignore');
  for (const p of ['node_modules/', 'dist/', 'coverage/', '.env', '.github/']) {
    assert.ok(ignore.includes(p), `falta ${p} en .semgrepignore`);
  }
});

test('config: oxlint configura plugins de React y TypeScript', () => {
  const oxlint = JSON.parse(read('.oxlintrc.json')) as { plugins: string[] };
  assert.ok(oxlint.plugins.includes('react'));
  assert.ok(oxlint.plugins.includes('typescript'));
});

test('config: gitleaks define reglas propias de BioGuard', () => {
  const cfg = read('gitleaks.toml');
  assert.ok(cfg.includes('bioguard-refresh-token-literal'));
  assert.ok(cfg.includes('digitalocean-token'));
  assert.ok(cfg.includes('stripe-live-key'));
});

// ── scripts DevSecOps ──────────────────────────────────────

test('config: existen los scripts de seguridad', () => {
  for (const s of ['security-sast.mjs', 'security-secrets.mjs', 'license-check.mjs', 'pre-commit-secrets.mjs']) {
    assert.ok(has(`scripts/${s}`), `falta scripts/${s}`);
  }
});

test('config: license-check.mjs define la política de licencias', () => {
  const script = read('scripts/license-check.mjs');
  assert.ok(script.includes('GPL'));
  assert.ok(script.includes('AGPL'));
  assert.ok(script.includes('PERMITIDAS'));
});

test('config: pre-commit-secrets.mjs usa gitleaks protect --staged', () => {
  const script = read('scripts/pre-commit-secrets.mjs');
  assert.ok(script.includes('gitleaks'));
  assert.ok(script.includes('protect'));
  assert.ok(script.includes('--staged'));
});

// ── Lefthook ───────────────────────────────────────────────

test('config: lefthook define ganchos de pre-commit', () => {
  const lf = read('lefthook.yml');
  assert.ok(lf.includes('pre-commit:'));
  assert.ok(lf.includes('secrets'));
  assert.ok(lf.includes('lint'));
  assert.ok(lf.includes('pre-commit-secrets.mjs'));
});

// ── Docs ───────────────────────────────────────────────────

test('config: existen SECURITY.md y README.md', () => {
  assert.ok(has('SECURITY.md'));
  assert.ok(has('README.md'));
});

test('config: SECURITY.md documenta la política CSP', () => {
  const sec = read('SECURITY.md');
  assert.ok(sec.toLowerCase().includes('csp'));
  assert.ok(sec.includes('connect-src'));
});

test('config: README.md documenta el despliegue DigitalOcean', () => {
  const readme = read('README.md');
  assert.ok(readme.toLowerCase().includes('digitalocean'));
});

// ── package-lock ───────────────────────────────────────────

test('config: package-lock.json es un JSON válido', () => {
  const lock = JSON.parse(read('package-lock.json')) as { lockfileVersion: number };
  assert.ok(lock.lockfileVersion >= 2);
});
