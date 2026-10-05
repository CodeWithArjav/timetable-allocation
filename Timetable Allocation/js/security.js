/* ============================================================
   Security module — password hashing, salting, session tokens,
   CSRF-style state tokens and integrity helpers.
   Loaded BEFORE data.js and auth.js on every page.
   ============================================================ */

const Security = (() => {
  'use strict';

  /* ---------- Pure-JS SHA-256 (synchronous, no server needed) ---------- */
  const K = [];
  (function initK() {
    let h = 0x6a09e667, l = 0xbb67ae85; // primes via fractional sqrt generator
    const frac = (x, n) => Math.floor((x % 1) * Math.pow(2, 32));
    const primes = [];
    let num = 2;
    while (primes.length < 64) {
      if (isPrime(num)) primes.push(num);
      num++;
    }
    function isPrime(n) {
      for (let i = 2; i * i <= n; i++) if (n % i === 0) return false;
      return true;
    }
    for (let i = 0; i < 64; i++) {
      const c = Math.cbrt(primes[i]);
      K[i] = Math.floor((c - Math.floor(c)) * Math.pow(2, 32));
    }
    void h; void l; void frac;
  })();

  function rotr(x, n) { return (x >>> n) | (x << (32 - n)); }

  function sha256(ascii) {
    const maxWord = Math.pow(2, 32);
    let result = '';
    const words = [];
    const asciiBitLength = ascii.length * 8;

    let hash = [];
    for (let i = 0; i < 8; i++) {
      const c = Math.sqrt(i + 314159);
      hash[i] = Math.floor((c - Math.floor(c)) * maxWord);
    }
    // standard initial hash values
    hash = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];

    let k = 0, w = [];
    for (let i = 0; i < ascii.length; i++) {
      const code = ascii.charCodeAt(i);
      if (code < 128) {
        w[k >> 2] = w[k >> 2] || 0;
        w[k >> 2] |= code << (24 - (k % 4) * 8);
        k++;
      } else {
        // UTF-8 encode multi-byte chars
        const bytes = unescape(encodeURIComponent(ascii[i]));
        for (const b of bytes) {
          w[k >> 2] = w[k >> 2] || 0;
          w[k >> 2] |= b.charCodeAt(0) << (24 - (k % 4) * 8);
          k++;
        }
      }
    }

    w[k >> 2] = w[k >> 2] || 0;
    w[k >> 2] |= 0x80 << (24 - (k % 4) * 8);
    const bitsLen = w.length;
    w[(((k + 8) >> 6) + 1) * 16 - 1] = asciiBitLength;

    for (let j = 0; j < w.length; j += 16) {
      const c = hash.slice(0);
      const localW = w.slice(j, j + 16);
      const ww = [];
      for (let i = 0; i < 64; i++) {
        ww[i] = i < 16 ? (localW[i] || 0) :
          (rotr(ww[i - 15], 7) ^ rotr(ww[i - 15], 18) ^ (ww[i - 15] >>> 3)) +
          (rotr(ww[i - 2], 17) ^ rotr(ww[i - 2], 19) ^ (ww[i - 2] >>> 10)) +
          ww[i - 16] + ww[i - 7];
        ww[i] = ww[i] | 0;
      }
      let [a, b, cc, d, e, f, g, hh] = c;
      for (let i = 0; i < 64; i++) {
        const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
        const ch = (e & f) ^ (~e & g);
        const t1 = (hh + S1 + ch + K[i] + ww[i]) | 0;
        const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
        const maj = (a & b) ^ (a & cc) ^ (b & cc);
        const t2 = (S0 + maj) | 0;
        hh = g; g = f; f = e; e = (d + t1) | 0;
        d = cc; cc = b; b = a; a = (t1 + t2) | 0;
      }
      hash = [hash[0] + a | 0, hash[1] + b | 0, hash[2] + cc | 0, hash[3] + d | 0,
              hash[4] + e | 0, hash[5] + f | 0, hash[6] + g | 0, hash[7] + hh | 0];
    }
    for (let i = 0; i < 8; i++) {
      result += ('00000000' + ((hash[i] >>> 0).toString(16))).slice(-8);
    }
    void bitsLen; void maxWord;
    return result;
  }

  /* ---------- Cryptographically random salt / tokens ---------- */
  function randomHex(len = 32) {
    const bytes = new Uint8Array(len);
    if (window.crypto && window.crypto.getRandomValues) {
      window.crypto.getRandomValues(bytes);
    } else {
      for (let i = 0; i < len; i++) bytes[i] = Math.floor(Math.random() * 256);
    }
    return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /* ---------- Key-stretched password hashing (PBKDF-like) ---------- */
  const PBKDF_ROUNDS = 5000; // key stretching: brute-forcing becomes ~5000x slower

  function pbkdf(password, salt, rounds = PBKDF_ROUNDS) {
    let h = sha256('tt.v1$' + salt + '$' + password);
    for (let i = 0; i < rounds; i++) {
      h = sha256(h + salt + i);
    }
    return h;
  }

  function hashPassword(password, salt) {
    salt = salt || randomHex(16);
    return { salt, hash: pbkdf(password, salt) };
  }

  function verifyPassword(password, salt, expectedHash) {
    if (!salt || !expectedHash) return false;
    // constant-ish time compare to avoid early-return timing leaks
    const actual = pbkdf(password, salt);
    if (actual.length !== expectedHash.length) return false;
    let diff = 0;
    for (let i = 0; i < actual.length; i++) diff |= actual.charCodeAt(i) ^ expectedHash.charCodeAt(i);
    return diff === 0;
  }

  /* ---------- Session tokens (expiry + integrity) ---------- */
  const SESSION_TTL_MS = 30 * 60 * 1000; // 30 minute hard expiry
  const SESSION_SIGNING_KEY = 'tt_session_secret_v1';

  function getSigningKey() {
    let key = localStorage.getItem(SESSION_SIGNING_KEY);
    if (!key) {
      key = randomHex(32);
      localStorage.setItem(SESSION_SIGNING_KEY, key);
    }
    return key;
  }

  function sign(payload) {
    return pbkdf(payload, getSigningKey(), 200);
  }

  function createSessionToken(user) {
    const payload = JSON.stringify({
      uid: user.id,
      role: user.role,
      exp: Date.now() + SESSION_TTL_MS
    });
    return { payload, sig: sign(payload) };
  }

  function verifySessionToken(token) {
    if (!token || !token.payload || !token.sig) return null;
    let payload;
    try { payload = JSON.parse(token.payload); } catch (e) { return null; }
    if (sign(token.payload) !== token.sig) return null;      // tampered
    if (Date.now() > payload.exp) return null;               // expired
    return payload;
  }

  function refreshSessionToken(token) {
    // sliding expiry: renew while user is active
    let payload;
    try { payload = JSON.parse(token.payload); } catch (e) { return null; }
    payload.exp = Date.now() + SESSION_TTL_MS;
    const newPayload = JSON.stringify(payload);
    return { payload: newPayload, sig: sign(newPayload) };
  }

  /* ---------- Session-fingerprint binding (anti session-theft) ---------- */
  function deviceFingerprint() {
    const parts = [
      navigator.userAgent,
      navigator.language,
      (screen.width || 0) + 'x' + (screen.height || 0),
      new Date().getTimezoneOffset()
    ];
    return sha256(parts.join('|')).slice(0, 32);
  }

  return {
    randomHex,
    hashPassword,
    verifyPassword,
    createSessionToken,
    verifySessionToken,
    refreshSessionToken,
    deviceFingerprint,
    SESSION_TTL_MS,
    PBKDF_ROUNDS,
    // exposed for integrity checks on stored data
    _sha256: sha256
  };
})();
