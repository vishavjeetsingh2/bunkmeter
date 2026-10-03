# BunkMeter Android

The Android app bundles a separate static Astro entry with Capacitor 8. It imports the **same** calculator, exact attendance engine, Instrument, saved-subject model and IndexedDB store as the website. There is no remote website wrapper, server URL, account or sync service. Website routes, SEO and advertising markup remain in `src/pages` / `layouts`; they are not included in the Android entry.

## Build

Use Node 22.12+ (CI uses 24), Java 21, Android SDK platform 36 and build tools 35.0.0 (the Gradle plugin's default). From `v2`:

```sh
npm ci
npm run verify
npm run build:android
# macOS/Linux; use android/gradlew.bat on Windows
bash android/gradlew -p android :app:assembleDebug :app:bundleRelease :app:lintDebug
npx playwright test --config playwright.mobile.config.ts
```

`npm run build:android` builds `mobile/pages/index.astro`, hashes Astro's inline bootstrap for the packaged Content Security Policy, and syncs the generated assets/plugins into Android. Run it after every shared UI change. Do not edit `android/app/src/main/assets/public` directly. Set the SDK location in untracked `android/local.properties` or `ANDROID_HOME`. Open with `npm run open:android`.

Outputs: `android/app/build/outputs/apk/debug/app-debug.apk` (testing only) and `android/app/build/outputs/bundle/release/app-release.aab`. **Without signing configuration the release AAB is unsigned and cannot be uploaded to Play.** The Android GitHub workflow compiles both artifacts, lints the native project, tests the packaged interface, and runs an offline emulator persistence test. Artifacts remain available for 14 days. Check the actual workflow result before calling a release verified.

## Signing and identity

- Provisional application ID: `online.bunkmeter.app`; confirm before the first Play upload. Changing the ID or signing identity later does not preserve an installed app's private data.
- Default version: `1.0.0` / code `1`. Override with `BUNKMETER_VERSION_NAME` and `BUNKMETER_VERSION_CODE`; increment the code for every Play upload.
- Set all four signing environment variables only in your private release environment: `BUNKMETER_KEYSTORE` (absolute path), `BUNKMETER_STORE_PASSWORD`, `BUNKMETER_KEY_ALIAS`, `BUNKMETER_KEY_PASSWORD`.
- Never commit keys, passwords, `local.properties` or secret environment files. No upload key has been created. The owner controls Play App Signing and keeps a secure backup of the upload key. CI verification builds deliberately use no release credentials.

## Storage and platform behavior

- Keep Capacitor's `https://localhost` origin and IndexedDB database name/version stable across updates. Do not clear WebView data at launch, backgrounding or upgrade.
- Writes are immediate, serialized IndexedDB transactions with revision conflict protection. “Saved” is shown only after transaction completion. Back-to-background waits for queued writes; failed writes direct the user to backup options. OS termination before a transaction completes cannot be guaranteed safe; do not claim otherwise.
- Website and Android have separate records. Export/import is the explicit transfer path. Backup merge validation preserves existing records; Undo history is shared code.
- Cloud auto-backup and device transfer are disabled. Clearing app data or uninstalling deletes records. No automatic backup or synchronization is promised.
- Native sharing uses Android's share sheet. Export writes JSON only to the private cache `backups/` directory and grants the receiving app access to that file. No broad storage/media permission is requested. Android's file picker handles import.
- The whole calculator, help and graphics are bundled. External privacy/support URLs open the system browser/email app. They require connectivity; ordinary attendance work does not.
- System bars use Capacitor's built-in inset support. Light appearance matches the web brand, including when Android is in dark mode. The keyboard resizes the view. Bottom navigation links to subjects, calculator, history/backup and help. Back first dismisses focused input or open disclosure, returns to the top, then backgrounds the app after pending saves.
- Standard, adaptive and themed monochrome icons reuse the BunkMeter dial. Android's launch splash uses the same mark; no timer delays access to the calculator.

## Release checks

Before public release, test the **signed release build** on a physical phone: save two subjects, log Present/Absent, Undo, force-stop/reopen, reboot, and upgrade without uninstalling. Test airplane mode, file-picker import, share-sheet export/cancel, result sharing, system Back, keyboard, rotation, gesture and three-button navigation, large text, TalkBack and reduced motion. Confirm records survive and that no controls sit under system bars. Verify import from a web-exported backup. The emulator test covers native activity recreation/reopening; it does not replace a phone reboot/upgrade test.

## Play Console owner actions

1. Use an eligible developer account; complete Google's actual identity/account requirements, fees and agreements yourself. Confirm the permanent package ID and signing setup.
2. Review the signed build and complete any testing/access requirements shown for that account. Upload first to internal testing. No automatic public publication is configured.
3. Provide an accurate store listing, screenshots from the actual Android app, a 512px store icon and 1024×500 feature graphic. Do not claim college affiliation, guaranteed eligibility or cloud sync.
4. Complete content rating, target-audience and Data Safety forms based on the shipped app. Do not infer the audience's ages from the college theme. Confirm the public privacy URL contains the Android section before submission.
5. Recheck [Google's target API requirements](https://developer.android.com/google/play/requirements/target-sdk) at upload time. This project targets API 36.

## Data Safety review (owner must confirm)

The bundled Android build has no ads, analytics, account SDK, remote fonts, crash reporting or automatic attendance transmission. Names/counts/targets/history are processed locally; local-only processing is not “collection” under [Google's Data Safety guidance](https://support.google.com/googleplay/android-developer/answer/10787469). User-initiated sharing/export is clearly disclosed and may qualify for the user-initiated sharing exception; review the actual form and final build rather than treating this document as a submitted declaration. Result links reveal counts to recipients and may generate hosting logs when opened. Support email and external web pages have their own processing described in the privacy policy. No special encryption or independent security certification is claimed.

The only declared general permission is Internet (normal, no runtime prompt), used by the WebView runtime; no location, contacts, camera, microphone, notifications, advertising ID or broad file permission is requested. Check the **merged release manifest** when dependencies change. Reassess disclosures before adding any SDK, remote service or advertising.

## Dependency note

Capacitor core/Android + App, Share and Filesystem provide lifecycle/back, native sharing and cache-backed backup export. They are imported only by the mobile entry. The CLI is a development dependency. Its xcode helper's UUID dependency is scoped to compatible CommonJS `11.1.1`; the UUID generation API was verified. The existing Astro dependency currently reports `http-cache-semantics` GHSA-ch52-4w7c-c8xp without a compatible upstream fix. BunkMeter deploys static files, not Astro's HTTP cache/server; no shared authenticated server responses are handled. Do not apply npm's suggested Astro 2 downgrade. Revisit when a compatible fix is available.
