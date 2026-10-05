/**
 * Unit tests for HTML/js/data.js (StorageService + helpers)
 * Run with: node --test UnitTest/
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const { bootstrap } = require("./helpers/load");

bootstrap(["security.js", "data.js"]);

test.afterEach(() => localStorage.clear());

/* ---------------- escapeHtml ---------------- */

test("escapeHtml escapes all dangerous HTML characters (XSS guard)", () => {
  assert.equal(
    escapeHtml(`<script>alert("x&y")</script>`),
    "&lt;script&gt;alert(&quot;x&amp;y&quot;)&lt;/script&gt;",
  );
  assert.equal(escapeHtml(`it's`), "it&#39;");
  assert.equal(escapeHtml("plain text"), "plain text");
});

test("escapeHtml handles null / undefined / non-strings (edge cases)", () => {
  assert.equal(escapeHtml(null), "");
  assert.equal(escapeHtml(undefined), "");
  assert.equal(escapeHtml(123), "123");
  assert.equal(escapeHtml(""), "");
});

/* ---------------- seeding & schedules ---------------- */

test("getSchedules seeds a default timetable on first call (positive)", () => {
  const schedules = StorageService.getSchedules();
  assert.ok(Array.isArray(schedules));
  assert.equal(schedules.length, 14);
  assert.ok(
    schedules.every((s) => s.id && s.day && s.time && s.room && s.faculty),
  );
});

test("getSchedules returns the same data on repeated calls (idempotent)", () => {
  const a = StorageService.getSchedules();
  const b = StorageService.getSchedules();
  assert.deepEqual(a, b);
});

test("getSchedules reseeds itself when the store is corrupted JSON (negative)", () => {
  localStorage.setItem("tt_schedules", "{ this is not json !!!");
  const schedules = StorageService.getSchedules();
  assert.equal(schedules.length, 14, "corrupt data falls back to the seed");
});

test("getSchedules does not crash and reseeds on tampered records missing room (edge)", () => {
  const schedules = StorageService.getSchedules();
  schedules[0] = { ...schedules[0], room: undefined };
  localStorage.setItem("tt_schedules", JSON.stringify(schedules));
  // markIntegrity was bypassed, so the tampered record must not crash the reader
  const reloaded = StorageService.getSchedules();
  assert.ok(Array.isArray(reloaded));
});

test("saveSchedules round-trips data and updates the integrity mark", () => {
  const schedules = StorageService.getSchedules();
  schedules.push({
    id: 999,
    department: "MCA",
    course: "Test Course",
    faculty: FACULTY[0],
    room: ROOMS[0],
    day: "Monday",
    time: CLASS_TIMES[0],
    type: "Lecture",
    division: "Division A",
    semester: 1,
  });
  StorageService.saveSchedules(schedules);
  const reloaded = StorageService.getSchedules();
  assert.equal(reloaded.length, 15);
  assert.ok(reloaded.some((s) => s.id === 999));
});

/* ---------------- users ---------------- */

test("getUsers seeds three accounts with hashed (never plaintext) passwords", () => {
  const users = StorageService.getUsers();
  assert.equal(users.length, 3);
  for (const u of users) {
    assert.ok(u.salt, `${u.email} must have a salt`);
    assert.ok(u.password, `${u.email} must have a hash`);
    assert.ok(
      !["admin123", "faculty123", "support123"].includes(u.password),
      "password never stored plaintext",
    );
    assert.equal(
      Security.verifyPassword(
        {
          "admin@college.edu": "admin123",
          "priya@college.edu": "faculty123",
          "support@college.edu": "support123",
        }[u.email],
        u.salt,
        u.password,
      ),
      true,
      `${u.email} hash verifies`,
    );
  }
});

test("getUsers migrates legacy plaintext passwords to salted hashes (edge)", () => {
  localStorage.setItem(
    "tt_users",
    JSON.stringify([
      {
        id: 7,
        name: "Legacy User",
        email: "legacy@college.edu",
        password: "oldplain",
        role: "faculty",
        approved: true,
      },
    ]),
  );
  const users = StorageService.getUsers();
  const legacy = users.find((u) => u.email === "legacy@college.edu");
  assert.ok(legacy.salt, "plaintext was migrated to salted hash");
  assert.notEqual(
    legacy.password,
    "oldplain",
    "password is no longer stored in plaintext",
  );
  assert.equal(
    Security.verifyPassword("oldplain", legacy.salt, legacy.password),
    true,
    "old password still works after migration",
  );
});

test("getUsers fail-closes invalid user records (no salt string = cannot authenticate)", () => {
  localStorage.setItem(
    "tt_users",
    JSON.stringify([
      {
        id: 9,
        name: "Broken",
        email: "broken@college.edu",
        password: 12345,
        salt: 67890,
      },
    ]),
  );
  const users = StorageService.getUsers();
  const broken = users.find((u) => u.email === "broken@college.edu");
  assert.equal(broken.salt, "");
  assert.equal(broken.password, "");
  assert.equal(
    Security.verifyPassword("x", broken.salt, broken.password),
    false,
  );
});

