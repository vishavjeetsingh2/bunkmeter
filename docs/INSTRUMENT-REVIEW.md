# Instrument calculator — visual review checkpoint

Scope: the isolated `v2/` calculator only. The production site, production routes, saved subjects, history and other screens are unchanged. The Instrument direction replaces the earlier visual preview; it does not change the exact attendance engine. Stop here for the owner's visual review before extending the design.

## Experience

- Petrol, warm paper and restrained brass accents; a machined circular instrument supplies the brand motif.
- Real Three.js geometry: milled sidewall, metal rim, recessed printed face, raised attendance arc and target marker, directional shadow and procedural studio reflections.
- Attendance controls the arc; the required threshold controls the brass marker; safe/recovery/unreachable states change the arc and the text result together. The floating-point scene never decides eligibility or class counts.
- Pointer tilt and touch contact position use a critically damped response. No idle rotation, scroll hijacking or gesture is needed to calculate.
- Next-class previews show the consequence of attending or missing one class without editing recorded counts. The core answer remains prominent in HTML, with an immediate compact answer below the inputs on phones.
- No new persistence, signup, tracking, external font, model or environment-image service.

## Enhancement boundary

`Instrument.tsx` renders a complete static dial first. The isolated `scene.ts` chunk loads near the viewport during idle time. Three.js 0.186.0 is the sole new runtime dependency; no additional animation framework or React renderer is used.

Reduced-motion, save-data and one/two-core devices do not download the scene. A Still view control disposes it on demand. Import failure, absent WebGL and context loss retain the static view and working calculator. Device core count is only a coarse signal: slow frames also reduce pixel density and, if sustained, return to the still view.

Rendering stops when motion settles and when the object leaves the viewport or the tab is hidden. DPR is capped at 1.5 (1 after degradation); reflections use a 64px procedural environment and shadows a 512px map. Shader compilation uses `compileAsync` where the driver supports it. Cleanup releases listeners, observers, animation frames and GPU allocations.

## Verification and limits

- 70 unit tests: 67 existing domain/validation tests, including 324,800 integer boundary combinations, plus damped-motion and dial-angle checks.
- Browser coverage: calculation regression, keyboard/focus, automated axe checks, long values, 320/360/390/768/1366/1440 layouts, previews, blocked downloads, unavailable WebGL, reduced motion, save-data and low-core fallback.
- Chromium-specific coverage additionally checks idle/offscreen rendering, pointer response, native injected touch scrolling, disposal and context loss. The GPU cases are explicitly skipped in Firefox/WebKit; their calculator and fallback journeys still run.
- Browser workers run sequentially: concurrent software GPU renderers caused the application's intentional slow-device fallback during an otherwise valid lifecycle test.
- Visual review captures use 360/390 phones, 768 tablet and 1366/1440 desktop widths, including recovery, unreachable and still states.

Local Chromium laboratory sample (localhost, software graphics, no network throttling; one run per mode):

| Mode | LCP | CLS before interaction | Input to two animation frames |
| --- | ---: | ---: | ---: |
| Desktop 1440 | 96 ms | 0 | 107 ms |
| Mobile 390, 4x CPU slowdown | 248 ms | 0.0024 | 23 ms |
| Mobile reduced motion | 36 ms | 0 | 27 ms |

These are diagnostic samples, **not field Core Web Vitals or an INP measurement**. Environment downsizing reduced the largest observed graphics startup task from about 1.1 seconds to 0.44–0.47 seconds on the software driver. That remaining startup task needs hardware-device validation before production rollout; lazy loading and shader compilation do not eliminate all driver stalls. Do not claim performance certification from these numbers.

The calculator/shared JavaScript is about 16.3 KiB gzip. Optional 3D is about 133 KiB gzip and intentionally triggers Vite's 500 kB uncompressed-chunk advisory. It is already dynamically separated; the warning has not been hidden by raising a limit. No 3D download occurs in the tested simplified modes.

Physical iOS/Android, native Safari, screen-reader sessions and real-user CWV remain release gates. Automated accessibility and browser tests do not replace them. The preview remains noindex; no deployment or migration is part of this checkpoint.

## Review / rollback

Review the calculator at the local preview and in the attached screenshots. Approve the visual direction, or give focused feedback on the object, typography and mobile balance. Class Stack events and Landscape recovery views remain deferred.

The preceding calculator checkpoint is commit `2a098dd`; the original production rollback is `rollback/pre-v2-2026-09-23`. Revert the Instrument commit to return to the previous V2 slice; do not rewrite main or discard future unrelated changes.

