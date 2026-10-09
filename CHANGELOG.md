# Changelog

Notable changes to Parenthèse. Dates are in YYYY-MM-DD format.

## 1.0.2 (2026-10-09)

### Self-hosting

- Docker images for the API and the front end are published on GitHub's registry, for amd64 and arm64: `ghcr.io/iliesallali/parenthese-api` and `ghcr.io/iliesallali/parenthese-web`. `docker-compose.yml` and `.env` are enough, no clone needed. `PARENTHESE_VERSION` in `.env` pins a version (`latest` follows main). Each publication is tested by an install in an empty folder with those two files only.
- Creating a tree works on an instance served over plain HTTP on a local network. The browser only offers `crypto.randomUUID` over HTTPS or on localhost, and the sharing password now falls back to `crypto.getRandomValues` (#44, fixed in #45 by @coutadeurf).

### Security

- fast-jwt 6.3.4: its verifier cache could accept an expired token that has no `iat` claim.
- Build tools only, nothing that runs in the browser or on the server: source-map-js 1.2.2 and postcss-selector-parser 7.1.6 (CPU exhaustion on crafted input).

### Dependencies

- Landing on Vite 8 and @vitejs/plugin-react 6, with the same target browsers as before, like the app.
- Minor and patch updates (lucide, posthog-js, ESLint, PostCSS).

## 1.0.1 (2026-10-01)

Security release, from an independent review of 1.0.0.

### Security

- A crafted video file could block the whole API for hours (the location-scrubbing pattern ran in quadratic time). It now runs in linear time.
- Account sessions issued before 2026-10-01 are no longer accepted, so every user signs in again once. Until 1.0.0, a session could end up in photo annotations and in server logs. `SESSIONS_NOT_BEFORE` moves this date without rotating `JWT_SECRET`.
- In a contribution, the "before" state shown to the owner now comes from the database, not from the contributor. A relative could previously label a deletion with another person's name.
- Deleting a person through an approved contribution now removes their unions, links, memories and portrait, exactly like the owner's own deletion. Their files are erased from disk on both paths.
- Sharing-password attempts are counted before the check, so a burst of parallel requests can no longer go past the per-tree limit. Password checks run one at a time, so password guessing cannot saturate the API.
- Changing the sharing password and linking an account now run in a single transaction, and an unlock started just before the change can no longer keep access.
- The storage quota counts the actual disk usage of a tree, portraits and annotation photos included. An account can own at most 10 trees.
- Size limits: request bodies are capped at 1 MB outside upload routes; contributions, annotations (number per tree, batch size, style size) and GEDCOM imports (lines, links, one import at a time) are bounded.
- GIF files are re-encoded, which bounds their size and strips their metadata.
- Old annotation contributions no longer return a stored image address.
- The server refuses to start with a published example `JWT_SECRET` when `NODE_ENV` is not set.

### Deployment and self-hosting

- Production deploys the exact commit the CI validated, never an older one, and stops if the SSH host key is not pinned.
- nginx: `X-Forwarded-For` is set to the connecting address instead of being appended to; the version is hidden; the production access log drops query strings, which carried media tokens.
- The PostHog script no longer loads anything from PostHog's servers, and the dashboard can no longer turn on click, heatmap or error capture. The CSP now names the two PostHog hosts instead of `*.posthog.com`.
- `deploy/backup.sh` no longer uploads unencrypted backups unless `BACKUP_ALLOW_PLAINTEXT=1` is set.

Correction to 1.0.0: not every fix listed there came with an automated test.

## 1.0.0 (2026-09-30)

First public release. The code has been public since 2026-09-14; this version marks the app as ready to self-host.

### The family tree

- One tree per family, laid out automatically, explored like a map (drag, zoom, search by name).
- A profile for each person: dates and places, occupation, notes, family links.
- Memories on each person: photos, videos (file or YouTube link), audio recordings, quotes, documents, GPS tracks.
- Free annotations on the tree: drawings, stickers, text, photos.
- GEDCOM import and export.

### Sharing with the family

- One link and one sharing password per tree. Relatives look around without an account and suggest additions.
- A welcome screen and a guided flow for relatives who arrive through the link, with a step-by-step guide on parenthese.io.
- Reviewed contributions: the owner applies the family's changes right away or reviews each one.
- A visit log for the owner.

### Interface

- English and French. The app follows the browser's language, with a switch in the app; `?lang=en` or `?lang=fr` forces one.
- Demo tree with a fictional family and real, freely licensed photos (see `frontend/public/demo/CREDITS.md`).

### Self-hosting and data

- `docker compose up` runs the database, the API and the web front end; the CI builds and tests this setup on every push.
- Users can delete a tree or their account from the app; media files are erased with them.
- No analytics on a self-hosted instance unless a PostHog key is provided at build time.

### Security and privacy

Reviewed before release; every fix below comes with a test.

- Uploaded files are identified by their content, not by the type the browser declares. Only real images, audio, video, PDF, Word, text, GeoJSON and GPX files are accepted, and every file is served with `nosniff` and a sandboxed Content-Security-Policy.
- Photos are re-encoded without their metadata (GPS location, device, date taken); the phone's rotation is applied to the pixels. Location data is also removed from phone videos.
- Image addresses carry a short-lived, read-only media token instead of the account session.
- Tree annotations are only readable by people who can open the tree.
- Password attempts are limited per client and per tree. The API only trusts the address set by its own reverse proxy (`TRUST_PROXY`).
- Changing a tree's sharing password closes every session opened with the old one, including those linked to an account.
- Deleted or rejected media are erased from disk; a per-tree storage quota applies.
- GEDCOM import and export are hardened against oversized or malformed files.
- The web server sends HSTS and a Content-Security-Policy. Fonts are served by the app itself, with no call to Google.
- Analytics (only when a PostHog key is set) never include the tree's address, and session recording is off.

### License

- [PolyForm Noncommercial 1.0.0](LICENSE): free to read, modify and self-host for non-commercial use.
