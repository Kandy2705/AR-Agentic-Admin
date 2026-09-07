import { spawn, spawnSync } from 'node:child_process';
import { watch } from 'node:fs';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
const build = () => spawnSync(process.execPath, ['scripts/build.mjs'], { cwd: root, stdio: 'inherit' });
if (build().status !== 0) process.exit(1);
const server = spawn(process.execPath, ['scripts/serve.mjs'], { cwd: root, stdio: 'inherit', env: process.env });
let timer;
for (const path of ['src', 'public']) watch(new URL(`../${path}/`, import.meta.url), { recursive: true }, () => {
  clearTimeout(timer); timer = setTimeout(() => { build(); console.log('Rebuilt. Refresh the browser to see changes.'); }, 200);
});
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => { server.kill(signal); process.exit(0); });
