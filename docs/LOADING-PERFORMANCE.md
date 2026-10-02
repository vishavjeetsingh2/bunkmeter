# Loading performance

The September 2026 live mobile lab profile found variable Cloudflare-to-Netlify waiting time (459–3212 ms) and a 575 ms client-side room-lighting bake at 4× CPU slowdown. These are individual lab samples, not field Core Web Vitals.

## Public HTML caching

Netlify sends `Cloudflare-CDN-Cache-Control: public, max-age=120` separately from the browser's revalidation policy. The Cloudflare cache rule allows only HTTPS GET requests with no query string to the listed public HTML routes; it respects origin TTL and browser headers. Errors are not stored. Fingerprinted assets keep their year-long immutable cache policy. Subject data is never part of HTML responses; it remains in IndexedDB.

Production HTML can remain cached for up to two minutes after a release or rollback. Purge the affected URLs for urgent releases. Preview hosts and unlisted routes are excluded. Remove or revise this rule before introducing server-personalized responses or authentication.

The intended Cloudflare ruleset is recorded in `ops/cloudflare-cache-rule.json`; this repository file does not activate it automatically. Apply it only to the `bunkmeter.online` zone; preserve any unrelated rules if the zone gains more rules later. To roll back caching, disable the rule with ref `bunkmeter_public_html` and purge its listed URLs.

## Instrument lighting

`environment.bin.gz` contains the existing Three.js room environment, baked at 16-pixel cube resolution (336×64 RGBA half-float atlas) and gzip-compressed. The approximately 29 KB asset loads only with the optional 3D renderer. It replaces the expensive per-visit environment convolution without changing attendance logic. Missing assets or unsupported decompression fall back to the working still instrument. Cancelling the enhancement aborts its fetch.

To regenerate after changing lighting or Three.js: run `npm run dev -- --host 127.0.0.1 --port 4326` in `v2`, then `node scripts/bake-environment.mjs` in another terminal with Chrome installed. Review the rendering and run the browser lifecycle tests before committing the asset. No runtime package was added.
