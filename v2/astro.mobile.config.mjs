import { defineConfig } from 'astro/config';
import preact from '@astrojs/preact';

export default defineConfig({
  srcDir: './mobile', outDir: './dist-mobile', publicDir: './mobile/public',
  output: 'static', build: { format: 'file' }, integrations: [preact()],
  devToolbar: { enabled: false },
});
