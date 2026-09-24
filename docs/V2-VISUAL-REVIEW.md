# Calculator visual checkpoint

This branch contains the approved foundation and one calculator slice. It is not a production release. Production root files and Netlify configuration remain unchanged; rollback references are recorded in V2-MIGRATION.md.

## What changed

- Independent exact-integer attendance engine and strict whole-string validation.
- Separate immediate consecutive-miss allowance and term-end attendance budget.
- Honest empty, invalid, safe, recovery, unreachable, 100% and completed-term states.
- Warm neutral surfaces, ink typography and semantic green/amber/red result states. Status text communicates meaning independently of color.
- Desktop two-column workspace; mobile answer directly beneath the counts; optional remaining classes disclosure; editable target with presets.
- Labels, error associations, visible keyboard focus, skip link, debounced result announcements, native disclosures and reduced-motion support.
- Factual explanations instead of the old condonation eligibility calculation. No institutional policy is inferred.

## Validation

- Strict type checking, zero-warning lint and production build passed locally.
- 67 domain/validation tests, including 324,800 boundary combinations and enumerated semester outcomes, passed.
- Local Chromium and WebKit: eight journeys each passed, including axe checks in five desktop states plus a mobile recovery state, and overflow checks at 320, 360, 390, 768, 1366 and 1440px with ordinary and very large numbers.
- Windows WebKit skips links during native tab navigation in this environment. WebKit tests explicit skip-link focus and activation; Chromium and Firefox exercise initial Tab ordering. Native Safari keyboard navigation remains a manual release gate.
- Local Firefox timed out before page creation. The complete three-engine suite is configured in Linux CI; consult the current commit's Actions result rather than treating this local limitation as a browser pass.
- Foundation commit d704c431648113017ddcb7fa5d328fa1be6547b1 passed GitHub Actions. The visual slice adds browser tests to that gate.
- Current emitted JavaScript totals 35,864 bytes raw / 14,460 bytes gzip across five chunks. CSS is 14,122 bytes raw / 3,422 bytes gzip. These are asset measurements, not field Core Web Vitals or a Lighthouse score.

## Review requested

Approve or adjust the warmth, typography, input/result hierarchy and mobile flow before extending this direction to subjects and history. Safe, recovery and impossible-recovery states are included in the local preview and review images.

## Gates still ahead

Saved records, migration/reconciliation/restore safety, loading-failure recovery, full public route parity, production SEO, physical-device and screen-reader testing, performance profiling on a mid-range phone, and any PWA lifecycle checks belong to subsequent milestones. Preview is deliberately noindex with robots disallow. No tracking, cloud storage, payments or advertising is enabled.

Do not merge or switch production to this incomplete slice. Visual approval authorizes the next implementation milestone, not a production launch.
