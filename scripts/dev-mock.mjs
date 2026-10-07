/** Starts the offline mock API and the Vite dev server pointed at it. */
import { spawn } from 'node:child_process';

const port = process.env.MOCK_API_PORT || '5174';
const env = { ...process.env, MOCK_API_PORT: port, ADMIN_API_BASE_URL: `http://localhost:${port}` };
const children = [
  spawn(process.execPath, ['scripts/mock-api.mjs'], { stdio: 'inherit', env }),
  spawn(process.platform === 'win32' ? 'npx.cmd' : 'npx', ['vite'], { stdio: 'inherit', env }),
];
const stop = () => children.forEach((child) => child.kill());
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => (stop(), process.exit(0)));
children.forEach((child) => child.on('exit', (code) => (stop(), process.exit(code ?? 0))));
