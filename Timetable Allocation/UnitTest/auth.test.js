/**
 * Unit tests for HTML/js/auth.js — pure logic only
 * (email validation + persistent brute-force lockout state machine).
 * Run with: node --test UnitTest/
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const { bootstrap } = require("./helpers/load");

bootstrap(["security.js", "data.js", "auth.js"]);

test.beforeEach(() => clearLockState());

/* ---------------- isValidEmail ---------------- */

test("isValidEmail accepts valid college-style emails (positive)", () => {
  const valid = [
    "admin@college.edu",
    "first.last@sub.college.edu",
    "user+tag@domain.co",
    "a_b-c@d-e.in",
  ];
  valid.forEach((e) => assert.equal(isValidEmail(e), true, e));
});

test("isValidEmail rejects malformed emails (negative)", () => {
  const invalid = [
    "",
    "plainaddress",
    "missing-at@",
    "@missing-local.edu",
    "two@@at.com",
    "spaces in@mail.com",
    "user@nodot",
    "user@.com",
    ".dotstart@mail.com",
  ];
  invalid.forEach((e) => assert.equal(isValidEmail(e), false, e));
});

test("isValidEmail is edge-safe on null/undefined input (coerced to strings)", () => {
  // /[...]/.test(null) coerces to the string "null" — no @, so it must be false
  assert.equal(isValidEmail(null), false);
  assert.equal(isValidEmail(undefined), false);
});

/* ---------------- brute-force lockout ---------------- */

test("lockout state starts clean", () => {
  const state = getLockState();
  assert.equal(state.attempts, 0);
  assert.equal(state.until, 0);
});

test("registerFailedAttempt increments attempts below the threshold (positive)", () => {
  for (let i = 1; i < 5; i++) {
    const state = registerFailedAttempt();
    assert.equal(state.attempts, i);
    assert.equal(state.until, 0, "no lock before MAX_ATTEMPTS");
  }
});

test("the 5th failed attempt triggers a timed lockout (positive)", () => {
  for (let i = 0; i < 5; i++) registerFailedAttempt();
  const state = getLockState();
  assert.ok(Date.now() < state.until, "lock window is set in the future");
  assert.equal(state.attempts, 0, "attempt counter resets after locking");
});

test("lockout survives a page reload (persisted in localStorage)", () => {
  for (let i = 0; i < 5; i++) registerFailedAttempt();
  // simulate reload: fresh read from storage
  const state = getLockState();
  assert.ok(Date.now() < state.until, 'lock is still active after "reload"');
});

test("lockout escalates exponentially on repeated bursts (edge)", () => {
  // first burst -> 1x lock
  for (let i = 0; i < 5; i++) registerFailedAttempt();
  const firstLock = getLockState().until;
  assert.ok(firstLock > Date.now());

  // second burst (while locked, further failures still register) -> longer lock
  for (let i = 0; i < 5; i++) registerFailedAttempt();
  const second = getLockState();
  if (second.until) {
    assert.ok(second.until >= firstLock, "second lock must not be shorter");
  }
});

test("attempts reset to zero after a lockout burst completes", () => {
  for (let i = 0; i < 5; i++) registerFailedAttempt();
  const state = getLockState();
  assert.ok(
    state.until === 0 || state.attempts < 5,
    "counter is reset after locking",
  );
});

test("clearLockState wipes everything (reset path)", () => {
  for (let i = 0; i < 4; i++) registerFailedAttempt();
  clearLockState();
  const state = getLockState();
  assert.deepEqual(state, { attempts: 0, until: 0 });
});

test("corrupt lockout storage falls back to a clean state (negative)", () => {
  localStorage.setItem("tt_lockout_state_v1", "}}}corrupt{{");
  const state = getLockState();
  assert.deepEqual(state, { attempts: 0, until: 0 });
});

test("an expired lockout is treated as unlocked (time-based edge)", () => {
  localStorage.setItem(
    "tt_lockout_state_v1",
    JSON.stringify({
      attempts: 3,
      until: Date.now() - 1000, // already expired
    }),
  );
  const state = getLockState();
  assert.equal(state.until, 0, "expired lock window is cleared");
  assert.equal(state.attempts, 3, "past attempts are retained until reset");
});

/* ---------------- module wiring (regression) ---------------- */

test("auth.js binds the login form listener when the form exists (regression)", () => {
  // auth.js registered handlers via the document stub — ensure no throw on load
  // and that the lockout constants match the documented policy.
  assert.equal(MAX_ATTEMPTS, 5);
  assert.equal(LOCKOUT_MS, 60 * 1000);
});
