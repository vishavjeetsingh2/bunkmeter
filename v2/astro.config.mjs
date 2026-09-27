import { defineConfig } from 'astro/config';
import preact from '@astrojs/preact';
import process from 'node:process';

if (process.env.BUNKMETER_PRODUCTION === 'true' && (!process.env.CONTEXT || process.env.CONTEXT === 'production')) {
  const email = process.env.CONTACT_EMAIL?.trim();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || /@example\.|hello@bunkmeter\.app/i.test(email)) {
    throw new Error('Set CONTACT_EMAIL to the owner-confirmed public contact address before a production build.');
  }
}

export default defineConfig({
  site: 'https://bunkmeter.online',
  output: 'static',
  build: { format: 'file' },
  trailingSlash: 'never',
  integrations: [preact()],
  devToolbar: { enabled: false },
});
