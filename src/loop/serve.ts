import { readFile, stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { extname, join, resolve } from 'node:path';
import { isInside } from './workspace.js';

const types: Record<string, string> = {
  '.html': 'text/html', '.js': 'application/javascript', '.mjs': 'application/javascript', '.css': 'text/css',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.ico': 'image/x-icon',
};

export interface StaticServer {
  url: string;
  pageRequests: () => number;
  close: () => Promise<void>;
}

/** Serves a static app folder on a loopback port without caching. */
export async function serveStatic(root: string): Promise<StaticServer> {
  const base = resolve(root);
  let pages = 0;
  const server = createServer(async (request, response) => {
    try {
      const path = decodeURIComponent(new URL(request.url ?? '/', 'http://127.0.0.1').pathname);
      let file = resolve(join(base, path));
      if (!isInside(file, base) || request.method !== 'GET') { response.writeHead(404).end(); return; }
      if ((await stat(file).catch(() => null))?.isDirectory()) file = join(file, 'index.html');
      const body = await readFile(file);
      if (file.endsWith('index.html')) pages++;
      response.writeHead(200, { 'Content-Type': `${types[extname(file).toLowerCase()] ?? 'application/octet-stream'}; charset=utf-8`, 'Cache-Control': 'no-store' }).end(body);
    } catch {
      response.writeHead(404).end();
    }
  });
  await new Promise<void>((resolveListen, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolveListen); });
  const { port } = server.address() as AddressInfo;
  return {
    url: `http://127.0.0.1:${port}/`,
    pageRequests: () => pages,
    close: () => new Promise((resolveClose) => { server.closeAllConnections(); server.close(() => resolveClose()); }),
  };
}
