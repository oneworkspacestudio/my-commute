# My Commute

A personal London journey companion for buses, the Underground, Overground,
Elizabeth line, DLR and National Rail. Save your journeys to work and home,
see the next service you can realistically catch, and know how long you are
likely to wait at your next platform.

- Live TfL stop search, arrivals and network status, refreshed every 30 seconds while open.
- Separate outward and return journeys, with up to eight legs in each direction.
- Alternative bus routes or Underground lines on the same platform; choose the first catchable accepted service.
- Import a prepared private journey, review both directions, and explicitly save it to your account.
- Location-assisted direction suggestions and approximate walking time, requested on demand.
- Connection planning includes walking, ride duration, interchange and a boarding buffer.
- Full boards retain earlier services, cancellation information and unknown departures.
- Private account storage, shared MyAccounts sign-in, and desktop/phone layouts.
- Optional Darwin departure boards, with server-side provider credentials.

The initial Highbury–Oxford Circus route is labelled as an example. Its TfL
arrivals are real; its walking and ride durations are illustrative. Replace it
with your own journey in Saved. Ride and interchange durations are adjustable
estimates, not live traffic measurements. The app only recommends a connection
when a fresh prediction exists; it does not invent later trains or guarantees.

## Run locally

Build the UI with `npm ci && npm run build`, then run
`go run ./cmd/my-commute --data C:/YourPrivateNTFS/MyCommute --no-browser`.
Use an empty dedicated private-data folder. Open the one-time setup URL printed
by the executable, create a local preview account and save your journey.
Local preview accounts work only on loopback. Managed installations use
MyAccounts, the `/commute` route and the normal Workspace launcher.

The packaged executable includes its UI and needs no Node runtime. Its default
private data location is the user's application-data directory, outside the
replaceable executable directory. `--data`, `--listen`, `--origin`, `--backup`
and `--restore` follow the shared apphost contract.

In Preferences, owners can save a TfL API key or National Rail Darwin token.
Credentials are sent only to the app's same-origin API and stored in protected
server-side private data. Empty fields preserve existing keys. Environment
defaults `TFL_APP_KEY` and `NATIONAL_RAIL_TOKEN` are also supported.

## Build and verification

Node 26, Go 1.27.3. `npm test` checks connection decisions; `go test ./...`
checks validation and the rail adapter. `npm run build` compiles AUI sources,
checks TypeScript and packages the UI. `npx playwright test` exercises the native
Windows server with an isolated synthetic account and actual TfL calls.

UI source lives in `web/src/screens/Dashboard.aui`; regenerate rather than
editing `web/src/generated`. See [data sources](docs/DATA-SOURCES.md),
[security](docs/SECURITY.md) and [acceptance status](docs/ACCEPTANCE.md).

Managed installation requires One Workspace 0.3.0-preview.116 or later.
Select My Commute in Workspace apps, then save your outward and return journeys.
See the acceptance report for verified paths and current limitations.
