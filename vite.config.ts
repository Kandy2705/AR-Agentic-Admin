/// <reference types="vitest/config" />
import { fileURLToPath, URL } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv, type Plugin } from 'vite';

const DEFAULT_API = 'https://ar-agentic-bscygtc7gdf7b4ga.southeastasia-01.azurewebsites.net';
/** In `npm run dev` the browser talks to this same-origin prefix and Vite proxies it (no CORS needed). */
const DEV_PROXY_PREFIX = '/__backend';
const LOCAL_HOSTS = ['localhost', '127.0.0.1', '[::1]'];

interface ApiTarget {
  /** Value the app uses as API base (absolute origin/path or same-origin path). */
  base: string;
  /** Origin used by the dev proxy, when the base is absolute. */
  origin: string | null;
  /** CSP `connect-src` value for production builds. */
  connectSrc: string;
}

/** Validates the configured API origin at build time. Only public URLs belong here. */
function parseApiTarget(raw: string): ApiTarget {
  if (raw.startsWith('/') && !raw.startsWith('//')) {
    return { base: raw.replace(/\/$/, ''), origin: null, connectSrc: "'self'" };
  }
  const url = new URL(raw);
  const insecure =
    url.protocol !== 'https:' && !(url.protocol === 'http:' && LOCAL_HOSTS.includes(url.hostname));
  if (url.username || url.password || url.search || url.hash || insecure) {
    throw new Error(
      'ADMIN_API_BASE_URL must be HTTPS (HTTP only for localhost), or a same-origin path beginning with /.',
    );
  }
  return {
    base: url.href.replace(/\/$/, ''),
    origin: url.origin,
    connectSrc: `'self' ${url.origin}`,
  };
}

/** Adds a restrictive Content-Security-Policy to the production HTML only (dev needs inline HMR scripts). */
function contentSecurityPolicy(connectSrc: string): Plugin {
  const policy = [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self'",
    // Map tiles: OpenStreetMap and Esri (street + World Imagery satellite).
    "img-src 'self' data: https://tile.openstreetmap.org https://server.arcgisonline.com",
    // Address search: OpenStreetMap Nominatim.
    `connect-src ${connectSrc} https://nominatim.openstreetmap.org`,
    "font-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ');
  return {
    name: 'admin-csp',
    apply: 'build',
    transformIndexHtml: () => [
      {
        tag: 'meta',
        attrs: { 'http-equiv': 'Content-Security-Policy', content: policy },
        injectTo: 'head-prepend',
      },
    ],
  };
}

export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), 'ADMIN_');
  const raw = (process.env.ADMIN_API_BASE_URL || env.ADMIN_API_BASE_URL || DEFAULT_API).trim();
  const target = parseApiTarget(raw);
  const useDevProxy = command === 'serve' && mode === 'development' && target.origin !== null;

  return {
    base: './',
    plugins: [react(), tailwindcss(), contentSecurityPolicy(target.connectSrc)],
    define: {
      __ADMIN_API_BASE__: JSON.stringify(useDevProxy ? DEV_PROXY_PREFIX : target.base),
    },
    resolve: {
      alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
    },
    server: {
      port: 5173,
      strictPort: true,
      proxy: useDevProxy
        ? {
            [DEV_PROXY_PREFIX]: {
              target: target.origin!,
              changeOrigin: true,
              secure: true,
              rewrite: (path) => path.replace(new RegExp(`^${DEV_PROXY_PREFIX}`), ''),
            },
          }
        : undefined,
    },
    preview: { port: 4173, strictPort: true },
    build: {
      target: 'es2022',
      sourcemap: false,
      rollupOptions: {
        output: {
          manualChunks: {
            react: ['react', 'react-dom', 'react-dom/client', 'react-router'],
            data: ['@tanstack/react-query'],
            forms: ['react-hook-form', 'zod', '@hookform/resolvers'],
          },
        },
      },
    },
    test: {
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts'],
      css: false,
      restoreMocks: true,
    },
  };
});
