# My Commute candidate — 5 November 2026

## Scope and decisions
Created a separate unpublished Git app for London bus, Tube, Overground, Elizabeth line, DLR and National Rail journeys. The aggregate workspace is unborn and must not be staged. No owner installation or credentials were used, and no commit, push, Actions workflow or release was authorized. Managed integration lives in the isolated `workspace-my-commute` worktree, based on Workspace main 1f505e0.

Mobile-first AUI source compiles to React; keep UI changes in `web/src/screens/Dashboard.aui`. Go/apphost embeds the UI, uses private per-account SQLite state and managed MyAccounts OIDC. Local preview accounts are loopback-only. Provider credentials are owner-only, server-side and never returned. GPS is opt-in, page-memory only, with freshness/accuracy checks and manual direction override.

Journey engine uses fresh provider predictions, walking estimates, saved ride durations, interchange walks and boarding buffers. Separate outward/return legs, alternative buses at a stop, all returned departures and cancellation/unknown statuses are supported. Missing upstream connections prevent invented downstream recommendations. The Highbury–Oxford Circus example is labelled; the user's actual route is not known. Ride durations are configurable estimates, not traffic-aware routing.

TfL calls were tested live. Darwin requires a user-supplied token and remains unverified against a credentialed live feed. The official 2021-11-01 OpenLDBWS WSDL uses the **2015-05-14** SOAPAction for GetDepBoardWithDetails; retain this distinction. Synthetic tests cover request shape, midnight, calling points and cancellations.

## Verification
- UI production build and strict controller/engine TypeScript passed.
- Nine journey-engine tests passed; native Go tests and vet passed.
- Eight Playwright scenarios passed on the final native executable: live TfL, 320–1440px layouts, saved both-direction journeys, denied GPS/feed outage/missing Darwin token, direction inference/manual override, per-account isolation/CSRF/owner writes, and a synthetic bus→Tube transfer with platform wait.
- Screenshots in `docs/screenshots/`; connection screenshot is deliberately synthetic. Physical Android/iOS and clean-host reboot are not claimed.
- Final executable SHA-256: 42da8c83dadf9df1dfd5e483c7434aaa797be363e0b3d8d5251ba9fee9673eb1.
- Local artifact root: `I:/Projects/tooling/my-commute-20261105`; `delivery/` contains executable ZIP, source ZIP, third-party licences and verification receipt. Source commit is null and candidate flag true.

## Managed delivery
App ID commute, route /commute, port 9040 (managed base+50), optional General app, private `${DATA}/commute`, no sidecar. Integration 9 gates old controllers. Suite registry, selection, storage, OIDC/sign-out, picker branding, independent updates/recovery, strict package namespace and candidate build/publication guards are implemented. No public lock pin was fabricated. Full builder validated 38 managed apps. Final isolated native fresh/upgrade/update/rollback acceptance passed; see final evidence below.

Public organization repository, release/channel promotion and owner-PC installation remain pending. Suite publication must use its signed-Android entry point with Actions disabled. Never replace immutable public assets.

## Later verification and corrections
A user-specific route was prepared in a protected NTFS import file outside Git and shared artifacts. Do not use that personal file as a software fixture or copy its contents into history. The app source remains generic. Imports are server-validated previews with new IDs; saving is explicit. Alternative Tube lines are selectable by checkbox and can use a shared physical platform, avoiding inconsistent inbound/outbound labels between lines. Exact stop lookup now resolves nested TfL hub children so the selected road-side/platform ID is retained. Synthetic regression coverage added.

Native managed fresh opt-in/opt-out and upgrade from preview.113 passed on an intermediate candidate. Its app-only update exposed a real app bug: calling Migrate(1) and Migrate(2) unconditionally rejects an existing version-2 database on restart. Fixed by querying the current schema and applying only missing steps, while rejecting future schemas. Tests cover empty/v1/v2/v3 databases, preservation and a real native process restart; all eight browser scenarios now pass. Do not use the intermediate candidate as final recovery evidence. Final ordinary build is `suite-ready/`, using the corrected `delivery/` package. The managed acceptance script passed against that build, including fresh restart, saved journey preservation, app update and rollback. Earlier completed/partial build folders are superseded local candidates.

