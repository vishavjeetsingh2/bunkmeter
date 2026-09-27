# V2 migration and rollback

The owner approved a calculator-first release on 27 September 2026. This supersedes the earlier plan to require saved subjects/history/PWA before launch. The Instrument identity is approved; freeze further visual experiments.

## Deploy boundary
- Source: `v2/`. Netlify root configuration sets base `v2`, publish `dist`, Node 24 and `npm run verify`.
- Production requires an owner-confirmed `CONTACT_EMAIL`; the production context sets `BUNKMETER_PRODUCTION=true`.
- Local builds and deploy previews remain noindex. Never publish a preview build as production.
- Public paths remain `/`, `/about`, `/contact`, `/privacy-policy`, `/terms`, `/disclaimer`. Old .html variants redirect permanently to canonical clean paths. No blanket SPA rewrite; unknown paths must return a real 404.
- `/#condonation` now explains institutional policy limitations rather than converting days into lectures. `/#calculator` and `/#faq` remain meaningful anchors.
- Original terms are retained with factual service/dependency corrections. Privacy describes in-browser counts, hosting requests and email correspondence accurately. No ads, analytics or payment services are enabled.

## Data
V1 has no stored attendance to migrate. This release remains session-only, with no local/cloud database. Do not imply that recorded class actions survive reload. Persistence and export/restore require a separate tested release.

## Rollback
Original production baseline: `289c0d76c21657924ac2b3bf39f3d8041149b732`, branch `rollback/pre-v2-2026-09-23`. Current release work is on `v2/foundation-calculator`, PR #1.

Before launch, identify the host's known-good production deploy. Prefer restoring that deploy for immediate rollback. If rebuilding the rollback branch, restore its root publish configuration too; old HTML is not built from v2/dist. Do not force-push main. Preserve history and revert focused commits when appropriate.

Launch status and uncompleted gates are maintained in `../LAUNCH_CHECKLIST.md`. Historical visual review documents describe earlier checkpoints, not current launch approval.
