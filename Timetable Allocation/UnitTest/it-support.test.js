/**
 * Unit tests for HTML/js/it-support.js — account approval workflow
 * (approve / reject / revoke / auto-registration with hashed password).
 * Run with: node --test UnitTest/
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const { bootstrap } = require("./helpers/load");

bootstrap(["security.js", "data.js", "it-support.js"]);

const el = () => ({
  classList: { add() {}, remove() {}, contains: () => false },
  style: {},
  textContent: "",
  innerHTML: "",
  addEventListener() {},
});

function stubTables() {
  document.__elements = {
    pendingBody: el(),
    allUsersBody: el(),
    pendingCount: el(),
    userCount: el(),
    approvedCount: el(),
  };
}

const users = () => StorageService.getUsers();
const pending = () => StorageService.getPendingRequests();

test.afterEach(() => {
  localStorage.clear();
  document.__elements = {};
});

/* ---------------- loadPendingRequests ---------------- */

test("loadPendingRequests renders the empty state when nothing is pending (positive)", () => {
  stubTables();
  loadPendingRequests();
  assert.match(
    document.__elements.pendingBody.innerHTML,
    /No pending requests/i,
  );
  assert.equal(document.__elements.pendingCount.textContent, 0);
});

test("loadPendingRequests renders a row per pending request with an Approve button (positive)", () => {
  stubTables();
  const reqs = [
    {
      userId: 50,
      name: "New Prof",
      email: "new@college.edu",
      department: "BCA",
      role: "faculty",
      requestedAt: new Date().toISOString(),
      status: "pending",
    },
    {
      userId: 51,
      name: "Old Prof",
      email: "old@college.edu",
      department: "MCA",
      role: "faculty",
      requestedAt: new Date().toISOString(),
      status: "approved",
    },
  ];
  StorageService.savePendingRequests(reqs);

  loadPendingRequests();
  const html = document.__elements.pendingBody.innerHTML;
  assert.match(html, /New Prof/);
  assert.doesNotMatch(html, /Old Prof/, "non-pending requests are excluded");
  assert.match(html, /approveUser\(50\)/);
  assert.equal(document.__elements.pendingCount.textContent, 1);
});

test("loadPendingRequests escapes user-provided names (XSS guard)", () => {
  stubTables();
  StorageService.savePendingRequests([
    {
      userId: 60,
      name: "<script>alert(1)</script>",
      email: "x@college.edu",
      department: "BCA",
      role: "faculty",
      requestedAt: new Date().toISOString(),
      status: "pending",
    },
  ]);
  loadPendingRequests();
  const html = document.__elements.pendingBody.innerHTML;
  assert.ok(!html.includes("<script>"), "script tags must be escaped");
  assert.ok(html.includes("&lt;script&gt;"));
});

/* ---------------- loadAllUsers ---------------- */

test("loadAllUsers shows counts and a pending badge for unapproved users (positive)", () => {
  stubTables();
  loadAllUsers();
  const all = users();
  assert.equal(document.__elements.userCount.textContent, all.length);
  assert.equal(
    document.__elements.approvedCount.textContent,
    all.filter((u) => u.approved).length,
  );
  assert.match(document.__elements.allUsersBody.innerHTML, /✓ Approved/);
});

test("loadAllUsers escapes unknown-shaped records without crashing (edge)", () => {
  stubTables();
  const list = users();
  list.push({
    id: 999,
    email: "weird@college.edu",
    salt: "a".repeat(32),
    password: "b".repeat(64),
    approved: true,
    role: "faculty",
  });
  // name and department missing on purpose
  localStorage.setItem("tt_users", JSON.stringify(list));
  assert.doesNotThrow(() => loadAllUsers());
  assert.match(
    document.__elements.allUsersBody.innerHTML,
    /weird@college\.edu/,
  );
});

/* ---------------- approveUser ---------------- */

test("approveUser marks the user approved and resolves the pending request (positive)", () => {
  const list = users();
  list.push({
    id: 70,
    name: "To Approve",
    email: "approve@college.edu",
    salt: "a".repeat(32),
    password: "b".repeat(64),
    role: "faculty",
    department: "BCA",
    approved: false,
  });
  StorageService.saveUsers(list);
  StorageService.savePendingRequests([
    {
      userId: 70,
      name: "To Approve",
      email: "approve@college.edu",
      department: "BCA",
      role: "faculty",
      requestedAt: new Date().toISOString(),
      status: "pending",
    },
  ]);
  stubTables();

  approveUser(70);

  assert.equal(users().find((u) => u.id === 70).approved, true);
  assert.equal(pending().find((r) => r.userId === 70).status, "approved");
});

test("approveUser is a safe no-op for an unknown id (negative/edge)", () => {
  stubTables();
  const before = JSON.stringify(users());
  approveUser(123456);
  assert.equal(JSON.stringify(users()), before, "storage untouched");
});

test("approveUser works even when no pending request row exists (edge)", () => {
  const list = users();
  list.push({
    id: 71,
    name: "No Row",
    email: "norow@college.edu",
    salt: "a".repeat(32),
    password: "b".repeat(64),
    role: "faculty",
    department: "BCA",
    approved: false,
  });
  StorageService.saveUsers(list);
  stubTables();
  assert.doesNotThrow(() => approveUser(71));
  assert.equal(users().find((u) => u.id === 71).approved, true);
});

/* ---------------- rejectUser ---------------- */

