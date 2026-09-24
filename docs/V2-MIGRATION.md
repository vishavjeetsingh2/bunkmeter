# V2 migration and rollback

## Baseline — 23 September 2026

Repository main: `289c0d76c21657924ac2b3bf39f3d8041149b732`.
Remote rollback point: `rollback/pre-v2-2026-09-23`; local tag: `pre-v2-2026-09-23`.
Development branch: `v2/foundation-calculator`.

Production deployment metadata is not exposed by the public site. On 23 September, all seven nonempty parsed inline script blocks from the live homepage matched this revision exactly, and the live homepage returned HTTP 200. This establishes a matching calculator baseline, not a confirmed host deployment ID.

## Isolation

The existing root HTML/assets and production Netlify publish directory are retained. V2 lives in `v2/`, with its own lockfile, build and preview output. This branch is not ready to merge/deploy to production at the visual-review checkpoint. Do not change the production branch or publish directory before the release checklist and owner launch approval.

## Order

1. Prove exact domain math, validation and regression tests.
2. Review one calculator visual slice, including mobile, keyboard and result states.
3. Only after visual approval, build local subjects/history and the remaining approved scope.
4. Preserve `/` and existing public canonical routes; redirect duplicate `.html` variants. Complete and verify every support/legal page before switching the production build to `v2/dist`.
5. Remove the unsafe condonation calculator in V2. Do not copy its days-as-lectures assumptions. Keep a factual explanation at the old anchor in the final migration.
6. Verify production headers, redirects, build, backups, storage migrations and PWA lifecycle before release.

## Data and future services

V1 has no attendance persistence to migrate. V2 will use a versioned IndexedDB adapter with atomic updates and validated, free export/restore. UI components must not own storage or math. Future optional sync can implement a separate repository adapter without coupling the calculator to accounts, network availability or payment status. Do not add billing, entitlement gates or speculative service interfaces now.

Public content and the interactive workspace have separate layouts so future approved sponsorships can remain outside the calculator. Essential calculations, corrections, tracking and export remain free. No tracking, ads, payment scripts or cloud data collection in this foundation.

## Rollback

Before launch: current production remains untouched; discard/revert individual V2 commits if necessary.
After launch: use the host's previously verified deploy or the rollback branch with the original root publish configuration. Reverting a build must never delete browser records. When schema changes exist, rehearse backward compatibility or ship a recovery-only build; do not blindly run old code against newer records. Never force-push main or reset user data as a rollback mechanism.
