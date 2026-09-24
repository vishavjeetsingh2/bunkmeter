# BunkMeter V2 foundation

Isolated calculator preview, not a production migration. Node 24 LTS recommended (minimum 22.12).

```sh
npm ci
npm run dev
npm run verify
npx playwright install chromium firefox webkit
npm run test:e2e
npm run preview
```

`verify` runs strict Astro/TypeScript checking, ESLint, domain tests and a production build. Vitest checks the audited regressions, 324,800 integer boundaries and enumerated semester outcomes. Playwright tests the built output in Chromium, Firefox and WebKit, including keyboard interaction, automated axe checks, result states and 320–1440px layouts. Run `verify` before browser tests to rebuild the output. Stop an existing Astro preview server before running the browser suite. No production data, accounts or services are required.

On restricted machines, set `ASTRO_TELEMETRY_DISABLED=1` to avoid Astro writing its telemetry configuration outside the project. Playwright's Windows WebKit build skips links in native tab navigation in our environment. Since native link tabbing varies across WebKit ports/preferences, WebKit tests explicit skip-link focus and keyboard activation; Chromium and Firefox test first-tab ordering. Native Safari keyboard navigation remains a manual release gate. Automated accessibility checks do not replace assistive-technology and physical-device release testing.

## Domain contract

`src/domain/attendance.ts` is the only attendance arithmetic. Required targets use basis points (75% = 7500), counts are whole lectures, and comparisons/division use BigInt. Input counts are capped at one billion; derived recovery counts can be much larger. Percentages display conservatively to two decimal places and never determine status. 0/0 is unrecorded, not 100%. Zero remaining is not unknown remaining. Exact 100% after an absence is impossible in finite future classes. No institutional condonation policy is inferred.

`validation.ts` parses whole strings and never substitutes defaults for invalid/blank inputs. UI state contains raw strings separately from validated values. Public domain calls also validate inputs defensively.

No persistence is implemented before visual approval. Future IndexedDB and optional sync belong behind a repository boundary, separate from these pure functions and UI components. Versioned migrations, transactional event/checkpoint updates and validated restore are required before any stored-record release. See `../docs/V2-MIGRATION.md`.

Preview deliberately uses noindex and robots disallow. Production SEO enablement and route parity are release tasks, not accomplished by this slice. No service worker, third-party analytics, payment code or ad scripts are loaded.
