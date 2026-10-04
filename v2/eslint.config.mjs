import js from '@eslint/js';
import ts from 'typescript-eslint';
import astro from 'eslint-plugin-astro';

export default [
  { ignores: ['dist/**', 'dist-mobile/**', 'android/**', '.astro/**', 'node_modules/**', 'test-results/**', 'playwright-report/**'] },
  js.configs.recommended,
  ...ts.configs.recommended,
  ...astro.configs.recommended,
];
