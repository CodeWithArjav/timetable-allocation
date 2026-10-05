/**
 * Unit tests for HTML/js/app.js — shared UI layer
 * (theme, toasts, user badges, profile modal, modal system, auth guard).
 * Run with: node --test UnitTest/
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const { bootstrap } = require("./helpers/load");

bootstrap(["security.js", "data.js", "app.js"]);

const el = (props = {}) => ({
  classList: {
    _added: null,
    add(c) {
      this._added = c;
    },
    remove() {},
    contains: () => false,
    toggle() {},
  },
  style: {},
  textContent: "",
  innerHTML: "",
  title: "",
  addEventListener() {},
  appendChild() {},
  ...props,
});

// Replaces global setTimeout with a synchronous executor so redirect timers
// in initAuthGuard fire immediately and can be asserted synchronously.
function withSyncTimers(fn) {
  const real = globalThis.setTimeout;
  globalThis.setTimeout = (job) => job();
  try {
    fn();
  } finally {
    globalThis.setTimeout = real;
  }
}

test.afterEach(() => localStorage.clear());

/* ---------------- initTheme / toggleTheme ---------------- */

test("theme defaults to dark when nothing is stored (positive)", () => {
  initTheme();
  assert.equal(StorageService.getTheme(), "dark");
});

test("toggleTheme flips dark<->light and persists (positive)", () => {
  document.documentElement.setAttribute("data-theme", "dark");
  toggleTheme();
  assert.equal(StorageService.getTheme(), "light");
  toggleTheme();
  assert.equal(StorageService.getTheme(), "dark");
});

test("toggleTheme handles a missing stored value (edge: first visit)", () => {
  document.documentElement.getAttribute = () => null;
  toggleTheme(); // treated as "dark" -> flips to light
  assert.equal(StorageService.getTheme(), "light");
  delete document.documentElement.getAttribute;
});

/* ---------------- showToast ---------------- */

test("showToast creates a container on demand and appends a toast (positive)", () => {
  // stub container discovery
  const realQ = document.querySelector;
  const realCreate = document.createElement;
  let container = null;
  document.querySelector = (sel) =>
    sel === ".toast-container" ? container : realQ(sel);
  document.createElement = (() => {
    const original = document.createElement;
    return (tag) => {
      const node = original(tag);
      if (tag === "div" && !container) {
        container = {
          className: "",
          appendChild: (child) => (container._last = child),
          _last: null,
          ...node,
        };
      }
      return node;
    };
  })();

  showToast("hello", "success");
  assert.ok(container, "container auto-created");
  assert.ok(container._last, "toast appended");
  assert.equal(container._last.className, "toast success");

  document.querySelector = realQ;
  document.createElement = realCreate;
});

test("showToast escapes HTML in messages (XSS guard)", () => {
  let captured = "";
  const realCreate = document.createElement;
  let container;
  document.querySelector = (sel) =>
    sel === ".toast-container" ? container : null;
  document.createElement = (tag) => {
    const node = realCreate(tag);
    node.appendChild = (child) => (captured = child.innerHTML);
    return node;
  };
  showToast("<img src=x onerror=alert(1)>", "error");
  assert.ok(!captured.includes("<img"), "raw HTML must not pass through");
  assert.ok(captured.includes("&lt;img"));
  document.createElement = realCreate;
});

/* ---------------- updateUserBadges ---------------- */

test("updateUserBadges fills name/role/initials from the session (positive)", () => {
  const user = StorageService.getUsers().find(
    (u) => u.email === "admin@college.edu",
  );
  StorageService.setSession(user);

  const nameEl = el();
  const roleEl = el();
  const avatarEl = el();
  const initialsEl = el();
  const realQSA = document.querySelectorAll;
  document.querySelectorAll = (sel) => {
    if (sel === ".user-name, .welcome-user, .u-name") return [nameEl];
    if (sel === ".u-role") return [roleEl];
    if (sel === ".avatar, .user-avatar") return [avatarEl];
    if (sel === ".avatar-initials") return [initialsEl];
    return [];
  };

  updateUserBadges();
  assert.equal(nameEl.textContent, user.name);
  assert.match(roleEl.textContent, /ADMIN/);
  assert.ok(roleEl.textContent.includes(user.department));
  assert.equal(avatarEl.textContent, "PR", 'initials of "Prof. Rinku Patil"');
  assert.equal(initialsEl.textContent, "PR");
  document.querySelectorAll = realQSA;
});

test("updateUserBadges falls back to guest state without a session (negative)", () => {
  localStorage.clear();
  const nameEl = el();
  const roleEl = el();
  const realQSA = document.querySelectorAll;
  document.querySelectorAll = (sel) => {
    if (sel === ".user-name, .welcome-user, .u-name") return [nameEl];
    if (sel === ".u-role") return [roleEl];
    return [];
  };
  updateUserBadges();
  assert.equal(nameEl.textContent, "Guest");
  assert.match(roleEl.textContent, /NOT LOGGED IN/);
  document.querySelectorAll = realQSA;
});

/* ---------------- openUserProfileModal ---------------- */

test("openUserProfileModal never renders without a session (negative)", () => {
  localStorage.clear();
  // must not throw; returns silently
  openUserProfileModal();
});

