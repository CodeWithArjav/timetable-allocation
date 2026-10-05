/**
 * Unit tests for HTML/js/security.js
 * Run with: node --test UnitTest/
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const nodeCrypto = require("crypto");
const { bootstrap } = require("./helpers/load");

bootstrap(); // security.js exposes `Security` as a global

/* ---------------- SHA-256 (verified against Node's crypto) ---------------- */

test('sha256 matches the real SHA-256 for a known vector ("abc")', () => {
  assert.equal(
    Security._sha256("abc"),
    "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
  );
});

test("sha256 matches the real SHA-256 for the empty string", () => {
  assert.equal(
    Security._sha256(""),
    nodeCrypto.createHash("sha256").update("").digest("hex"),
  );
});

test("sha256 matches the real SHA-256 for arbitrary strings (property check)", () => {
  const samples = [
    "hello world",
    "admin123",
    "a".repeat(1000), // multi-block message
    "pwd\\salt\\123",
    "null-byte\\u0000inside",
  ];
  for (const s of samples) {
    const expected = nodeCrypto.createHash("sha256").update(s).digest("hex");
    assert.equal(
      Security._sha256(s),
      expected,
      `mismatch for: ${s.slice(0, 20)}`,
    );
  }
});

test("sha256 handles multi-byte UTF-8 characters correctly", () => {
  const expected = nodeCrypto
    .createHash("sha256")
    .update("héllo 🎓 π")
    .digest("hex");
  assert.equal(Security._sha256("héllo 🎓 π"), expected);
});

test("sha256 is deterministic and collision-free for different inputs", () => {
  const a = Security._sha256("input1");
  const b = Security._sha256("input2");
  assert.equal(a, Security._sha256("input1"), "deterministic");
  assert.notEqual(a, b, "different inputs must not collide");
  assert.equal(a.length, 64, "output is 64 hex chars");
});

/* ---------------- password hashing & verification ---------------- */

test("hashPassword generates a random salt and a 64-char hex hash", () => {
  const { salt, hash } = Security.hashPassword("admin123");
  assert.match(salt, /^[0-9a-f]{32}$/);
  assert.match(hash, /^[0-9a-f]{64}$/);
});

test("hashPassword never returns the plaintext password", () => {
  const { hash } = Security.hashPassword("admin123");
  assert.notEqual(hash, "admin123");
  assert.ok(!hash.includes("admin123"));
});

test("hashPassword produces unique salts for identical passwords (positive)", () => {
  const a = Security.hashPassword("same-password");
  const b = Security.hashPassword("same-password");
  assert.notEqual(a.salt, b.salt, "salts must differ");
  assert.notEqual(a.hash, b.hash, "hashes must differ due to salting");
});

test("verifyPassword accepts the correct password (positive)", () => {
  const { salt, hash } = Security.hashPassword("S3cure!pass");
  assert.equal(Security.verifyPassword("S3cure!pass", salt, hash), true);
});

test("verifyPassword rejects wrong passwords (negative)", () => {
  const { salt, hash } = Security.hashPassword("S3cure!pass");
  assert.equal(Security.verifyPassword("S3cure!pasS", salt, hash), false);
  assert.equal(Security.verifyPassword("S3cure!pass ", salt, hash), false);
  assert.equal(Security.verifyPassword("", salt, hash), false);
});

test("verifyPassword rejects a hash produced from a different salt", () => {
  const a = Security.hashPassword("admin123");
  const b = Security.hashPassword("admin123");
  assert.equal(Security.verifyPassword("admin123", a.salt, b.hash), false);
});

test("verifyPassword fail-closes on missing/invalid arguments (edge cases)", () => {
  const { salt, hash } = Security.hashPassword("x");
  assert.equal(Security.verifyPassword("x", null, hash), false);
  assert.equal(Security.verifyPassword("x", salt, null), false);
  assert.equal(Security.verifyPassword("x", undefined, undefined), false);
});