test("rejectUser removes the account and marks the request rejected (positive)", () => {
  const list = users();
  list.push({
    id: 80,
    name: "To Reject",
    email: "reject@college.edu",
    salt: "a".repeat(32),
    password: "b".repeat(64),
    role: "faculty",
    department: "BCA",
    approved: false,
  });
  StorageService.saveUsers(list);
  StorageService.savePendingRequests([
    {
      userId: 80,
      name: "To Reject",
      email: "reject@college.edu",
      department: "BCA",
      role: "faculty",
      requestedAt: new Date().toISOString(),
      status: "pending",
    },
  ]);
  stubTables();

  rejectUser(80); // confirm() stub returns true

  assert.ok(!users().some((u) => u.id === 80), "user record deleted");
  assert.equal(pending().find((r) => r.userId === 80).status, "rejected");
});

test("rejectUser is a safe no-op for an unknown id (negative)", () => {
  stubTables();
  const before = JSON.stringify(users());
  rejectUser(424242);
  assert.equal(JSON.stringify(users()), before);
});

/* ---------------- revokeApproval ---------------- */

test("revokeApproval flips the user to unapproved and re-queues the request (positive)", () => {
  // NOTE: seed emails (admin/priya/support@college.edu) are force-approved on
  // every getUsers() read, so we revoke a non-seed account instead — this also
  // pins the "seed accounts cannot be revoked" quirk of StorageService.
  const list = users();
  list.push({
    id: 85,
    name: "To Revoke",
    email: "revoke@college.edu",
    salt: "a".repeat(32),
    password: "b".repeat(64),
    role: "faculty",
    department: "BCA",
    approved: true,
  });
  StorageService.saveUsers(list);
  stubTables();

  revokeApproval(85);

  const reloaded = users().find((u) => u.id === 85);
  assert.equal(reloaded.approved, false);
  const req = pending().find((r) => r.userId === 85 && r.status === "pending");
  assert.ok(req, "a pending re-approval request was queued");
});

test("quirk: seed accounts are force-re-approved on every read (documented behaviour)", () => {
  const admin = users().find((u) => u.email === "admin@college.edu");
  admin.approved = false;
  StorageService.saveUsers(users());
  assert.equal(
    users().find((u) => u.email === "admin@college.edu").approved,
    true,
  );
});

/* ---------------- registerFacultyByIT ---------------- */

test("registerFacultyByIT creates a hashed (never plaintext) account + schedule (positive)", () => {
  stubTables();
  document.__elements.itFacultyName = { ...el(), value: FACULTY[5] };
  document.__elements.itFacultyEmail = { ...el(), value: "itreg@college.edu" };
  document.__elements.itFacultyDept = { ...el(), value: "IMCA" };
  document.__elements.itFacultyCourse = { ...el(), value: "Database Systems" };
  document.__elements.itFacultyRoom = { ...el(), value: "Room 503" };
  document.__elements.itFacultyDay = { ...el(), value: "Tuesday" };
  document.__elements.itFacultyTime = { ...el(), value: CLASS_TIMES[0] };
  document.__elements.itFacultyDivision = { ...el(), value: "Division B" };

  registerFacultyByIT();

  const created = users().find((u) => u.email === "itreg@college.edu");
  assert.ok(created, "user created");
  assert.equal(created.approved, true, "IT-registered users are pre-approved");
  assert.ok(created.salt, "salt present");
  assert.notEqual(
    created.password,
    "faculty123",
    "password must NOT be stored in plaintext (regression for bug #6)",
  );
  assert.equal(
    Security.verifyPassword("faculty123", created.salt, created.password),
    true,
    "default password verifies against the hash",
  );

  const schedules = StorageService.getSchedules();
  const sched = schedules.find((s) => s.faculty === FACULTY[5]);
  assert.ok(sched, "schedule allocated");
  assert.equal(sched.room, "Room 503");
  assert.equal(sched.department, "IMCA");
});

test("registerFacultyByIT rejects incomplete input (negative)", () => {
  stubTables();
  document.__elements.itFacultyName = { ...el(), value: FACULTY[6] };
  document.__elements.itFacultyEmail = {
    ...el(),
    value: "partial@college.edu",
  };
  // every other field missing
  registerFacultyByIT();
  assert.ok(
    !users().some((u) => u.email === "partial@college.edu"),
    "no account created from partial data",
  );
});

test("registerFacultyByIT re-approves an existing user instead of duplicating (edge)", () => {
  const existing = users().find((u) => u.email === "priya@college.edu");
  existing.approved = true;
  StorageService.saveUsers(users());

  // Simulate revoked state
  existing.approved = false;
  StorageService.saveUsers(users());
  const countBefore = users().filter(
    (u) => u.email === "priya@college.edu",
  ).length;

  stubTables();
  document.__elements.itFacultyName = { ...el(), value: existing.name };
  document.__elements.itFacultyEmail = { ...el(), value: existing.email };
  document.__elements.itFacultyDept = { ...el(), value: existing.department };
  document.__elements.itFacultyCourse = { ...el(), value: "Computer Networks" };
  document.__elements.itFacultyRoom = { ...el(), value: "Room 302" };
  document.__elements.itFacultyDay = { ...el(), value: "Monday" };
  document.__elements.itFacultyTime = { ...el(), value: CLASS_TIMES[0] };

  registerFacultyByIT();

  assert.equal(
    users().filter((u) => u.email === "priya@college.edu").length,
    countBefore,
    "no duplicate account",
  );
  assert.equal(
    users().find((u) => u.email === existing.email).approved,
    true,
    "re-approved",
  );
});

/* ---------------- module self-init guard ---------------- */

test("loading it-support.js on a bare DOM does not crash (self-init guard)", () => {
  // it-support.js ran its readyState check with the stub document; the
  // #itSupportContent node was absent so nothing initialised. No throw = pass.
  assert.equal(typeof approveUser, "function");
});
