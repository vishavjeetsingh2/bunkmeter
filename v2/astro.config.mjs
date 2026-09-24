import { defineConfig } from 'astro/config';
import preact from '@astrojs/preact';

export default defineConfig({
  site: 'https://bunkmeter.online',
  output: 'static',
  integrations: [preact()],
  devToolbar: { enabled: false },
});