test("verifyPassword handles unicode passwords", () => {
  const { salt, hash } = Security.hashPassword("пароль🎓123");
  assert.equal(Security.verifyPassword("пароль🎓123", salt, hash), true);
  assert.equal(Security.verifyPassword("пароль123", salt, hash), false);
});

test("key stretching: password hash depends on the round count (not trivially reversible)", () => {
  const { salt, hash } = Security.hashPassword("p@ss");
  assert.notEqual(hash, Security._sha256("tt.v1$" + salt + "$" + "p@ss"));
});

/* ---------------- random hex ---------------- */

test("randomHex returns the requested number of hex bytes", () => {
  assert.match(Security.randomHex(16), /^[0-9a-f]{32}$/);
  assert.match(Security.randomHex(32), /^[0-9a-f]{64}$/);
});

test("randomHex produces different output on each call", () => {
  assert.notEqual(Security.randomHex(32), Security.randomHex(32));
});

/* ---------------- session tokens ---------------- */

const user = { id: 1, role: "faculty" };

test("createSessionToken + verifySessionToken round-trips a valid token (positive)", () => {
  const token = Security.createSessionToken(user);
  const claims = Security.verifySessionToken(token);
  assert.ok(claims, "token should verify");
  assert.equal(claims.uid, 1);
  assert.equal(claims.role, "faculty");
  assert.ok(claims.exp > Date.now(), "expiry is in the future");
});

test("verifySessionToken rejects a tampered payload (negative: forgery)", () => {
  const token = Security.createSessionToken(user);
  const forged = {
    payload: JSON.stringify({
      uid: 42,
      role: "admin",
      exp: Date.now() + 999999,
    }),
    sig: token.sig,
  };
  assert.equal(
    Security.verifySessionToken(forged),
    null,
    "signature must not match",
  );
});

test("verifySessionToken rejects a forged signature", () => {
  const token = Security.createSessionToken(user);
  const forged = { payload: token.payload, sig: "0".repeat(64) };
  assert.equal(Security.verifySessionToken(forged), null);
});

test("verifySessionToken rejects malformed/missing tokens (edge cases)", () => {
  assert.equal(Security.verifySessionToken(null), null);
  assert.equal(Security.verifySessionToken(undefined), null);
  assert.equal(Security.verifySessionToken({}), null);
  assert.equal(Security.verifySessionToken({ payload: "x" }), null);
  assert.equal(Security.verifySessionToken({ sig: "x" }), null);
  assert.equal(
    Security.verifySessionToken({ payload: "not-json", sig: "x" }),
    null,
  );
});

test("refreshSessionToken extends expiry and produces a valid token", () => {
  const token = Security.createSessionToken(user);
  const renewed = Security.refreshSessionToken(token);
  assert.ok(renewed, "refresh returns a token");
  const claims = Security.verifySessionToken(renewed);
  assert.ok(claims, "renewed token verifies");
  const original = Security.verifySessionToken(token);
  assert.ok(claims.exp >= original.exp, "expiry never shrinks on refresh");
});

test("refreshSessionToken returns null for garbage input (edge case)", () => {
  assert.equal(Security.refreshSessionToken(null), null);
  assert.equal(Security.refreshSessionToken({ payload: "{{" }), null);
});

/* ---------------- device fingerprint ---------------- */

test("deviceFingerprint is stable and 32 chars long", () => {
  const fp1 = Security.deviceFingerprint();
  const fp2 = Security.deviceFingerprint();
  assert.equal(fp1, fp2, "fingerprint is deterministic within one environment");
  assert.equal(fp1.length, 32);
  assert.match(fp1, /^[0-9a-f]{32}$/);
});

/* ---------------- constants ---------------- */

test("exports sane security constants", () => {
  assert.equal(Security.SESSION_TTL_MS, 30 * 60 * 1000);
  assert.ok(
    Security.PBKDF_ROUNDS >= 1000,
    "key stretching must use many rounds",
  );
});
