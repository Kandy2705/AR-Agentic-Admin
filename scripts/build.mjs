import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const require = createRequire(import.meta.url);
let compiler;
try { compiler = require.resolve('typescript/bin/tsc'); } catch { throw new Error('Run npm ci before building.'); }

const envFile = resolve(root, '.env');
const match = existsSync(envFile) ? readFileSync(envFile, 'utf8').match(/^ADMIN_API_BASE_URL\s*=\s*([^\r\n]+)/m) : null;
const raw = (process.env.ADMIN_API_BASE_URL || match?.[1]?.trim().replace(/^['"]|['"]$/g, '') || 'https://ar-agentic-bscygtc7gdf7b4ga.southeastasia-01.azurewebsites.net').trim();

let publicApiBase;
let connectSource;
if (raw.startsWith('/') && !raw.startsWith('//')) {
  publicApiBase = raw.replace(/\/$/, '');
  connectSource = "'self'";
} else {
  const url = new URL(raw);
  if (url.username || url.password || url.search || url.hash || (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)))) {
    throw new Error('ADMIN_API_BASE_URL must be HTTPS (HTTP only for localhost), or a same-origin path beginning with /.');
  }
  publicApiBase = url.href.replace(/\/$/, '');
  connectSource = `'self' ${url.origin}`;
}

const out = resolve(root, 'dist');
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
const run = spawnSync(process.execPath, [compiler, '-p', resolve(root, 'tsconfig.json')], { cwd: root, stdio: 'inherit' });
if (run.status !== 0) process.exit(run.status || 1);
cpSync(resolve(root, 'public'), out, { recursive: true });
writeFileSync(resolve(out, 'config.js'), `window.__ADMIN_CONFIG__ = Object.freeze(${JSON.stringify({ apiBaseUrl: publicApiBase })});\n`);
const html = readFileSync(resolve(out, 'index.html'), 'utf8').replace('__API_ORIGIN__', connectSource);
writeFileSync(resolve(out, 'index.html'), html);
console.log(`Built dist/ using API base ${publicApiBase}.`);
