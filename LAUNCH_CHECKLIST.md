# BunkMeter release checklist

Approved scope: calculator-first launch with the Instrument visual identity and complete supporting pages. Saved subjects, persistent history, PWA, accounts, ads and payments are deferred.

## Implemented
- Exact attendance engine; consecutive miss allowance; recovery run; custom percentage; term-end feasibility and allowance.
- Present/Absent, last-12 Undo, class tiles and reversible 1–12 class projections. Session-only, clearly disclosed.
- About, Contact, Privacy, Terms, Disclaimer, 404; shared navigation/footer.
- Canonical URLs, social PNG, touch icon, WebApplication schema, sitemap and production-only indexing.
- Old .html URLs redirect to existing clean canonical paths. Existing calculator/FAQ/condonation anchors retained.
- Netlify static build and security/cache headers. Production rejects a missing/placeholder contact address.
- Preview remains noindex, including previews inheriting the production flag.

## Verification checkpoint — 27 September 2026
- Type checking, lint, 103 unit tests and seven-page build passed.
- Local Chromium: 24 browser cases passed. Local WebKit: 21 passed, three GPU-specific cases intentionally skipped.
- Cases include all public links/metadata, narrow-page accessibility, six calculator viewport widths, exact math, action/Undo, preview isolation and failure fallbacks.
- Windows runner completed all assertions but hung in shutdown and was stopped. Linux CI passed on 832d471 across Chromium, Firefox and WebKit.
- Production contact guard, all public pages' indexability, noindex 404, robots/sitemap and inherited preview protection verified by scripts/check-release.mjs.

## Deployment handoff
- Owner confirmed hello@bunkmeter.online as the public contact address; configured for production. Mail delivery is not verified by a website deployment.
- Existing hosting confirmed: Cloudflare DNS/proxy in front of Netlify project bunkmter. Keep the existing domain and DNS.
- Hosted preview checked: public routes, legacy redirects, real HTTP 404, security headers, social image and calculator interactions passed.

## Remaining release gates
- Final GitHub Actions green; resolve actual failures before merging.
- Check the hosted preview: original URLs redirect once, no redirect loops, unknown URL returns HTTP 404, security headers present, no CSP errors, social image loads.
- Brief owner phone check on real hardware: enter numbers, Present/Absent/Undo, scroll and preview. Desktop emulation is not physical-device proof; graphics startup still needs hardware assessment.
- Verify host rollback deploy exists before production switch. Merge/deploy only the tested commit.
- After launch: verify bunkmeter.online serves V2, robots permits crawling, canonical/sitemap match, contacts work and calculator results are correct. Submit sitemap in Search Console if the owner has access; indexing itself is not guaranteed.

Reference cases: 90/120 at 75% => 0 consecutive misses; 60/120 at 75% => 120 consecutive attended classes. With only 30 remaining, that second target is unreachable.

No AdSense, payment account, paid service, tracking or legal agreement is created by this release. Original production rollback: rollback/pre-v2-2026-09-23.