## Final evidence and handoff
Final artifact: `delivery/MyCommute-windows-amd64-candidate.zip`, SHA-256 b8a2c5a46a45236c9deac4a66ffadd50b791ac46a920acfe38c44a3c62853b90. Executable SHA above is final. Complete managed candidate: `suite-ready/WorkspaceSetup-windows-amd64.exe` and `workspace-bundle.zip`; 38 apps, 498 packages (47 Commute) all hashes verified. The final linker ran out of temporary C: space; only abandoned task build files were removed, and the identical final build command was resumed using I: temporary storage. The ordinary catalogue audit passed again; managed-build.json explicitly records the resumed link.

Final `docs/evidence/managed-acceptance.json` is passed=true: fresh selection, fresh process restart, opt-out, upgrade from exact preview.113, MyAccounts identity/shared picker/icon/bare route, anonymous denial and geolocation policy, independent update to synthetic preview.2-test, rollback to preview.1, and saved journey/preferences preservation. Accounts program bytes and owner/issuer remained unchanged. The earlier migration failure is superseded by this successful run. Synthetic runtime processes were stopped; fixtures are disposable task data, not owner installations. Physical phone/reboot and credentialed Darwin remain untested. No public repository/release/channel, commit/push or owner installation occurred.

Source and managed integration are ready for review. If publication is explicitly requested, first reconcile current organization main and other app work, create the actual app repository/pin, use the mandatory signed-Android publication path, keep Actions disabled and verify each installed target separately. Never promote candidate metadata or overwrite immutable release assets. The user-specific prepared route remains in protected local storage outside Git; do not use it as test data or publish it.

Cleanup completed: stopped synthetic NTFS accounts/data and their replaceable program directories were removed; superseded task candidates and abandoned build temporaries were removed. The final delivery, final managed installer, source and evidence remain. The user’s separate protected prepared journey file was preserved.

## Installation follow-up
The user subsequently requested installation on both Workspace machines and a retry. Managed distribution is being prepared under the required lifecycle. Suite integration is rebased onto main08e175d, retaining News/Finance and the startup progress fix. The combined catalog requires manager116/integration10. Release packaging now supports a clean committed source archive; prior candidate acceptance remains historical. Public release/channel and each owner installation must still be verified separately. Personal journey configuration remains outside Git.

