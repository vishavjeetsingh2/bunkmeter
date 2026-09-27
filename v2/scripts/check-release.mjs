import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import process from 'node:process';
import console from 'node:console';

const base = { ...process.env, ASTRO_TELEMETRY_DISABLED: '1' };
function build(env) {
  const result = spawnSync(process.execPath, ['node_modules/astro/bin/astro.mjs', 'build'], { env: { ...base, ...env }, encoding: 'utf8' });
  if (result.error) throw result.error;
  return result;
}
const read = path => readFileSync(`dist/${path}`, 'utf8');
try {
  const rejected = build({ BUNKMETER_PRODUCTION: 'true', CONTEXT: 'production', CONTACT_EMAIL: '' });
  assert.notEqual(rejected.status, 0, 'Production must reject an absent owner contact');
  assert.match(rejected.stderr + rejected.stdout, /owner-confirmed public contact/);
  const production = build({ BUNKMETER_PRODUCTION: 'true', CONTEXT: 'production', CONTACT_EMAIL: 'release-test@bunkmeter.invalid' });
  assert.equal(production.status, 0, production.stderr);
  for (const file of ['index', 'about', 'contact', 'privacy-policy', 'terms', 'disclaimer']) {
    assert.match(read(`${file}.html`), /name="robots" content="index, follow"/);
  }
  assert.match(read('contact.html'), /mailto:release-test@bunkmeter.invalid/);
  assert.match(read('404.html'), /name="robots" content="noindex, follow"/);
  assert.match(read('robots.txt'), /Allow: \/\nSitemap: https:\/\/bunkmeter.online\/sitemap.xml/);
  const preview = build({ BUNKMETER_PRODUCTION: 'true', CONTEXT: 'deploy-preview', CONTACT_EMAIL: '' });
  assert.equal(preview.status, 0, preview.stderr);
  assert.match(read('index.html'), /name="robots" content="noindex, follow"/);
  assert.match(read('robots.txt'), /Disallow: \//);
  console.log('Production contact guard, indexing, 404 and inherited preview protection passed.');
} finally {
  // Never leave the production fixture or its fake contact in the local preview.
  const restored = build({ BUNKMETER_PRODUCTION: 'false', CONTEXT: 'dev', CONTACT_EMAIL: '' });
  assert.equal(restored.status, 0, restored.stderr);
}
