# BunkMeter

A focused attendance calculator with exact whole-class answers and an optional 3D Instrument. The current application is in `v2/`; root HTML files are the retained original production baseline, not the new build output.

## Run and verify
Use Node 24. In `v2/`:

```sh
npm ci
npm run dev
npm run verify
node scripts/check-release.mjs
npx playwright install chromium firefox webkit
npm run test:e2e
```

`verify` runs type checks, lint, 103 unit tests and the static build. Playwright covers Chromium, Firefox and WebKit. GPU lifecycle cases run in Chromium only. The release check verifies production indexing and preview protection, then restores a nonindexable local build.

## Release
Netlify configuration builds `v2` and publishes `v2/dist`. Set `CONTACT_EMAIL` to the owner-confirmed public email. The production context enables `BUNKMETER_PRODUCTION=true`; deploy previews remain noindex. A production build rejects missing/placeholder contact details. Do not point the host at the repository root or deploy the default local preview build.

See [launch gates](LAUNCH_CHECKLIST.md) and [migration/rollback](docs/V2-MIGRATION.md). Do not merge with failing checks or unverified hosting configuration.

## Product boundary
Counts and the latest 12 class actions live only in page memory. Refresh clears them. No account, database, saved subjects, service worker, analytics, ads or payments are enabled. Calculation decisions never depend on the rendered 3D object or rounded display percentages.

Structure: `v2/src/domain` holds exact math and validation; `features/calculator` handles session actions and projections; `features/instrument` is optional presentation; `components` and `layouts` share page structure; `pages` preserves public routes. No user attendance is included in URLs or network requests.