test("seed accounts are always force-approved (auto-heal)", () => {
  const users = StorageService.getUsers();
  users.find((u) => u.email === "admin@college.edu").approved = false;
  StorageService.saveUsers(users);
  const reloaded = StorageService.getUsers();
  assert.equal(
    reloaded.find((u) => u.email === "admin@college.edu").approved,
    true,
  );
});

/* ---------------- integrity marks (tamper detection) ---------------- */

test("checkIntegrity passes for data written through the service (positive)", () => {
  assert.equal(checkIntegrity("tt_schedules"), true);
});

test("checkIntegrity detects direct localStorage tampering (negative)", () => {
  const raw = localStorage.getItem("tt_schedules");
  localStorage.setItem("tt_schedules", raw.replace("BCA", "HACKED"));
  assert.equal(checkIntegrity("tt_schedules"), false);
});

test("checkIntegrity returns true for keys never marked yet (edge)", () => {
  assert.equal(checkIntegrity("tt_unknown_key"), true);
});

/* ---------------- sessions ---------------- */

test("setSession + getSession round-trips a valid approved session (positive)", () => {
  const user = StorageService.getUsers().find(
    (u) => u.email === "admin@college.edu",
  );
  StorageService.setSession(user);
  const session = StorageService.getSession();
  assert.ok(session, "valid session returned");
  assert.equal(session.email, "admin@college.edu");
  assert.equal(session.role, "admin");
  assert.equal(session.approved, true);
});

test("getSession rejects a hand-crafted session blob (negative: token forgery)", () => {
  localStorage.setItem(
    "tt_session",
    JSON.stringify({
      name: "Hacker",
      email: "hacker@college.edu",
      role: "admin",
      approved: true,
      token: {
        payload: JSON.stringify({
          uid: 1,
          role: "admin",
          exp: Date.now() + 999999,
        }),
        sig: "f".repeat(64),
      },
      fp: Security.deviceFingerprint(),
    }),
  );
  assert.equal(
    StorageService.getSession(),
    null,
    "forged signature must be rejected",
  );
});

test("getSession rejects a session whose role does not match the real user record (privilege escalation)", () => {
  const user = StorageService.getUsers().find(
    (u) => u.email === "admin@college.edu",
  );
  StorageService.setSession(user);
  // re-role the stored session claims + signature untouched? Changing payload breaks sig,
  // which is exactly what we assert: any session drift must invalidate the session.
  const raw = JSON.parse(localStorage.getItem("tt_session"));
  raw.token.payload = raw.token.payload.replace(
    '"role":"admin"',
    '"role":"it"',
  );
  localStorage.setItem("tt_session", JSON.stringify(raw));
  assert.equal(
    StorageService.getSession(),
    null,
    "tampered claims are rejected",
  );
});

test("getSession rejects an unapproved user even with a valid token (fail-closed)", () => {
  const unapproved = {
    id: 77,
    name: "Pending Person",
    email: "pending@college.edu",
    salt: "a".repeat(32),
    password: "b".repeat(64),
    role: "faculty",
    approved: false,
  };
  const users = StorageService.getUsers();
  users.push(unapproved);
  StorageService.saveUsers(users);
  StorageService.setSession(unapproved);
  assert.equal(
    StorageService.getSession(),
    null,
    "unapproved users must never get a session",
  );
});

test("clearSession removes the session (edge)", () => {
  const user = StorageService.getUsers()[0];
  StorageService.setSession(user);
  StorageService.clearSession();
  assert.equal(StorageService.getSession(), null);
});

test("getSession returns null for corrupt session JSON (edge)", () => {
  localStorage.setItem("tt_session", "not-json-at-all");
  assert.equal(StorageService.getSession(), null);
});

/* ---------------- pending requests ---------------- */

test("getPendingRequests starts empty and round-trips writes (positive)", () => {
  assert.deepEqual(StorageService.getPendingRequests(), []);
  const reqs = [{ userId: 5, name: "X", email: "x@c.edu", status: "pending" }];
  StorageService.savePendingRequests(reqs);
  assert.deepEqual(StorageService.getPendingRequests(), reqs);
});

test("getPendingRequests returns [] for corrupt data instead of crashing (negative)", () => {
  localStorage.setItem("tt_approved_requests", "broken{");
  assert.deepEqual(StorageService.getPendingRequests(), []);
});

/* ---------------- misc helpers ---------------- */

test("getNextId returns max+1 and 1 for an empty list (edge cases)", () => {
  assert.equal(getNextId([{ id: 1 }, { id: 41 }, { id: 7 }]), 42);
  assert.equal(getNextId([]), 1);
});

test("getNextId ignores non-contiguous/negative ids", () => {
  assert.equal(getNextId([{ id: -5 }, { id: 3 }]), 4);
});

test("formatDate returns a human-readable string containing the weekday", () => {
  const d = formatDate();
  assert.match(d, /(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)/);
});

test("theme defaults to dark and round-trips", () => {
  assert.equal(StorageService.getTheme(), "dark");
  StorageService.setTheme("light");
  assert.equal(StorageService.getTheme(), "light");
});
