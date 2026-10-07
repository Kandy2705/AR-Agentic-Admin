/**
 * Offline fake of the Agentic AR API (fictional data) for UI development and demos:
 *   npm run dev:mock   → http://localhost:5173 (any email/password signs in; password "wrong" fails)
 * Requires Node ≥ 22.18 (built-in TypeScript type stripping).
 */
import { createServer } from 'node:http';
import { createMockFetch, createMockState } from '../src/test/mock-backend.ts';

const port = Number(process.env.MOCK_API_PORT || 5174);
const handle = createMockFetch(createMockState());

createServer(async (req, res) => {
  const cors = {
    'Access-Control-Allow-Origin': req.headers.origin || '*',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type, Accept',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  };
  if (req.method === 'OPTIONS') {
    res.writeHead(204, cors).end();
    return;
  }
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const body = chunks.length ? Buffer.concat(chunks).toString('utf8') : undefined;
  await new Promise((resolve) => setTimeout(resolve, 150)); // simulate latency
  const response = await handle(`http://localhost:${port}${req.url}`, { method: req.method, body });
  res.writeHead(response.status, { ...cors, 'Content-Type': 'application/json; charset=utf-8' });
  res.end(await response.text());
}).listen(port, '127.0.0.1', () => console.log(`Mock API: http://localhost:${port}/api/v1`));
