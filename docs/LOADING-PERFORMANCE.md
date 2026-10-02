# Loading performance

The September 2026 live mobile lab profile found variable Cloudflare-to-Netlify waiting time (459–3212 ms) and a 575 ms client-side room-lighting bake at 4× CPU slowdown. These are individual lab samples, not field Core Web Vitals.

## Public HTML caching

Netlify sends `Cloudflare-CDN-Cache-Control: public, max-age=120` separately from the browser's revalidation policy. The Cloudflare cache rule allows only HTTPS GET requests with no query string to the listed public HTML routes; it respects origin TTL and browser headers. Errors are not stored. Fingerprinted assets keep their year-long immutable cache policy. Subject data is never part of HTML responses; it remains in IndexedDB.

Production HTML can remain cached for up to two minutes after a release or rollback. Purge the affected URLs for urgent releases. Preview hosts and unlisted routes are excluded. Remove or revise this rule before introducing server-personalized responses or authentication.

The reproducible Cloudflare ruleset is recorded in `ops/cloudflare-cache-rule.json`; this repository file does not activate it automatically. The equivalent rule was activated through the dashboard on October 2, 2026 as **BunkMeter public page cache**, rule ID `167811db2f4444859f5fd260e815627d`. The dashboard-created rule does not use the template's custom ref. Apply the template only to the `bunkmeter.online` zone; update the existing rule rather than creating a duplicate, and preserve unrelated rules. To roll back caching, disable the named rule and purge its listed URLs.

Post-deployment mobile lab verification (390×844, 4× CPU slowdown, 150 ms configured network latency, cold browser cache) confirmed Cloudflare `HIT`, 75 ms document response start, 544 ms LCP, calculator enabled at 1068 ms, and 16 ms lighting setup. The preceding cache-miss sample had 1022 ms response start. These are individual samples, not guarantees or field metrics. Saved subjects, class updates across reload, Undo, and shared-link isolation passed on the live domain. Cross-browser CI, 136 unit tests, type checking, lint and production build passed before deployment.

## Instrument lighting

`environment.bin.gz` contains the existing Three.js room environment, baked at 16-pixel cube resolution (336×64 RGBA half-float atlas) and gzip-compressed. The approximately 29 KB asset loads only with the optional 3D renderer. It replaces the expensive per-visit environment convolution without changing attendance logic. Missing assets or unsupported decompression fall back to the working still instrument. Cancelling the enhancement aborts its fetch.

To regenerate after changing lighting or Three.js: run `npm run dev -- --host 127.0.0.1 --port 4326` in `v2`, then `node scripts/bake-environment.mjs` in another terminal with Chrome installed. Review the rendering and run the browser lifecycle tests before committing the asset. No runtime package was added.
