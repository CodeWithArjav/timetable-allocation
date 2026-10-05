/**
 * Browser-environment stubs so the unmodified browser scripts
 * (security.js, data.js, auth.js, chat.js, schedule.js, app.js)
 * can be loaded and executed inside Node.
 *
 * Each test file runs in its own process (node --test), so globals
 * installed here never leak between test files.
 */

function createLocalStorage() {
  const map = new Map();
  return {
    getItem: (k) => (map.has(String(k)) ? map.get(String(k)) : null),
    setItem: (k, v) => map.set(String(k), String(v)),
    removeItem: (k) => map.delete(String(k)),
    clear: () => map.clear(),
    key: (i) => [...map.keys()][i] ?? null,
    get length() {
      return map.size;
    },
  };
}

function createDocumentStub() {
  const listeners = new Map();
  const doc = {
    readyState: "complete", // forces the "run now" branch in page scripts
    getElementById: () => null,
    querySelector: () => null,
    querySelectorAll: () => [],
    addEventListener: (type, fn) => {
      if (!listeners.has(type)) listeners.set(type, []);
      listeners.get(type).push(fn);
    },
    removeEventListener: () => {},
    createElement: (tag) => ({
      tagName: String(tag).toUpperCase(),
      className: "",
      id: "",
      innerHTML: "",
      style: {},
      classList: { add() {}, remove() {}, contains: () => false, toggle() {} },
      appendChild() {},
      remove() {},
      addEventListener() {},
      set textContent(v) {
        this._tc = String(v);
      },
      get textContent() {
        return this._tc || "";
      },
    }),
    documentElement: {
      setAttribute() {},
      getAttribute: () => null,
    },
    body: {
      appendChild() {},
      insertAdjacentHTML() {},
      style: {},
    },
  };
  // expose dispatch helper for tests that need to fire DOMContentLoaded
  doc.__fire = (type) => {
    (listeners.get(type) || []).forEach((fn) => fn());
  };
  return doc;
}

function installStubs() {
  const localStorage = createLocalStorage();

  const window = {
    crypto: require("crypto").webcrypto, // real getRandomValues
    location: { href: "http://localhost/index.html", pathname: "/index.html" },
    setTimeout,
    clearTimeout,
  };

  const document = createDocumentStub();
  // Tests register fake DOM nodes per id in document.__elements; anything
  // unregistered returns null from getElementById.
  document.__elements = {};
  document.getElementById = (id) =>
    Object.prototype.hasOwnProperty.call(document.__elements, id)
      ? document.__elements[id]
      : null;

  const navigator = {
    userAgent: "Node-Test-Agent/1.0",
    language: "en-US",
  };

  const screen = { width: 1920, height: 1080 };

  Object.assign(globalThis, {
    window,
    document,
    localStorage,
    navigator,
    screen,
    location: window.location,
    confirm: () => true,
    alert: () => {},
  });

  return { localStorage, window, document };
}

module.exports = { installStubs, createLocalStorage };
