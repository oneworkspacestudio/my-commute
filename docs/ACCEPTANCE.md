# Acceptance status

Local candidate: My Commute 0.1.0-preview.1, 5 November 2026.

Source includes TfL live integration, optional Darwin adapter, journey CRUD,
connection calculations, location suggestions and responsive AUI interface.
Verification is complete for this local candidate: eight browser scenarios,
native Go tests and vet, and the full isolated managed lifecycle passed. Do not interpret screenshots of a synthetic account as owner
installation or physical-phone testing.

Managed identity: `commute`, route `/commute`, optional General app, executable
`MyCommute.exe`, canonical loopback port 9040, managed port base +50, private
`${DATA}/commute`, health `/healthz`, MyAccounts dependency and exact callback
`/commute/auth/callback`. No sidecar or external runtime. Every program/document
payload belongs to the `commute-` package namespace. App-only recovery and
Workspace shared navigation/sign-out are registered. Installer integration 9
prevents older controllers silently applying an unknown app contract.

The ordinary organization builder accepts `-MyCommuteCandidate` for isolated
acceptance. Public builds must use a verified `myCommute` organization lock pin;
none is fabricated. Candidate publication guards remain in force. Publishing a
suite still requires the signed-Android release entry point and disabled Actions.

No public release, channel promotion, owner-PC installation, physical Android/iOS,
clean-host reboot, credentialed Darwin feed or production certification is claimed.

## Final local evidence

`docs/evidence/` records the actual final results. Eight browser scenarios cover
live TfL, responsive layouts, both-direction saving, GPS denial/inference,
provider outages, account isolation and CSRF, bus-to-Tube connections, private
journey import with alternative Underground services, and a native process
restart preserving saved data. Tests use synthetic isolated NTFS accounts.

The managed candidate passed fresh opt-in, fresh restart, fresh opt-out,
upgrade from preview.113 with explicit app selection, MyAccounts SSO/shared
navigation, anonymous denial, app-only update and rollback. Saved journeys,
preferences, account identity and unrelated Accounts program bytes were retained.
The complete bundle contains 38 apps and 498 checksum-verified packages,
including 47 My Commute entries.

The ordinary builder completed the verified catalogue and bundle. Temporary
disk exhaustion interrupted its last linker invocation; that identical build
step was resumed on the larger task drive, followed by the normal catalogue
audit and full bundle hash validation. This is recorded in managed-build.json.

Earlier candidates are superseded. Managed testing found and fixed a migration
restart bug; the final binary applies only pending migrations and rejects future
schemas. No owner data or installation was used as a test fixture.

## Bus timetable preview.2 acceptance — 6 November 2026

Source now adds full-day bus timetable browsing and scheduled fallback. These
checks describe release preparation. The earlier installation receipt describes
preview.1 before this feature; publication and target-PC delivery are recorded
separately in repository history after verification.

Verification of the updated native build:

- UI compilation and TypeScript production build passed.
- 14 connection/timetable calculation tests passed.
- Native Go tests passed, including timetable parsing, exact road-side matching,
  calendar ambiguity, midnight, London DST, request validation and cache reuse.
- `go vet ./...` passed.
- Two new native browser scenarios passed: authenticated real TfL timetable and
  GOV.UK calendar integration; synthetic outage fallback, live replacement, day
  selection and 320–1440px layout checks.
- All eight existing native browser scenarios passed against the updated build,
  including account isolation, CSRF, saved state/restart, GPS and interchanges.
- The timetable phone screenshot was reviewed; it uses an explicitly synthetic journey.

Evidence is in `docs/evidence/bus-timetables.json`. Synthetic NTFS test accounts
and data were removed after the app processes exited. Owner installations,
personal journey imports and credentials were not used as test fixtures.

## Release2 publication and primary delivery

The immutable preview.2 release and public channel are verified. Exact package
acceptance covers normal app-only1→2 update, rollback to1 and reapply2 with saved
journeys and preferences retained. The full public-pin catalogue contains42 apps
and870 hash-verified packages; its QA-only manager was not deployed.

The primary PC completed its normal public app-only update on6 November2026,
retaining Workspace120 and all unrelated apps/data, with47 installed payload
hashes, exact served UI,41 healthy services and verified recovery retained.
The secondary PC's required Workspace repair is still pending reconnection;
no Commute2 installation is claimed there. See the separate release and target
receipts in `docs/evidence/` and repository history for the precise resume point.
