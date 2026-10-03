import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath, URL } from 'node:url';
import { resolve, extname, sep } from 'node:path';
const root = fileURLToPath(new URL('../dist-mobile', import.meta.url));
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.gz': 'application/gzip', '.svg': 'image/svg+xml' };
createServer(async (request, response) => {
  try {
    const path = resolve(root, '.' + new URL(request.url, 'http://localhost').pathname);
    if (path !== root && !path.startsWith(root + sep)) { response.writeHead(403); response.end(); return; }
    const file = path === root ? resolve(root, 'index.html') : path;
    const body = await readFile(file);
    response.writeHead(200, { 'Content-Type': types[extname(file)] ?? 'application/octet-stream' }); response.end(body);
  } catch { response.writeHead(404); response.end('Not found'); }
}).listen(4325, '127.0.0.1');
