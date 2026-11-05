# Security and private storage

Uses One Workspace apphost OIDC state/nonce/PKCE, issuer/subject identity,
owner binding, expiry/logout, same-origin and CSRF enforcement, CSP and
protected NTFS private-data validation. No blanket public API allowlist.
The application listens only on loopback; remote access belongs to the managed
Workspace HTTPS proxy. Geolocation is an explicit apphost capability and still
requires a browser gesture/permission.

Journeys are in the private apphost SQLite database, keyed by authenticated user
ID. Provider settings are owner-only and never returned to clients. Raw provider
credentials are stored in that protected database, not browser storage or program
files; shared encrypted backups include the database. Do not publish or share
private data. Provider tokens can be supplied by environment instead. This is
filesystem protection, not a separate per-field encryption claim.

Location remains in page memory and never goes to the server; only public stop
IDs are sent to TfL. API requests do not include an owner address, GPS coordinate,
email or journey name. Stop searches and CRS station pairs necessarily go to the
relevant provider. Transport text is rendered as text, never trusted HTML.
Fixed upstream hosts, no redirects, strict stop/CRS IDs, bounded responses and
timeouts avoid a general outbound proxy. No analytics or CDN assets.

Local preview setup/login is inherited apphost functionality restricted to
loopback and disabled by managed OIDC. It does not bypass managed sign-in.
Synthetic tests never use owner accounts, files or installed services.

Journey imports are bounded to 128 KB in the browser, decoded into typed server
fields and validated before preview. Importing does not change saved data; the
user must review and save. Imports receive new journey/leg IDs, avoiding overwrite.
Personal route files should remain outside source and shared packages.
