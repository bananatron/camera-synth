import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { resolveAssetPath } from './static-path.mjs';

const production = process.argv.includes('--dist');
const root = path.resolve(production ? 'dist' : '.');
const port = 8931;
const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.wasm': 'application/wasm',
  '.task': 'application/octet-stream',
  '.json': 'application/json',
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
};

http
  .createServer(async (request, response) => {
    if (!['GET', 'HEAD'].includes(request.method)) {
      response.writeHead(405, { Allow: 'GET, HEAD' });
      response.end();
      return;
    }
    try {
      const pathname = new URL(request.url, 'http://localhost').pathname;
      const file = resolveAssetPath(pathname, root, production);
      if (!file) throw new Error('Unknown asset');
      const info = await stat(file);
      if (!info.isFile()) throw new Error('Not a file');
      response.writeHead(200, {
        'Content-Type': mimeTypes[path.extname(file)] || 'application/octet-stream',
        'Content-Length': info.size,
        'Cache-Control': 'no-cache',
        'X-Content-Type-Options': 'nosniff',
      });
      response.end(request.method === 'HEAD' ? undefined : await readFile(file));
    } catch {
      response.writeHead(404);
      response.end('Not found');
    }
  })
  .listen(port, '127.0.0.1', () => console.log(`Hand Loop: http://127.0.0.1:${port}`));