## Public delivery verified
The authorized install follow-up published immutable [My Commute1](https://github.com/oneworkspacestudio/my-commute/releases/tag/v0.1.0-preview.1), source054070d26f11e74407e13234519a4efa01171b9c. All9 asset digests and the anonymous public ZIP were verified. The ZIP SHA256 is9f89d930486f500e32379864aba4abd993d1d6802111b337b1cd3b1765cee54d; executable remains the tested42da8c83 hash above. Actions remain disabled.

Managed distribution is [Workspace116](https://github.com/oneworkspacestudio/one-workspace/releases/tag/v0.3.0-preview.116), source8a61af97756c6abfc47d5df33a905d4989777a57:39 apps,509 packages,47 Commute payloads, integration10. The ordinary builder and all6 exact-release synthetic NTFS acceptance checks passed, including114 upgrade and recovery. Required signed-Android publisher verified all527 assets and published; the public channel includes both releases. The ordinary unauthenticated installer downloaded and verified116/Commute1 successfully. Public release assets are immutable; do not rebuild or replace them. Concurrent News/Finance channel changes were preserved.

Owner delivery remains in progress: no Commute installation has yet been submitted. Primary completed a separate115/News update and is finishing protected cleanup; all37 services are healthy. Secondary has a separate active reinstall, with a Windows Firewall prompt requiring user action. Wait for active maintenance to finish before adding Commute. Personal route import is prepared privately outside Git and has not yet been saved into either owner account. Do not infer per-PC installation from release/channel success.

## Primary installation completed
At 17:15 UTC the primary PC completed the normal protected Workspace 115 → 116 update with Commute 1 selected. All 47 Commute payload hashes and the manager match the public release. All 38 services are healthy. Existing app/package contracts and bytes, identities, credentials and storage locations were verified unchanged; News 1 and Finance 5 were retained. Transaction and cleanup completed, with the verified recovery copy retained. The native running app serves the exact tested JavaScript, CSS and icon. Evidence: `docs/evidence/primary-managed-installation.json`.

Public app assets correctly require MyAccounts authentication; the initial anonymous asset-check helper was unsuitable for the protected proxy. Native loopback asset hashes were verified without extracting browser sessions or changing access. Owner-browser sign-in and personal journey import remain unverified. A Windows Firewall prompt and sign-in screen require user action under computer-use guidance. The secondary PC's independently submitted repair is still unverified and its tunnel is offline; do not resubmit it while maintenance may be active. Resume by restoring supported secondary access, reconciling its installed manager and transaction, selecting Commute through normal Updates if absent, and importing the prepared journey privately on both accounts. No physical-phone or reboot verification is claimed.

Secondary subsequently reconnected: direct health check confirms 36 existing services running, no failures, and no Commute service. Its installed manager and repair receipt still require authenticated Updates inspection. The Windows permission overlay and sign-in screen remain the immediate blocker. Do not infer manager version or retry repair from service health alone.

## Bus timetables implemented locally — 6 November 2026
The user requested implementation after learning that only live arrivals were used. Added an authenticated bus timetable endpoint using TfL's per-line/exact-boarding-stop timetable, with a 15-minute cache. It returns every published day pattern, known departure and descriptive frequency window. Route-interval destinations are retained. Frontend Live now has Arrivals and Bus timetables views, selectable published day patterns, and compact hourly departure groups. Only selected journey routes/stops are fetched, not all London data.

Automatic scheduled fallback resolves ordinary unambiguous weekday patterns for today/tomorrow within 24 hours. The server checks the public GOV.UK England/Wales bank-holiday calendar, cached six hours with serialized requests. Bank holidays, unknown calendar years, unavailable calendar data, ambiguous patterns and school-term labels disable automatic selection for the affected day; manual browsing remains available. DST skipped/repeated wall times are excluded. Frequency windows never synthesize departures. Fresh live arrivals suppress timetable duplicates through the route's prediction horizon; cancellations cannot be resurrected. Scheduled rows expire after 15 minutes and are labelled not live, with a Plan for hero and explicit estimates for onward arrival/platform wait. Existing saved ride durations remain estimates; no train timetable fallback was added.

Verification: UI/TypeScript build, 14 engine tests, native Go tests and vet passed. Two new native browser scenarios passed against real TfL route24/GOV.UK and synthetic outage/live replacement/day selection at320–1440px; all eight existing native browser scenarios passed against the new executable. A test originally referenced the nonexistent Today button; corrected to Journey and reran successfully. The AUI compiler needs a semantic wrapper around an If whose only child is For; fixed source and regenerated. Native tests used isolated synthetic NTFS accounts; all test workers exited and fixture roots were removed. No owner data or credentials were used. Evidence: docs/evidence/bus-timetables.json; reviewed phone screenshot is explicitly synthetic.

Changes are uncommitted and unreleased. No source version bump, public asset replacement, channel change or owner update occurred for this implementation. Existing installed preview.1 still lacks this feature. Before managed delivery, prepare a new immutable app version and verified app metadata/pin, exercise normal app update/recovery, publish/promote through supported paths, then verify each authorized target separately. Previous secondary/browser-access and personal-import follow-ups remain pending; do not infer completion from local tests. No physical-phone or reboot verification is claimed.

## Timetable publication and installation authorized
The user explicitly requested push, release and install. Prepared preview.2 with the unchanged native-commute-v1 contract/minimum manager116. Exact release executable SHA25638d0a8f1e10af10aea9590e9a074f9431c80d68df5864292c3a7c8bce33f2156 passed all10 browser scenarios. Managed metadata is generated by scripts/prepare-managed-update.py through the canonical suite adapter, validating all47 ZIP members and package ownership. Publication, channel, app-only update/recovery acceptance and each target receipt are still pending at this source commit. Primary is now Workspace120 with Commute1; secondary authenticated Updates is accessible, reports Workspace117 and a completed prior update. Preserve current managers and unrelated apps. No new Workspace suite release is required for this unchanged app contract; any future suite release still requires the signed-Android entry point.

## Release2 public and primary installed
Immutable [preview.2](https://github.com/oneworkspacestudio/my-commute/releases/tag/v0.1.0-preview.2) is public from77315a62f3ec7438d7912b3a7b09e895828a9fe9. All9 assets/digests and the anonymously downloaded ZIP verified; Actions disabled. ZIP SHA2563ddecff6c95efe2c6ac2fe1f027afee85e045369b245530357cc9e5ea7fcbbb1. The exact47-payload package passed synthetic managed fresh1, update1→2, rollback2→1 and reapply2 with saved journeys/preferences, MyAccounts identity and Accounts/manager retained. Initial test-harness control/login mistakes were corrected in a clean successful run, not counted as product failures. Both failed and successful synthetic installations were stopped and safely removed.

The normal public-pin organization build/audit and all870 package hashes passed for42 apps. Its explicitly local QA manager was neither published nor installed. The public Commute pin and channel are promoted. The publisher's first-page limit omitted an old release during the initial promotion; pagination plus2 regression cases restored all279 pre-promotion rows, with withholding preserved. Corrected public raw channel and normal anonymous120 update selection verified all47 Commute2 payloads. Existing release assets/tags remained unchanged.

Primary completed the normal public Commute-only update at18:12 UTC. Manager120 and every unselected app/package, identity/credentials, locations and logical Commute journey/preferences/provider rows were preserved. All47 installed hashes and native served JS/CSS/SVG match the accepted release. All41 services healthy; transaction/cleanup complete and verified recovery retained. Receipts: docs/evidence/primary-managed-installation2.json and timetable-release2-*.json. Owner-browser verification/personal import still needs primary MyAccounts sign-in; no auth credentials were extracted.

Secondary remains pending. Its117 controller required the newer installer before app choices, so normal protected repair was submitted once around17:56 UTC. Download and verification completed; the last reported stage was stopping apps for backup. At18:17 UTC its public portal still returns530 and has not reconnected. Do not repeat repair or assume a completed120 upgrade from stale UI. Asked the user whether its local updater is working or showing an error; await that context or server reconnection, then inspect the terminal receipt/version and install Commute2 normally. Chrome extension browser access is working, secondary Updates is authenticated; a remote-desktop view supplied no current installer status. Personal journey setup remains pending on both; preserve any existing owner journeys and use the protected prepared import outside Git. No physical-phone/reboot claim.

## Journey builder revision, 10 November 2026

My Commute now builds one leg at a time, with Bus or Train first, followed by the boarding point, services, alighting stop and review. Each travel direction supports moving saved draft legs up or down. Road-side boarding stops retain their TfL stop letters or towards labels. One searchable multi-select lists bus numbers and termini. A shared alighting stop must be downstream on each selected service. Persisted branch metadata filters live and scheduled candidates and lets the planner apply the selected service's ride duration.

TfL timetable intervals provide ride times. Verified ordered TfL route sequences supply labelled stop-spacing estimates when published timing intervals are unavailable. My Maps currently exposes only car routing. National Rail uses Darwin calling-point times with a configured token and valid station codes. Manual overrides are under Time options. Older legs retain their stored filters and duration and need no data migration.

The UI build, all 15 frontend tests, Go tests and vet, and all 11 Playwright scenarios passed on a fresh native build with isolated synthetic NTFS accounts. Provider-backed scenarios covered outbound and return Tube construction and multi-select bus routes 24 and 29, a shared alighting stop, automatic duration and persisted bus-before-Tube ordering at 320px. Darwin duration was verified using synthetic provider XML. No owner credentials, journey data or machine installations were used.

The builder changes are local and unreleased. The existing preview.2 publication, manager channel and installations were not changed by this task.

## Journey builder preview.3 published

The follow-up authorized release. Source `5b301343def4d71bb99f02b30ac8dca818c15ef1` was pushed and published as [My Commute preview.3](https://github.com/oneworkspacestudio/my-commute/releases/tag/v0.1.0-preview.3). All nine release assets and the anonymous ZIP were verified. ZIP SHA256 `fcb63a06f4d1e3e5661897f8c483d636bc1316a4ecf61ed30fb336de6dfbeae2`. Executable SHA256 `12ce5727957861a08a95c77fef9a075025d758da41037f107b9542dda2820a0a`. The existing manager capability and minimum version remain native-commute-v1 and preview.116.

All 11 browser scenarios passed against the release executable. Synthetic managed upgrade from preview.2, rollback and reapply preserved journeys, preferences, MyAccounts and manager bytes. The public-pin organization rebuild and checksums passed for 43 apps and 918 payloads. Workspace commit `febedef` promotes only the Commute pin and release entry, preserving 286 prior channel rows. The public preview.122 installer anonymously found the update with 47 total payloads and five changed members. The first plan assertion incorrectly expected all 47 to be downloaded. The corrected check compared unchanged entries to the installed synthetic baseline. The real public update then applied successfully and verified every installed payload, service health, and the completed recovery receipt. Both isolated fixtures were stopped and cleaned. Actions remain disabled. This release was not installed on either owner PC.

## Home and Work origins and mobile journey progress

The journey editor has optional Home and Work starting points for each saved
journey. A user can save a device location or use an approximate postcode point
from the authenticated, fixed-host Postcodes.io lookup. Only the selected
coordinates and source are saved. The planner uses the starting points for
direction inference and as the first-walk fallback behind fresh nearby GPS.
Older journeys retain the first-stop direction heuristic and stored walk times.

The mobile Journey screen groups the next two departures with a compact
overview of every leg. Boarding advances the live focus and estimates the
next connection from the current time, stored ride time, transfer walk and
boarding buffer. Earlier legs stay visible. Undo and restart apply to
the open page. No background tracking or server-side trip progress was added.

Build, 17 frontend tests, Go tests and vet, and all 12 native browser scenarios
passed. The tests used isolated synthetic NTFS accounts and covered postcode
and GPS origins, saved state after reload, the two departures, transfer timing,
and undo. The changes are local and unreleased.

The preview.4 release follow-up also redesigned the bus timetable. Full
departure times are shown in compact rows under one heading per destination,
and frequency windows have a separate section. The TfL feed, timetable
fallback rules, and day selection semantics are unchanged.

## My Commute preview.4 published

Source `abd275f3444bf0e2b4c7c2a76168423504cdca6a` shipped as
[preview.4](https://github.com/oneworkspacestudio/my-commute/releases/tag/v0.1.0-preview.4).
Verified all nine assets and the anonymous ZIP. ZIP SHA256
`76c151ebebc9657c2c3b94ec32c43631f309625235a4700a100cc7747ab55a7b`.
All 12 native browser scenarios passed on the exact package. The revised
timetable was also visually reviewed at 390 px with synthetic data.

The ordinary public-pin rebuild verified 43 apps and 918 payloads. Workspace
commit `084681f` promoted the Commute pin and channel while preserving 287
earlier entries. The public preview.122 installer performed a synthetic
preview.3-to-preview.4 upgrade, rollback, and anonymous public reapply.
The journey and preferences, MyAccounts and manager were preserved.
All 47 installed Commute payloads, health and the recovery receipt matched.
Synthetic fixtures were stopped and removed. No owner installation occurred.

## Reverse To work into Going home

The journey editor can build an editable Going home draft in reverse leg
order. TfL lookup checks return boarding points, line direction, branches,
and alighting points, including opposite-side bus stops and shared stops
for alternative routes. It reuses the regular journey builder's route and
ride calculation. National Rail swaps station codes and uses an outward
estimate when return timing is unavailable. Transfer walks use the outward
interchange estimates in reverse order.

Unresolved matches keep their place and open the existing leg editor with
a boarding search prefilled. An existing return is replaced in the draft
only after confirmation. Saving applies the draft to the account. The
change is local and unreleased.

The build, Go tests, 17 frontend tests, and all 13 browser scenarios passed.
Coverage includes a live TfL Tube reversal and a synthetic bus-and-Tube
reversal with a confirmed opposite-side boarding stop, an unresolved leg,
and cancellation preserving the saved return. Layout and reorder tests use
fixed provider fixtures. Test data used isolated synthetic NTFS accounts.
