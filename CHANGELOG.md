# Changelog

Notable changes to Parenthèse. Dates are in YYYY-MM-DD format.

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
