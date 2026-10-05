# Unit Tests — College Timetable Allocation System

Comprehensive unit tests for `HTML/js/*`, written with **Node's built-in test
runner (`node:test`)** — **zero dependencies**, no install step required.

## Running

Requires **Node.js ≥ 18** (uses the built-in `node:test` runner and `crypto.webcrypto`).

```powershell
cd UnitTest
npm test          # runs everything:  node --test .
```

Or directly, for one file:

```powershell
node --test .\security.test.js
```

> Note: Node.js was not installed on this machine at the time the suite was
> written, so the suite could not be executed locally here. Install Node 18+
> and run `npm test` inside `UnitTest/`.

## How it works

The production scripts are plain browser scripts (no ES modules, they expect
`window`, `document`, `localStorage`…). Instead of modifying them, the harness
(`helpers/`) re-creates a minimal browser environment in Node and evaluates the
**real, unmodified source files** with `vm.runInThisContext` — exactly like a
`<script>` tag would:

- `helpers/stubs.js` — in-memory `localStorage`, a document stub
  (`readyState: 'complete'`, so page self-init guards take the "no content
  node" branch), `window.crypto` backed by Node's real WebCrypto, `navigator`,
  `screen`, `confirm`.
- `helpers/load.js` — `bootstrap([files])` installs the stubs and loads the
  given scripts (default `security.js` + `data.js`) into the global scope.

Each test file is run by `node --test` **in its own process**, so globals and
localStorage never leak between suites. `test.afterEach` / `test.beforeEach`
clear storage for intra-file isolation.

## Suites

| File                 | Covers                                                                                                                                                                                                                                                                                                                                                                      |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `security.test.js`   | SHA-256 **verified against Node's real crypto** (incl. multi-block + UTF-8), salt uniqueness, password verify (positive/negative/fail-closed), session token sign/verify/tamper/forgery/refresh, device fingerprint                                                                                                                                                         |
| `data.test.js`       | `escapeHtml` XSS escaping, seeding, corrupt-storage recovery, **plaintext→hash migration**, fail-closed invalid user records, **integrity/tamper detection**, session round-trip, forged sessions, unapproved-user fail-closed, pending requests, `getNextId`, themes                                                                                                       |
| `auth.test.js`       | `isValidEmail` (valid/invalid/edge), persistent brute-force lockout state machine (threshold, escalation, persistence across "reload", expiry, reset, corrupt storage)                                                                                                                                                                                                      |
| `chat.test.js`       | Day/time/room/faculty/department **NLP extractors** (positive, negative, substring-alias traps like `IMCA` vs `MCA`), regressions for the previously fixed bugs (fabricated time slots, lowercase faculty echo, unknown departments), full `processQuery` routing + fallback                                                                                                |
| `schedule.test.js`   | Room & faculty double-booking detection, no-false-positives (different time/day), `getConflictReasons`/`getConflictMessages`, `findFreeRoom` (incl. fully-booked edge, edit-exclusion edge)                                                                                                                                                                                 |
| `app.test.js`        | Theme toggle & persistence, toast creation + XSS escaping, user badges (session & guest fallback), profile modal rendering (incl. no-session guard), modal open/close, **auth guard routing**: redirect for unauthenticated on protected pages, faculty bounced from admin-only pages, unapproved-user session wipe, admin allowed, public pages untouched                  |
| `it-support.test.js` | Pending-requests rendering (empty state, per-row, XSS escaping), user counts, **approve / reject / revoke** flows (+ unknown-id no-ops), missing-pending-row edge, `registerFacultyByIT` with hashed password (regression for the plaintext-password bug), incomplete-input rejection, duplicate-account prevention, documented "seed accounts are force-re-approved" quirk |

## Testing notes / gotchas encoded in the tests

1. **Reseed guard:** `StorageService.getSchedules()` silently reseeds whenever a
   stored schedule references a faculty name not on the `FACULTY` roster.
   All fixtures therefore use roster names — this behaviour is itself pinned by
   the tamper tests in `data.test.js`.
2. **Day names are matched after lowercase** (the query pipeline lowercases
   first), so tests exercise lowercase input, matching production flow.
3. Time slots are full-day blocks (`CLASS_TIMES`); the chat extractor must only
   ever return values from that list (regression-tested).
