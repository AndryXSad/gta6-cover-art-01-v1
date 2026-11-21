// Vice Cover Studio — tiny static server for local try-outs.
// Serves app/ on http://localhost:8080 (open that URL after starting it).
// No build step, no dependencies, no network calls: it only reads files
// under app/ and answers with the right content type.
//
// Usage: node serve.ts

import { createServer } from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const APP_DIR = resolve(dirname(fileURLToPath(import.meta.url)), 'app');
const PORT = Number(process.env.PORT ?? 8080);

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ttf': 'font/ttf',
  '.txt': 'text/plain; charset=utf-8',
};

function safePath(urlPath: string): string | null {
  const cleaned = decodeURIComponent(urlPath.split('?')[0]);
  const rel = cleaned === '/' ? 'index.html' : cleaned.replace(/^\/+/, '');
  const full = resolve(APP_DIR, rel);
  if (!full.startsWith(APP_DIR + '/') && full !== APP_DIR) return null;
  return full;
}

const server = createServer((req, res) => {
  const target = safePath(req.url ?? '/');
  if (target === null || !existsSync(target) || !statSync(target).isFile()) {
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('not found\n');
    return;
  }
  res.writeHead(200, {
    'content-type': MIME[extname(target)] ?? 'application/octet-stream',
    'cache-control': 'no-store',
  });
  createReadStream(target).pipe(res);
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Vice Cover Studio serving app/ at http://localhost:${PORT}/`);
});