test("openUserProfileModal counts assigned classes (positive)", () => {
  const user = StorageService.getUsers().find(
    (u) => u.email === "admin@college.edu",
  );
  StorageService.setSession(user);
  const schedules = StorageService.getSchedules();

  const fields = {};
  [
    "profileInitials",
    "profileName",
    "profileRoleBadge",
    "profileEmail",
    "profileDept",
    "profileStatus",
    "profileClasses",
  ].forEach((id) => (fields[id] = el()));
  Object.assign(document.__elements, fields);

  const expected = schedules.filter(
    (s) => s.department === user.department,
  ).length;

  openUserProfileModal();
  assert.equal(fields.profileEmail.textContent, user.email);
  assert.equal(fields.profileDept.textContent, user.department);
  assert.match(fields.profileClasses.textContent, new RegExp(`${expected}`));
  assert.match(fields.profileRoleBadge.textContent, /ADMIN/i);
  assert.ok(fields.profileInitials.textContent.length > 0);
});

/* ---------------- openModal / closeModal ---------------- */

test("openModal adds the show class and locks scroll (positive)", () => {
  const modal = el();
  document.__elements["m1"] = modal;
  openModal("m1");
  assert.equal(modal.classList._added, true, "show class added");
  assert.equal(document.body.style.overflow, "hidden");
  closeModal("m1");
});

test("openModal is a no-op for an unknown id (edge)", () => {
  assert.doesNotThrow(() => openModal("does-not-exist"));
  assert.equal(document.body.style.overflow, "");
});

/* ---------------- initToasts / initSidebar / initTop---------------- */

test("initToasts creates the container when absent (positive)", () => {
  const created = [];
  const realCreate = document.createElement;
  document.createElement = (tag) => {
    const n = realCreate(tag);
    n.className = "";
    created.push(n);
    return n;
  };
  initToasts();
  assert.equal(created.length, 1);
  assert.equal(created[0].className, "toast-container");
  document.createElement = realCreate;
});

test("initSidebar/initTopbar/initBrandHeaderLink are safe on bare DOM (negative)", () => {
  assert.doesNotThrow(() => initSidebar());
  assert.doesNotThrow(() => initTopbar());
  assert.doesNotThrow(() => initBrandHeaderLink());
  assert.doesNotThrow(() => initUserProfileModal());
});

/* ---------------- initAuthGuard (routing rules) ---------------- */

test("auth guard: REDIRECT fires (sync timers) for protected page without session (negative)", () => {
  localStorage.clear();
  const origLocation = globalThis.window.location;
  globalThis.window.location = { href: "x", pathname: "/dashboard.html" };
  globalThis.location = globalThis.window.location;

  withSyncTimers(() => initAuthGuard());
  assert.match(
    globalThis.window.location.href,
    /index\.html/,
    "unauthenticated user is redirected to login",
  );

  globalThis.window.location = origLocation;
  globalThis.location = origLocation;
});

test("auth guard: REDIRECT fires (sync timers) - faculty bounced from admin-only page (negative)", () => {
  const faculty = StorageService.getUsers().find(
    (u) => u.email === "priya@college.edu",
  );
  StorageService.setSession(faculty);
  const origLocation = globalThis.window.location;
  globalThis.window.location = { href: "x", pathname: "/it-support.html" };
  globalThis.location = globalThis.window.location;

  withSyncTimers(() => initAuthGuard());
  assert.match(
    globalThis.window.location.href,
    /dashboard\.html/,
    "faculty is bounced to dashboard",
  );

  globalThis.window.location = origLocation;
  globalThis.location = origLocation;
});

test("auth guard: unapproved user on protected page loses session (negative)", () => {
  const unapproved = {
    id: 55,
    name: "Pending P",
    email: "pending2@college.edu",
    salt: "a".repeat(32),
    password: "b".repeat(64),
    role: "faculty",
    approved: false,
  };
  const users = StorageService.getUsers();
  users.push(unapproved);
  StorageService.saveUsers(users);
  StorageService.setSession(unapproved);

  const origLocation = globalThis.window.location;
  globalThis.window.location = { href: "x", pathname: "/chat.html" };
  globalThis.location = globalThis.window.location;

  withSyncTimers(() => initAuthGuard());
  assert.equal(
    StorageService.getSession(),
    null,
    "session cleared for unapproved user",
  );
  assert.match(globalThis.window.location.href, /index\.html/);
  globalThis.window.location = origLocation;
  globalThis.location = origLocation;
});

test("auth guard: approved user is allowed on protected pages (positive)", () => {
  const user = StorageService.getUsers().find(
    (u) => u.email === "admin@college.edu",
  );
  StorageService.setSession(user);
  const origLocation = globalThis.window.location;
  globalThis.window.location = { href: "keep", pathname: "/dashboard.html" };
  globalThis.location = globalThis.window.location;

  withSyncTimers(() => initAuthGuard());
  assert.equal(
    globalThis.window.location.href,
    "keep",
    "no redirect for an approved session",
  );
  globalThis.window.location = origLocation;
  globalThis.location = origLocation;
});

test("auth guard: admin may open the admin-only page (positive)", () => {
  const user = StorageService.getUsers().find(
    (u) => u.email === "admin@college.edu",
  );
  StorageService.setSession(user);
  const origLocation = globalThis.window.location;
  globalThis.window.location = { href: "keep", pathname: "/it-support.html" };
  globalThis.location = globalThis.window.location;

  withSyncTimers(() => initAuthGuard());
  assert.equal(globalThis.window.location.href, "keep", "admin keeps access");
  globalThis.window.location = origLocation;
  globalThis.location = origLocation;
});

test("auth guard: public pages never redirect (positive)", () => {
  const origLocation = globalThis.window.location;
  globalThis.window.location = { href: "keep", pathname: "/index.html" };
  globalThis.location = globalThis.window.location;

  initAuthGuard();

  assert.equal(
    globalThis.window.location.href,
    "keep",
    "no redirect on public page",
  );
  globalThis.window.location = origLocation;
  globalThis.location = origLocation;
});
