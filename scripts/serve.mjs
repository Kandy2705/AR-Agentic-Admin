import { createServer, request as httpRequest } from 'node:http';
import { request as httpsRequest } from 'node:https';
import { readFile, stat } from 'node:fs/promises';
import { resolve, sep, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../dist/', import.meta.url));
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.json': 'application/json' };
const port = Number(process.env.PORT || 5173);
const upstream = new URL(process.env.UPSTREAM_API_BASE_URL || 'https://ar-agentic-bscygtc7gdf7b4ga.southeastasia-01.azurewebsites.net');

function proxy(req, res, pathname, search) {
  const targetPath = pathname.replace(/^\/__backend/, '') + search;
  const requester = upstream.protocol === 'http:' ? httpRequest : httpsRequest;
  const headers = {
    accept: req.headers.accept || 'application/json',
    'content-type': req.headers['content-type'] || undefined,
    authorization: req.headers.authorization || undefined,
    'user-agent': 'AR-Agentic-Admin-DevProxy/1.0',
  };
  for (const key of Object.keys(headers)) if (!headers[key]) delete headers[key];

  const upstreamReq = requester({
    protocol: upstream.protocol,
    hostname: upstream.hostname,
    port: upstream.port || undefined,
    method: req.method,
    path: targetPath,
    headers,
    timeout: 20000,
  }, upstreamRes => {
    const responseHeaders = {
      'content-type': upstreamRes.headers['content-type'] || 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
    };
    res.writeHead(upstreamRes.statusCode || 502, responseHeaders);
    upstreamRes.pipe(res);
  });
  upstreamReq.on('timeout', () => upstreamReq.destroy(new Error('Upstream timeout')));
  upstreamReq.on('error', error => {
    console.error('API proxy error:', error.message);
    if (!res.headersSent) res.writeHead(502, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
    res.end(JSON.stringify({ success: false, data: null, message: 'Backend API is unreachable from the development proxy.', errorCode: 'UPSTREAM_UNAVAILABLE' }));
  });
  req.pipe(upstreamReq);
}

const server = createServer(async (req, res) => {
  try {
    const requestUrl = new URL(req.url || '/', 'http://localhost');
    const pathname = decodeURIComponent(requestUrl.pathname);
    if (pathname === '/__backend' || pathname.startsWith('/__backend/')) {
      proxy(req, res, pathname, requestUrl.search);
      return;
    }
    const path = resolve(root, '.' + (pathname.endsWith('/') ? pathname + 'index.html' : pathname));
    if (!path.startsWith(root.endsWith(sep) ? root : root + sep) || !(await stat(path)).isFile()) throw new Error('Not found');
    res.writeHead(200, { 'Content-Type': mime[extname(path)] || 'application/octet-stream', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer' });
    res.end(await readFile(path));
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not found');
  }
});
server.listen(port, '127.0.0.1', () => console.log(`Admin portal: http://localhost:${port} (API proxied to ${upstream.origin})`));
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.close(() => process.exit(0)));
