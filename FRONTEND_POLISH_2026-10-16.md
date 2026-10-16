# Mobile and web polish — 16 October 2026

## Changes

- Web seat availability now has loading, empty, error and retry states. Live failures clear the seat map and selected seat and prevent checkout. Generated seats require the explicit offline environment flag and offline mode.
- Rider trips, seat holds, booking actions and supervisor verification have focused hooks behind the existing `useApp` provider. Requests are scoped to the current session and trips; stale responses cannot replace a newer selection. Round trips keep one shared seat number across both legs.
- Online booking and scanning no longer fall through to local success on API failure. Synchronous guards prevent repeated clicks from submitting concurrent booking or scan requests.
- Unknown routes returned by the API remain selectable under Other. Empty live categories do not synthesize services.
- The mobile home screen delegates account and rider booking UI to focused components. HTTP(S) server origins are validated, WebSocket URLs are derived from the parsed origin, and invalid environment configuration leaves the server editor available.
- The existing navy identity is retained. Changes include mobile keyboard and safe-area handling, larger touch controls, responsive RTL navigation, keyboard focus handling for navigation and checkout, visible focus, reduced motion, clearer authentication feedback and functional payment-address copying. The inactive receipt drop zone was removed; existing web receipt-reference payment handling remains.
- Mobile paid booking policy, zero-fare server-issued QR behavior and iOS shared code remain as specified in the approved plan.

## Verification

### Source and build checks

- Mobile TypeScript: `npm run ts:check --workspace=apps/mobile` from the repository root.
- Mobile URL checks: `npm run check:api-url --workspace=apps/mobile`, including the URL implementation used by Expo SDK 51.
- Expo dependency compatibility: `npx expo install --check` from `apps/mobile`.
- Web TypeScript: `node node_modules/typescript/bin/tsc --project apps/web/tsconfig.json --noEmit --incremental false`.
- Web booking checks: `node apps/web/scripts/check-seat-availability.cjs`. Covers both seat legs, ownership, empty and invalid responses, network/HTTP failures, server-only routes and empty categories. No new test framework was added.
- Web production build: `npm run build --workspace=apps/web`.
- Android debug assembly: `:app:assembleDebug`, using JDK 17, all existing ABIs and an embedded JS bundle.

### Runtime evidence

The edited web preview ran at `http://localhost:3002`, proxying the live development VM through `http://127.0.0.1:3001`. The Android APK used `http://10.0.2.2:3001` on `emulator-5554`. Only two newly created, clearly named QA accounts and **CODEX DEVELOPMENT TEST ROUTE - NO REAL SERVICE** were used.

- Web rider sign-in, route selection, actual seat hold, zero-fare booking and server-issued QR display succeeded.
- Two immediate submit clicks produced one booking POST.
- Forced seat-request network failure and HTTP 500 produced no seat buttons or checkout. Retry restored the real 50-seat map.
- Switching from a held fixture trip to another route released the hold; returning made that seat available again.
- Explicit offline mode generated its configured seats only with its build flag enabled. This simulation wrote no server data, and its browser state was cleared afterward.
- Phone widths of 360 and 390 CSS pixels and a desktop width of 1280 had no horizontal overflow. Arabic RTL navigation, drawer initial focus, Escape and focus restoration were exercised.
- Web camera decoding used a canvas stream containing the real server-issued QR. The first verification succeeded; Scan Next decoded the same stream and the server rejected the repeated scan. A forced verifier network failure displayed an error without local success.
- Native Android rider sign-in, fixture booking on seat 49, real QR/manual-code display, sign-out, supervisor sign-in, manual verification and repeated-scan rejection succeeded. The camera view rendered the emulator scene; native camera decoding of a physical QR was not verified.
- The final APK was reinstalled and cold-launched after the status-bar fix. The sign-in screen rendered with readable light status icons; the app-specific log contained no fatal exception or JavaScript error.

### Cleanup

The two temporary QA users, two fixture bookings, two boarding records and seven associated audit records were deleted. Post-cleanup database checks returned zero matching users, bookings, scans and audit records. All 12 existing fixture trips were retained. The two QA Redis session keys and fixture seat cache were cleared; neither QA session nor either tested seat lock remained. The temporary credential file was removed. No real rider account or operational service was changed.

### Final source review

The independent final review found no additional actionable defects. It verified the last hold-recovery fix in source: failed reads retain the acknowledged lease while clearing visible selection; retry can restore that owned seat without a second lock POST or extending the server expiry. This last recovery path, stale-response timing and the final checkout keyboard changes were source-reviewed; they were not exercised at runtime after the final edits.

Focused runtime artifacts are under the ignored `temp/galala-polish/` directory. They are local QA evidence, not operational service data.

## Android build environment

Use the installed JDK 17 at `C:\Program Files\Microsoft\jdk-17.0.20.101-hotspot` and Android SDK at `%LOCALAPPDATA%\Android\Sdk`. Set process `TEMP` and `TMP` to the existing short directory `D:\Work\Galala_BOOKING\temp\gradle` and remove `JAVA_TOOL_OPTIONS` for the build. Prefab initialization failed when that variable emitted JVM startup text; no ABI, Expo SDK or native dependency changes were needed.

The debug APK is `apps/mobile/android/app/build/outputs/apk/debug/app-debug.apk` (167,480,879 bytes). SHA-256: `f7ff70f62212fb2859bc1268a0a07e0d044d707d59c2d49471f5f0d82039cfab`. Its API target is for the local emulator; another device needs an accessible server origin in the app settings or build environment.

## Limits and scope

- Windows cannot verify a native iOS build; macOS and Xcode are still required.
- Automatic approval review rejected launching a separate production preview, including a loopback-only attempt, with the reason `blocked by policy`. The production build passed; browser runtime evidence came from the edited development preview.
- The pre-existing API migration edits and untracked Expo Go APK were preserved. This polish does not publish an operational timetable or change payment policy.
- This report covers the changed frontend behavior and bounded fixture checks. It is not a new exhaustive backend or security audit.
