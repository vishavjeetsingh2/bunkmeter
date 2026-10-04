import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { URL } from 'node:url';

// Astro's island loader is inline. Hash the exact built bytes instead of allowing
// arbitrary inline JavaScript in the packaged app.
const file = new URL('../dist-mobile/index.html', import.meta.url);
let html = await readFile(file, 'utf8');
const hashes = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)]
  .filter(([, body]) => body.trim())
  .map(([, body]) => `'sha256-${createHash('sha256').update(body).digest('base64')}'`);
html = html.replace("script-src 'self'", `script-src 'self' ${[...new Set(hashes)].join(' ')}`);
if (/googlesyndication|google-analytics|gtag\(/.test(html)) throw Error('Web-only tracking must not enter the Android bundle.');
await writeFile(file, html);
